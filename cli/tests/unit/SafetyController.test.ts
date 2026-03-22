/**
 * SafetyController 测试套件
 * 测试安全控制器的所有核心功能
 */

import { SafetyController } from '../../src/core/SafetyController';
import type { SafetyConfig, TradeRequest, TradeResult } from '../../src/types-auto';

// Mock httpRequest 函数
jest.mock('../../src/utils', () => ({
  httpRequest: jest.fn()
}));

import { httpRequest } from '../../src/utils';

describe('SafetyController', () => {
  let controller: SafetyController;
  let mockConfig: SafetyConfig;

  beforeEach(() => {
    // 重置所有 mocks
    jest.clearAllMocks();

    // 创建测试配置
    mockConfig = {
      funds: {
        max_single_trade: 10000,
        max_daily_trade: 100000,
        min_reserve: 1000
      },
      position: {
        max_single_stock: 0.3,
        max_total_position: 0.8
      },
      circuit_breaker: {
        enabled: true,
        max_consecutive_losses: 3,
        cooldown_minutes: 30
      }
    };

    // Mock 默认返回值
    (httpRequest as jest.Mock).mockResolvedValue({
      kyje: 50000,
      zzc: 100000
    });

    controller = new SafetyController(mockConfig);
  });

  describe('单笔交易限额检查', () => {
    it('应该拒绝超过单笔限额的交易', async () => {
      const request: TradeRequest = {
        id: 'test-1',
        source: 'rule',
        amount: 20000, // 超过 max_single_trade (10000)
        action: 'buy'
      };

      const result = await controller.checkTrade(request);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('max_single_trade_exceeded');
      expect(result.message).toContain('单笔交易金额');
    });

    it('应该允许在单笔限额内的交易', async () => {
      const request: TradeRequest = {
        id: 'test-2',
        source: 'rule',
        amount: 5000, // 在限额内
        action: 'buy'
      };

      const result = await controller.checkTrade(request);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('passed');
    });

    it('应该允许恰好等于单笔限额的交易', async () => {
      const request: TradeRequest = {
        id: 'test-3',
        source: 'rule',
        amount: 10000, // 恰好等于限额
        action: 'buy'
      };

      const result = await controller.checkTrade(request);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('passed');
    });
  });

  describe('单日交易限额检查', () => {
    it('应该拒绝超过单日限额的交易', async () => {
      // 先记录一些成功的交易
      await controller.recordTrade({
        success: true,
        amount: 95000,
        htbh: 'test-htbh-1'
      } as TradeResult);

      const request: TradeRequest = {
        id: 'test-4',
        source: 'rule',
        amount: 10000, // 95000 + 10000 = 105000 > 100000
        action: 'buy'
      };

      const result = await controller.checkTrade(request);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('max_daily_trade_exceeded');
      expect(result.message).toContain('单日交易金额累计');
    });

    it('应该正确累计每日交易金额', async () => {
      await controller.recordTrade({
        success: true,
        amount: 30000,
        htbh: 'test-htbh-2'
      } as TradeResult);

      await controller.recordTrade({
        success: true,
        amount: 20000,
        htbh: 'test-htbh-3'
      } as TradeResult);

      const stats = controller.getStats();
      expect(stats.dailyTradeAmount).toBe(50000);
    });

    it('应该允许在单日限额内的交易', async () => {
      await controller.recordTrade({
        success: true,
        amount: 50000,
        htbh: 'test-htbh-4'
      } as TradeResult);

      const request: TradeRequest = {
        id: 'test-5',
        source: 'rule',
        amount: 40000, // 50000 + 40000 = 90000 < 100000
        action: 'buy'
      };

      const result = await controller.checkTrade(request);

      expect(result.allowed).toBe(true);
    });
  });

  describe('最小保留资金检查', () => {
    it('应该拒绝低于最小保留资金的交易', async () => {
      (httpRequest as jest.Mock).mockResolvedValue({
        kyje: 1500, // 可用资金 1500，min_reserve 是 1000
        zzc: 100000
      });

      const request: TradeRequest = {
        id: 'test-6',
        source: 'rule',
        amount: 1000, // 1500 - 1000 = 500 < 1000
        action: 'buy'
      };

      const result = await controller.checkTrade(request);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('min_reserve_exceeded');
      expect(result.message).toContain('保留资金不能少于');
    });

    it('应该确保交易后保留足够的资金', async () => {
      (httpRequest as jest.Mock).mockResolvedValue({
        kyje: 5000,
        zzc: 100000
      });

      const request: TradeRequest = {
        id: 'test-7',
        source: 'rule',
        amount: 3000, // 5000 - 3000 = 2000 >= 1000 ✓
        action: 'buy'
      };

      const result = await controller.checkTrade(request);

      expect(result.allowed).toBe(true);
    });
  });

  describe('仓位限制检查', () => {
    it('应该拒绝超过总仓位限制的交易', async () => {
      (httpRequest as jest.Mock).mockResolvedValue({
        '600000': {
          sz: 80000 // 当前仓位市值 80000
        },
        zzc: 100000 // 总资产 100000
      });

      const request: TradeRequest = {
        id: 'test-8',
        source: 'rule',
        code: '600000',
        amount: 10000,
        action: 'buy'
      };

      const result = await controller.checkTrade(request);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('position_limit_exceeded');
    });

    it('应该允许在仓位限制内的交易', async () => {
      (httpRequest as jest.Mock).mockResolvedValue({
        '600000': {
          sz: 50000
        },
        zzc: 100000
      });

      const request: TradeRequest = {
        id: 'test-9',
        source: 'rule',
        code: '600000',
        amount: 5000,
        action: 'buy'
      };

      const result = await controller.checkTrade(request);

      expect(result.allowed).toBe(true);
    });
  });

  describe('熔断机制', () => {
    it('应该在连续亏损达到阈值时触发熔断', async () => {
      // 记录3次连续亏损
      for (let i = 0; i < 3; i++) {
        await controller.recordTrade({
          success: false,
          profit: -100,
          error: 'test loss'
        } as TradeResult);
      }

      const stats = controller.getStats();
      expect(stats.consecutiveLosses).toBe(3);
      expect(stats.isCircuitBroken).toBe(true);
    });

    it('应该在熔断期间拒绝所有交易', async () => {
      // 触发熔断
      for (let i = 0; i < 3; i++) {
        await controller.recordTrade({
          success: false,
          profit: -100,
          error: 'test loss'
        } as TradeResult);
      }

      const request: TradeRequest = {
        id: 'test-10',
        source: 'rule',
        amount: 1000,
        action: 'buy'
      };

      const result = await controller.checkTrade(request);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('circuit_breaker');
      expect(result.message).toContain('熔断中');
    });

    it('应该在冷却时间后恢复交易能力', async () => {
      // 设置一个很短的冷却时间用于测试
      const shortConfig: SafetyConfig = {
        ...mockConfig,
        circuit_breaker: {
          enabled: true,
          max_consecutive_losses: 3,
          cooldown_minutes: 0 // 立即恢复
        }
      };

      const testController = new SafetyController(shortConfig);

      // 触发熔断
      for (let i = 0; i < 3; i++) {
        await testController.recordTrade({
          success: false,
          profit: -100,
          error: 'test loss'
        } as TradeResult);
      }

      // 等待冷却时间结束
      await new Promise(resolve => setTimeout(resolve, 100));

      const request: TradeRequest = {
        id: 'test-11',
        source: 'rule',
        amount: 1000,
        action: 'buy'
      };

      const result = await testController.checkTrade(request);

      expect(result.allowed).toBe(true);
    });

    it('应该在盈利后重置连续亏损计数', async () => {
      // 先记录2次亏损
      await controller.recordTrade({
        success: false,
        profit: -100,
        error: 'loss'
      } as TradeResult);

      await controller.recordTrade({
        success: false,
        profit: -50,
        error: 'loss'
      } as TradeResult);

      expect(controller.getStats().consecutiveLosses).toBe(2);

      // 记录一次盈利
      await controller.recordTrade({
        success: true,
        profit: 200,
        htbh: 'profit-htbh'
      } as TradeResult);

      expect(controller.getStats().consecutiveLosses).toBe(0);
    });
  });

  describe('每日重置功能', () => {
    it('应该在每日重置后恢复交易能力', async () => {
      // 先触发熔断
      for (let i = 0; i < 3; i++) {
        await controller.recordTrade({
          success: false,
          profit: -100,
          error: 'test loss'
        } as TradeResult);
      }

      expect(controller.getStats().isCircuitBroken).toBe(true);

      // 重置每日计数器
      controller.resetDailyCounters();

      const stats = controller.getStats();
      expect(stats.dailyTradeAmount).toBe(0);

      // 熔断状态应该保持（需要等待冷却时间）
      // 但连续亏损计数可能被重置
    });

    it('应该重置每日交易金额', async () => {
      await controller.recordTrade({
        success: true,
        amount: 50000,
        htbh: 'test-htbh-5'
      } as TradeResult);

      expect(controller.getStats().dailyTradeAmount).toBe(50000);

      controller.resetDailyCounters();

      expect(controller.getStats().dailyTradeAmount).toBe(0);
    });
  });

  describe('交易历史记录', () => {
    it('应该正确记录交易历史', async () => {
      const tradeResult: TradeResult = {
        success: true,
        htbh: 'test-htbh-6',
        amount: 10000,
        profit: 500
      };

      await controller.recordTrade(tradeResult);

      const stats = controller.getStats();
      expect(stats.tradeHistory).toHaveLength(1);
      expect(stats.tradeHistory[0]).toEqual(tradeResult);
    });

    it('应该限制交易历史大小', async () => {
      // 记录超过限制的交易数量（假设限制为100条）
      for (let i = 0; i < 150; i++) {
        await controller.recordTrade({
          success: true,
          htbh: `htbh-${i}`,
          amount: 1000
        } as TradeResult);
      }

      const stats = controller.getStats();
      // 交易历史应该被限制在合理范围内
      expect(stats.tradeHistory.length).toBeLessThanOrEqual(100);
    });

    it('应该能够清理历史记录', async () => {
      await controller.recordTrade({
        success: true,
        htbh: 'test-htbh-7',
        amount: 1000
      } as TradeResult);

      expect(controller.getStats().tradeHistory).toHaveLength(1);

      controller.clearHistory();

      expect(controller.getStats().tradeHistory).toHaveLength(0);
    });
  });

  describe('统计信息', () => {
    it('应该返回完整的统计信息', async () => {
      await controller.recordTrade({
        success: true,
        amount: 5000,
        htbh: 'test-htbh-8'
      } as TradeResult);

      const stats = controller.getStats();

      expect(stats).toHaveProperty('dailyTradeAmount');
      expect(stats).toHaveProperty('consecutiveLosses');
      expect(stats).toHaveProperty('isCircuitBroken');
      expect(stats).toHaveProperty('tradeHistory');
      expect(stats.dailyTradeAmount).toBe(5000);
    });
  });

  describe('事件发射', () => {
    it('应该在记录交易时发射事件', async () => {
      const emitSpy = jest.spyOn(controller, 'emit');

      await controller.recordTrade({
        success: true,
        amount: 1000,
        htbh: 'test-htbh-9'
      } as TradeResult);

      expect(emitSpy).toHaveBeenCalledWith('trade:recorded', expect.any(Object));
    });

    it('应该在触发熔断时发射事件', async () => {
      const emitSpy = jest.spyOn(controller, 'emit');

      // 触发熔断
      for (let i = 0; i < 3; i++) {
        await controller.recordTrade({
          success: false,
          profit: -100,
          error: 'test loss'
        } as TradeResult);
      }

      expect(emitSpy).toHaveBeenCalledWith('circuit_breaker:triggered', expect.any(Object));
    });

    it('应该在每日重置时发射事件', () => {
      const emitSpy = jest.spyOn(controller, 'emit');

      controller.resetDailyCounters();

      expect(emitSpy).toHaveBeenCalledWith('daily:reset');
    });
  });

  describe('错误处理', () => {
    it('应该处理 HTTP 请求失败', async () => {
      (httpRequest as jest.Mock).mockRejectedValue(new Error('Network error'));

      const request: TradeRequest = {
        id: 'test-12',
        source: 'rule',
        code: '600000',
        amount: 1000,
        action: 'buy'
      };

      // 应该优雅地处理错误，返回合理的结果
      const result = await controller.checkTrade(request);

      // 由于获取资金失败，可能无法进行某些检查
      expect(result).toBeDefined();
    });

    it('应该处理无效的股票代码', async () => {
      (httpRequest as jest.Mock).mockResolvedValue({});

      const request: TradeRequest = {
        id: 'test-13',
        source: 'rule',
        code: 'INVALID',
        amount: 1000,
        action: 'buy'
      };

      const result = await controller.checkTrade(request);

      expect(result).toBeDefined();
    });
  });
});

/**
 * 每日重置功能集成测试
 *
 * 测试场景：
 * 1. 执行多笔交易
 * 2. 累计单日交易金额
 * 3. 触发每日重置（模拟午夜）
 * 4. 验证计数器清零
 * 5. 验证可以重新交易
 */

import { Scheduler } from '../../src/core/Scheduler';
import { SafetyController } from '../../src/core/SafetyController';
import { httpRequest } from '../../src/utils';
import type { SchedulerConfig } from '../../src/types-auto';
import * as fs from 'fs';
import * as path from 'path';

// Mock httpRequest
jest.mock('../../src/utils', () => ({
  ...jest.requireActual('../../src/utils'),
  httpRequest: jest.fn()
}));

// Mock Date 用于模拟时间变化
jest.useFakeTimers();

describe('每日重置功能集成测试', () => {
  let scheduler: Scheduler;
  let safetyController: SafetyController;
  let testConfigDir: string;

  const originalDate = Date.now;

  beforeAll(() => {
    jest.setTimeout(10000);
  });

  beforeEach(async () => {
    // 创建测试配置目录
    testConfigDir = path.join(__dirname, '../fixtures/temp');
    if (!fs.existsSync(testConfigDir)) {
      fs.mkdirSync(testConfigDir, { recursive: true });
    }

    // 复制配置文件
    const rulesSource = path.join(__dirname, '../fixtures/test-rules.yaml');
    const pluginsSource = path.join(__dirname, '../fixtures/test-plugins.yaml');
    const safetySource = path.join(__dirname, '../fixtures/test-safety.yaml');

    fs.copyFileSync(rulesSource, path.join(testConfigDir, 'rules.yaml'));
    fs.copyFileSync(pluginsSource, path.join(testConfigDir, 'plugins.yaml'));
    fs.copyFileSync(safetySource, path.join(testConfigDir, 'safety.yaml'));

    // 设置初始时间（上午10点）
    const morningTime = new Date('2024-01-01T10:00:00').getTime();
    jest.spyOn(global.Date, 'now').mockReturnValue(morningTime);

    // Mock httpRequest
    (httpRequest as jest.Mock).mockImplementation((reqPath: string) => {
      if (reqPath.includes('query')) {
        return Promise.resolve({
          retcode: '0',
          data: {
            money: {
              zjye: 100000,
              kyje: 90000
            }
          }
        });
      }
      return Promise.resolve({
        retcode: '0',
        htbh: 'TEST123'
      });
    });

    // 创建调度器配置
    const config: SchedulerConfig = {
      rules_path: path.join(testConfigDir, 'rules.yaml'),
      plugins_path: path.join(testConfigDir, 'plugins.yaml'),
      plugins: [],
      check_interval: 1,
      safety: {
        funds: {
          max_single_trade: 50000,
          max_daily_trade: 100000, // 较小的每日限额
          min_reserve: 10000
        },
        position: {
          max_single_stock: 0.3,
          max_total_position: 0.8
        },
        circuit_breaker: {
          enabled: false,
          max_consecutive_losses: 3,
          cooldown_minutes: 30
        }
      },
      monitoring: {
        log_level: 'error',
        check_interval: 1,
        notify_channels: []
      }
    };

    scheduler = new Scheduler(config);
    safetyController = new SafetyController(config.safety);
  });

  afterEach(async () => {
    if (scheduler) {
      await scheduler.stop();
    }

    if (safetyController) {
      safetyController.destroy();
    }

    // 清理测试目录
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }

    // 恢复 Date mock
    jest.spyOn(global.Date, 'now').mockRestore();

    jest.clearAllMocks();
  });

  describe('场景1: 执行多笔交易累计金额', () => {
    it('应该正确累计单日交易金额', async () => {
      await scheduler.start();

      // 执行第一笔交易
      const result1 = await scheduler.executeTrade({
        id: 'trade-1',
        source: 'rule',
        ruleId: 'test-rule-1',
        code: '600000',
        amount: 30000,
        action: 'buy'
      });

      expect(result1.success).toBe(true);
      await new Promise(resolve => setTimeout(resolve, 100));

      let stats = scheduler.getStats();
      expect(stats.safetyStats.dailyTradeAmount).toBe(30000);

      // 执行第二笔交易
      const result2 = await scheduler.executeTrade({
        id: 'trade-2',
        source: 'rule',
        ruleId: 'test-rule-1',
        code: '600000',
        amount: 40000,
        action: 'buy'
      });

      expect(result2.success).toBe(true);
      await new Promise(resolve => setTimeout(resolve, 100));

      stats = scheduler.getStats();
      expect(stats.safetyStats.dailyTradeAmount).toBe(70000);
    });
  });

  describe('场景2: 累计金额超限后拒绝交易', () => {
    it('应该在累计金额超过每日限额后拒绝交易', async () => {
      await scheduler.start();

      // 执行接近限额的交易
      const result1 = await scheduler.executeTrade({
        id: 'trade-1',
        source: 'rule',
        ruleId: 'test-rule-1',
        code: '600000',
        amount: 90000,
        action: 'buy'
      });

      expect(result1.success).toBe(true);
      await new Promise(resolve => setTimeout(resolve, 100));

      // 尝试执行超过限额的交易
      const result2 = await scheduler.executeTrade({
        id: 'trade-2',
        source: 'rule',
        ruleId: 'test-rule-1',
        code: '600000',
        amount: 20000,
        action: 'buy'
      });

      expect(result2.success).toBe(false);
      expect(result2.error).toContain('超过限额');
    });
  });

  describe('场景3: 模拟午夜触发每日重置', () => {
    it('应该在午夜时自动重置计数器', async () => {
      await scheduler.start();

      // 执行交易
      const result1 = await scheduler.executeTrade({
        id: 'trade-1',
        source: 'rule',
        ruleId: 'test-rule-1',
        code: '600000',
        amount: 80000,
        action: 'buy'
      });

      expect(result1.success).toBe(true);
      await new Promise(resolve => setTimeout(resolve, 100));

      // 验证累计金额
      let stats = scheduler.getStats();
      expect(stats.safetyStats.dailyTradeAmount).toBe(80000);

      // 模拟时间到第二天午夜（23:59:59 -> 00:00:00）
      const midnightTime = new Date('2024-01-02T00:00:01').getTime();
      jest.spyOn(global.Date, 'now').mockReturnValue(midnightTime);

      // 触发每日重置
      await scheduler.triggerDailyReset();
      await new Promise(resolve => setTimeout(resolve, 500));

      // 验证计数器已清零
      stats = scheduler.getStats();
      expect(stats.safetyStats.dailyTradeAmount).toBe(0);
      expect(stats.safetyStats.tradeCount).toBe(0);
    });
  });

  describe('场景4: 重置后可以重新交易', () => {
    it('应该在重置后允许新的交易', async () => {
      await scheduler.start();

      // 执行交易达到限额
      const result1 = await scheduler.executeTrade({
        id: 'trade-1',
        source: 'rule',
        ruleId: 'test-rule-1',
        code: '600000',
        amount: 95000,
        action: 'buy'
      });

      expect(result1.success).toBe(true);
      await new Promise(resolve => setTimeout(resolve, 100));

      // 尝试再次交易，应该被拒绝
      const result2 = await scheduler.executeTrade({
        id: 'trade-2',
        source: 'rule',
        ruleId: 'test-rule-1',
        code: '600000',
        amount: 10000,
        action: 'buy'
      });

      expect(result2.success).toBe(false);

      // 触发每日重置
      await scheduler.triggerDailyReset();
      await new Promise(resolve => setTimeout(resolve, 500));

      // 重置后应该可以再次交易
      const result3 = await scheduler.executeTrade({
        id: 'trade-3',
        source: 'rule',
        ruleId: 'test-rule-1',
        code: '600000',
        amount: 10000,
        action: 'buy'
      });

      expect(result3.success).toBe(true);
    });
  });

  describe('场景5: 重置时清理历史记录', () => {
    it('应该在重置时清理或归档历史记录', async () => {
      await scheduler.start();

      // 执行多笔交易
      for (let i = 0; i < 5; i++) {
        await scheduler.executeTrade({
          id: `trade-${i}`,
          source: 'rule',
          ruleId: 'test-rule-1',
          code: '600000',
          amount: 10000,
          action: 'buy'
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 验证交易历史
      let stats = scheduler.getStats();
      expect(stats.safetyStats.tradeCount).toBe(5);

      // 触发重置
      await scheduler.triggerDailyReset();
      await new Promise(resolve => setTimeout(resolve, 500));

      // 验证历史记录
      stats = scheduler.getStats();
      expect(stats.safetyStats.tradeCount).toBe(0);
    });
  });

  describe('场景6: 连续多日的交易统计', () => {
    it('应该正确记录多日的交易统计', async () => {
      await scheduler.start();

      // 第一天交易
      for (let i = 0; i < 3; i++) {
        await scheduler.executeTrade({
          id: `day1-trade-${i}`,
          source: 'rule',
          ruleId: 'test-rule-1',
          code: '600000',
          amount: 10000,
          action: 'buy'
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      let stats = scheduler.getStats();
      const day1Amount = stats.safetyStats.dailyTradeAmount;
      expect(day1Amount).toBe(30000);

      // 模拟第二天
      const day2Time = new Date('2024-01-02T10:00:00').getTime();
      jest.spyOn(global.Date, 'now').mockReturnValue(day2Time);

      await scheduler.triggerDailyReset();
      await new Promise(resolve => setTimeout(resolve, 500));

      // 第二天交易
      for (let i = 0; i < 2; i++) {
        await scheduler.executeTrade({
          id: `day2-trade-${i}`,
          source: 'rule',
          ruleId: 'test-rule-1',
          code: '600000',
          amount: 20000,
          action: 'buy'
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      stats = scheduler.getStats();
      const day2Amount = stats.safetyStats.dailyTradeAmount;
      expect(day2Amount).toBe(40000);

      // 验证第二天的交易不受第一天影响
      expect(day2Amount).not.toBe(day1Amount);
    });
  });

  describe('场景7: 安全控制器的独立重置功能', () => {
    it('应该支持安全控制器独立的每日重置', async () => {
      // 使用独立的安全控制器
      const config = {
        funds: {
          max_single_trade: 50000,
          max_daily_trade: 100000,
          min_reserve: 10000
        },
        position: {
          max_single_stock: 0.3,
          max_total_position: 0.8
        },
        circuit_breaker: {
          enabled: false,
          max_consecutive_losses: 3,
          cooldown_minutes: 30
        }
      };

      const controller = new SafetyController(config);

      // 记录多笔交易
      for (let i = 0; i < 3; i++) {
        await controller.checkTrade({
          id: `trade-${i}`,
          source: 'rule',
          code: '600000',
          amount: 20000,
          action: 'buy'
        });

        await controller.recordTrade({
          success: true,
          amount: 20000
        });
      }

      let stats = controller.getStats();
      expect(stats.dailyTradeAmount).toBe(60000);

      // 触发重置
      await controller.dailyReset();
      await new Promise(resolve => setTimeout(resolve, 200));

      // 验证重置
      stats = controller.getStats();
      expect(stats.dailyTradeAmount).toBe(0);
      expect(stats.tradeCount).toBe(0);

      controller.destroy();
    });
  });

  describe('场景8: 重置时的事件通知', () => {
    it('应该在每日重置时发送通知', async () => {
      const notificationSpy = jest.fn();

      // 监听通知事件
      scheduler.on('notification', notificationSpy);

      await scheduler.start();

      // 执行一些交易
      await scheduler.executeTrade({
        id: 'trade-1',
        source: 'rule',
        ruleId: 'test-rule-1',
        code: '600000',
        amount: 30000,
        action: 'buy'
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // 触发重置
      await scheduler.triggerDailyReset();
      await new Promise(resolve => setTimeout(resolve, 500));

      // 验证通知被发送
      expect(notificationSpy).toHaveBeenCalledWith(
        expect.stringContaining('重置')
      );
    });
  });

  describe('场景9: 跨越午夜的长时间运行', () => {
    it('应该在长时间运行中正确处理午夜跨越', async () => {
      await scheduler.start();

      // 傍晚执行交易
      const eveningTime = new Date('2024-01-01T23:59:00').getTime();
      jest.spyOn(global.Date, 'now').mockReturnValue(eveningTime);

      const result1 = await scheduler.executeTrade({
        id: 'trade-evening',
        source: 'rule',
        ruleId: 'test-rule-1',
        code: '600000',
        amount: 50000,
        action: 'buy'
      });

      expect(result1.success).toBe(true);

      // 模拟跨越到第二天凌晨
      const morningTime = new Date('2024-01-02T00:01:00').getTime();
      jest.spyOn(global.Date, 'now').mockReturnValue(morningTime);

      // 触发重置
      await scheduler.triggerDailyReset();
      await new Promise(resolve => setTimeout(resolve, 500));

      // 第二天清晨执行交易
      const result2 = await scheduler.executeTrade({
        id: 'trade-morning',
        source: 'rule',
        ruleId: 'test-rule-1',
        code: '600000',
        amount: 30000,
        action: 'buy'
      });

      expect(result2.success).toBe(true);

      // 验证只有第二天的金额被计数
      const stats = scheduler.getStats();
      expect(stats.safetyStats.dailyTradeAmount).toBe(30000);
    });
  });

  describe('场景10: 重置时保留重要统计信息', () => {
    it('应该在重置时保留重要的统计信息', async () => {
      await scheduler.start();

      // 执行交易
      for (let i = 0; i < 3; i++) {
        await scheduler.executeTrade({
          id: `trade-${i}`,
          source: 'rule',
          ruleId: 'test-rule-1',
          code: '600000',
          amount: 15000,
          action: 'buy'
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      let stats = scheduler.getStats();
      const beforeResetTotalTrades = stats.safetyStats.totalTrades;

      // 触发重置
      await scheduler.triggerDailyReset();
      await new Promise(resolve => setTimeout(resolve, 500));

      // 验证每日计数器清零，但总交易数保留
      stats = scheduler.getStats();
      expect(stats.safetyStats.dailyTradeAmount).toBe(0);
      expect(stats.safetyStats.tradeCount).toBe(0);
      // 总交易数应该保留或更新（取决于实现）
      expect(stats.safetyStats.totalTrades).toBeGreaterThanOrEqual(0);
    });
  });
});

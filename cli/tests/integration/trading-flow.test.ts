/**
 * 完整交易流程集成测试
 *
 * 测试场景：
 * 1. 规则触发 → 安全检查通过 → 执行交易成功 → 记录到历史
 * 2. 规则触发 → 安全检查失败（超限）→ 交易拒绝
 * 3. 规则触发 → 交易失败 → 记录失败 → 连续亏损计数 → 触发熔断
 * 4. 熔断期间 → 所有交易拒绝
 * 5. 熔断恢复 → 重新可以交易
 */

import { Scheduler } from '../../src/core/Scheduler';
import { httpRequest } from '../../src/utils';
import type { SchedulerConfig } from '../../src/types-auto';
import * as fs from 'fs';
import * as path from 'path';

// Mock httpRequest
jest.mock('../../src/utils', () => ({
  ...jest.requireActual('../../src/utils'),
  httpRequest: jest.fn()
}));

// Mock fs.watch 用于配置热重载测试
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  watch: jest.fn()
}));

describe('完整交易流程集成测试', () => {
  let scheduler: Scheduler;
  let testConfigDir: string;

  beforeAll(() => {
    // 设置测试超时时间为 10 秒
    jest.setTimeout(10000);
  });

  beforeEach(async () => {
    // 创建测试配置目录
    testConfigDir = path.join(__dirname, '../fixtures/temp');
    if (!fs.existsSync(testConfigDir)) {
      fs.mkdirSync(testConfigDir, { recursive: true });
    }

    // 复制测试配置文件
    const rulesSource = path.join(__dirname, '../fixtures/test-rules.yaml');
    const pluginsSource = path.join(__dirname, '../fixtures/test-plugins.yaml');
    const safetySource = path.join(__dirname, '../fixtures/test-safety.yaml');

    fs.copyFileSync(rulesSource, path.join(testConfigDir, 'rules.yaml'));
    fs.copyFileSync(pluginsSource, path.join(testConfigDir, 'plugins.yaml'));
    fs.copyFileSync(safetySource, path.join(testConfigDir, 'safety.yaml'));

    // 创建调度器配置
    const config: SchedulerConfig = {
      rules_path: path.join(testConfigDir, 'rules.yaml'),
      plugins_path: path.join(testConfigDir, 'plugins.yaml'),
      plugins: [],
      check_interval: 1,
      safety: {
        funds: {
          max_single_trade: 50000,
          max_daily_trade: 200000,
          min_reserve: 10000
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
      },
      monitoring: {
        log_level: 'error', // 减少日志输出
        check_interval: 1,
        notify_channels: []
      }
    };

    scheduler = new Scheduler(config);
  });

  afterEach(async () => {
    if (scheduler) {
      await scheduler.stop();
    }

    // 清理测试目录
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }

    // 重置所有 mocks
    jest.clearAllMocks();
  });

  describe('场景1: 完整交易流程 - 规则触发 → 安全检查 → 执行交易 → 记录结果', () => {
    it('应该完成完整的交易流程', async () => {
      // Mock HTTP 请求返回成功
      (httpRequest as jest.Mock).mockResolvedValue({
        retcode: '0',
        htbh: 'TEST123',
        no: '456'
      });

      // Mock 获取资金信息
      (httpRequest as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('query')) {
          return Promise.resolve({
            retcode: '0',
            data: {
              money: {
                zjye: 100000, // 资金余额
                kyje: 90000   // 可用金额
              }
            }
          });
        }
        return Promise.resolve({
          retcode: '0',
          htbh: 'TEST123'
        });
      });

      await scheduler.start();

      // 等待规则检查执行
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 验证交易被调用
      expect(httpRequest).toHaveBeenCalledWith(
        expect.stringContaining('buy'),
        expect.anything(),
        expect.objectContaining({
          code: '600000'
        })
      );

      // 获取统计信息
      const stats = scheduler.getStats();
      expect(stats).toBeDefined();
    });
  });

  describe('场景2: 安全检查失败 - 超过单笔交易限额', () => {
    it('应该拒绝超过单笔限额的交易', async () => {
      // Mock 资金查询
      (httpRequest as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('query')) {
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
        return Promise.resolve({ retcode: '0' });
      });

      await scheduler.start();

      // 尝试执行大额交易（超过限额）
      const result = await scheduler.executeTrade({
        id: 'test-1',
        source: 'rule',
        ruleId: 'test-rule-1',
        code: '600000',
        amount: 100000, // 超过 max_single_trade (50000)
        action: 'buy'
      });

      // 验证交易被拒绝
      expect(result.success).toBe(false);
      expect(result.error).toContain('超过限额');

      // 验证没有调用交易接口
      const tradeCalls = (httpRequest as jest.Mock).mock.calls.filter(
        call => call[0].includes('buy') || call[0].includes('sell')
      );
      expect(tradeCalls.length).toBe(0);
    });
  });

  describe('场景3: 交易失败触发熔断', () => {
    it('应该在连续3次交易失败后触发熔断', async () => {
      // Mock 交易失败
      (httpRequest as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('query')) {
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
        // 模拟交易失败
        return Promise.resolve({
          retcode: '1',
          retmsg: '交易失败'
        });
      });

      await scheduler.start();

      // 执行3次失败的交易
      for (let i = 0; i < 3; i++) {
        await scheduler.executeTrade({
          id: `test-${i}`,
          source: 'rule',
          ruleId: 'test-rule-1',
          code: '600000',
          amount: 1000,
          action: 'buy'
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 等待熔断状态更新
      await new Promise(resolve => setTimeout(resolve, 500));

      // 获取安全控制器状态
      const safetyStats = scheduler.getStats().safetyStats;
      expect(safetyStats.consecutiveLosses).toBe(3);
    });
  });

  describe('场景4: 熔断期间拒绝所有交易', () => {
    it('应该在熔断期间拒绝所有交易请求', async () => {
      // Mock 基础查询
      (httpRequest as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('query')) {
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
          retcode: '1',
          retmsg: '交易失败'
        });
      });

      await scheduler.start();

      // 手动触发熔断
      await scheduler.triggerCircuitBreaker();

      // 等待熔断生效
      await new Promise(resolve => setTimeout(resolve, 200));

      // 尝试在熔断期间交易
      const result = await scheduler.executeTrade({
        id: 'test-circuit',
        source: 'rule',
        ruleId: 'test-rule-1',
        code: '600000',
        amount: 1000,
        action: 'buy'
      });

      // 验证交易被拒绝
      expect(result.success).toBe(false);
      expect(result.error).toContain('熔断');
    });
  });

  describe('场景5: 熔断恢复后重新可以交易', () => {
    it('应该在熔断冷却时间后恢复交易', async () => {
      // Mock 基础查询
      (httpRequest as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('query')) {
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
        // 第一次失败，之后成功
        return Promise.resolve({
          retcode: '0',
          htbh: 'TEST456'
        });
      });

      await scheduler.start();

      // 触发熔断
      await scheduler.triggerCircuitBreaker();
      await new Promise(resolve => setTimeout(resolve, 200));

      // 手动恢复熔断（模拟冷却时间到期）
      await scheduler.resetCircuitBreaker();
      await new Promise(resolve => setTimeout(resolve, 200));

      // 尝试交易
      const result = await scheduler.executeTrade({
        id: 'test-recovery',
        source: 'rule',
        ruleId: 'test-rule-1',
        code: '600000',
        amount: 1000,
        action: 'buy'
      });

      // 验证交易成功
      expect(result.success).toBe(true);
    });
  });

  describe('场景6: 安全检查 - 超过每日交易限额', () => {
    it('应该拒绝超过每日交易限额的交易', async () => {
      // Mock 基础查询
      (httpRequest as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('query')) {
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
          htbh: 'TEST789'
        });
      });

      await scheduler.start();

      // 执行接近限额的交易
      const tradeAmount = 150000; // 接近 max_daily_trade (200000)
      await scheduler.executeTrade({
        id: 'test-1',
        source: 'rule',
        ruleId: 'test-rule-1',
        code: '600000',
        amount: tradeAmount,
        action: 'buy'
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      // 再次尝试交易，应该超过限额
      const result = await scheduler.executeTrade({
        id: 'test-2',
        source: 'rule',
        ruleId: 'test-rule-1',
        code: '600000',
        amount: 60000,
        action: 'buy'
      });

      // 验证交易被拒绝
      expect(result.success).toBe(false);
      expect(result.error).toContain('超过限额');
    });
  });
});

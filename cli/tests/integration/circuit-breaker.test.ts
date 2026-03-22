/**
 * 熔断机制端到端集成测试
 *
 * 测试场景：
 * 1. 连续3次交易失败
 * 2. 验证熔断触发
 * 3. 验证熔断期间交易被拒绝
 * 4. 等待冷却时间
 * 5. 验证熔断恢复
 * 6. 重置连续亏损计数
 * 7. 验证可以重新交易
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

describe('熔断机制端到端集成测试', () => {
  let scheduler: Scheduler;
  let safetyController: SafetyController;
  let testConfigDir: string;

  beforeAll(() => {
    jest.setTimeout(15000); // 增加超时时间，因为需要等待冷却
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
          max_consecutive_losses: 3, // 连续3次失败触发熔断
          cooldown_minutes: 0.5, // 30秒冷却时间（缩短测试时间）
          notify_on_trigger: true
        }
      },
      monitoring: {
        log_level: 'error',
        check_interval: 1,
        notify_channels: []
      }
    };

    scheduler = new Scheduler(config);

    // 单独创建安全控制器用于独立测试
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

    jest.clearAllMocks();
  });

  describe('场景1: 连续3次交易失败触发熔断', () => {
    it('应该在连续3次交易失败后触发熔断', async () => {
      // Mock 基础查询
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
        // 模拟交易失败
        return Promise.resolve({
          retcode: '1',
          retmsg: '交易失败'
        });
      });

      await scheduler.start();

      // 执行3次失败的交易
      for (let i = 0; i < 3; i++) {
        const result = await scheduler.executeTrade({
          id: `test-trade-${i}`,
          source: 'rule',
          ruleId: 'test-rule-1',
          code: '600000',
          amount: 1000,
          action: 'buy'
        });

        expect(result.success).toBe(false);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 等待熔断状态更新
      await new Promise(resolve => setTimeout(resolve, 500));

      // 获取统计信息
      const stats = scheduler.getStats();
      const safetyStats = stats.safetyStats;

      // 验证熔断状态
      expect(safetyStats.consecutiveLosses).toBe(3);
      expect(safetyStats.isCircuitBroken).toBe(true);
    });
  });

  describe('场景2: 熔断期间所有交易被拒绝', () => {
    it('应该在熔断期间拒绝所有交易请求', async () => {
      // Mock 基础查询
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
          retcode: '1',
          retmsg: '交易失败'
        });
      });

      await scheduler.start();

      // 触发熔断
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

      await new Promise(resolve => setTimeout(resolve, 500));

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

      // 验证没有调用交易接口
      const tradeCalls = (httpRequest as jest.Mock).mock.calls.filter(
        call => !call[0].includes('query')
      );
      expect(tradeCalls.length).toBe(3); // 只有前3次失败的调用
    });
  });

  describe('场景3: 熔断冷却后自动恢复', () => {
    it('应该在冷却时间后自动恢复交易能力', async () => {
      // Mock 基础查询
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
          retcode: '1',
          retmsg: '交易失败'
        });
      });

      await scheduler.start();

      // 触发熔断
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

      await new Promise(resolve => setTimeout(resolve, 500));

      // 验证熔断已触发
      let stats = scheduler.getStats();
      expect(stats.safetyStats.isCircuitBroken).toBe(true);

      // 等待冷却时间（30秒）
      console.log('等待熔断冷却时间...');
      await new Promise(resolve => setTimeout(resolve, 35000));

      // 再次尝试交易
      const result = await scheduler.executeTrade({
        id: 'test-after-cooldown',
        source: 'rule',
        ruleId: 'test-rule-1',
        code: '600000',
        amount: 1000,
        action: 'buy'
      });

      // 验证熔断已解除（虽然交易仍失败，但不是因为熔断）
      // 注意：由于交易仍然失败，可能重新触发熔断
      expect(result.error).not.toContain('熔断');
    });
  });

  describe('场景4: 熔断触发时发送通知', () => {
    it('应该在熔断触发时发送通知', async () => {
      const notificationSpy = jest.fn();

      // 监听通知事件
      scheduler.on('notification', notificationSpy);

      // Mock 基础查询
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
          retcode: '1',
          retmsg: '交易失败'
        });
      });

      await scheduler.start();

      // 触发熔断
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

      await new Promise(resolve => setTimeout(resolve, 500));

      // 验证通知被发送
      expect(notificationSpy).toHaveBeenCalledWith(
        expect.stringContaining('熔断')
      );
    });
  });

  describe('场景5: 手动重置熔断状态', () => {
    it('应该支持手动重置熔断状态', async () => {
      // Mock 基础查询
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
          retcode: '1',
          retmsg: '交易失败'
        });
      });

      await scheduler.start();

      // 触发熔断
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

      await new Promise(resolve => setTimeout(resolve, 500));

      // 验证熔断已触发
      let stats = scheduler.getStats();
      expect(stats.safetyStats.isCircuitBroken).toBe(true);

      // 手动重置熔断
      await scheduler.resetCircuitBreaker();
      await new Promise(resolve => setTimeout(resolve, 200));

      // 验证熔断已解除
      stats = scheduler.getStats();
      expect(stats.safetyStats.isCircuitBroken).toBe(false);
      expect(stats.safetyStats.consecutiveLosses).toBe(0);
    });
  });

  describe('场景6: 熔断后交易成功恢复正常', () => {
    it('应该在熔断后首次成功交易时恢复正常状态', async () => {
      // Mock 基础查询
      let callCount = 0;
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

        callCount++;
        // 前3次失败，之后成功
        if (callCount <= 3) {
          return Promise.resolve({
            retcode: '1',
            retmsg: '交易失败'
          });
        } else {
          return Promise.resolve({
            retcode: '0',
            htbh: 'TEST456'
          });
        }
      });

      await scheduler.start();

      // 触发熔断
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

      await new Promise(resolve => setTimeout(resolve, 500));

      // 验证熔断已触发
      let stats = scheduler.getStats();
      expect(stats.safetyStats.isCircuitBroken).toBe(true);

      // 手动重置熔断
      await scheduler.resetCircuitBreaker();
      await new Promise(resolve => setTimeout(resolve, 200));

      // 执行成功的交易
      const result = await scheduler.executeTrade({
        id: 'test-success',
        source: 'rule',
        ruleId: 'test-rule-1',
        code: '600000',
        amount: 1000,
        action: 'buy'
      });

      // 验证交易成功
      expect(result.success).toBe(true);

      // 验证连续亏损计数被重置
      stats = scheduler.getStats();
      expect(stats.safetyStats.consecutiveLosses).toBe(0);
    });
  });

  describe('场景7: 熔断配置验证', () => {
    it('应该正确应用熔断配置参数', async () => {
      const config = {
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
          max_consecutive_losses: 5, // 自定义配置
          cooldown_minutes: 1,
          notify_on_trigger: true
        }
      };

      const controller = new SafetyController(config);

      // 验证配置被正确应用
      expect(controller).toBeDefined();

      // 执行4次失败的交易（应该不触发熔断，因为阈值是5）
      for (let i = 0; i < 4; i++) {
        const result = await controller.checkTrade({
          id: `test-${i}`,
          source: 'rule',
          code: '600000',
          amount: 1000,
          action: 'buy'
        });

        expect(result.allowed).toBe(true);

        // 记录失败
        await controller.recordTrade({
          success: false,
          error: '测试失败'
        });
      }

      // 验证熔断未触发
      const stats = controller.getStats();
      expect(stats.consecutiveLosses).toBe(4);
      expect(stats.isCircuitBroken).toBe(false);

      controller.destroy();
    });
  });

  describe('场景8: 禁用熔断机制', () => {
    it('应该在禁用熔断时不触发熔断', async () => {
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
            enabled: false, // 禁用熔断
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

      const disabledScheduler = new Scheduler(config);

      // Mock 基础查询
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
          retcode: '1',
          retmsg: '交易失败'
        });
      });

      await disabledScheduler.start();

      // 执行多次失败的交易
      for (let i = 0; i < 5; i++) {
        await disabledScheduler.executeTrade({
          id: `test-${i}`,
          source: 'rule',
          ruleId: 'test-rule-1',
          code: '600000',
          amount: 1000,
          action: 'buy'
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      // 验证熔断未被触发
      const stats = disabledScheduler.getStats();
      expect(stats.safetyStats.isCircuitBroken).toBe(false);
      // 但连续亏损计数仍在增加
      expect(stats.safetyStats.consecutiveLosses).toBeGreaterThan(0);

      await disabledScheduler.stop();
    });
  });
});

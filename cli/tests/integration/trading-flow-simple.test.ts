/**
 * 完整交易流程集成测试（简化版）
 *
 * 测试场景：
 * 1. 调度器启动和停止
 * 2. 规则检查和触发
 * 3. 安全控制
 * 4. 基本的状态管理
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

describe('完整交易流程集成测试', () => {
  let scheduler: Scheduler;
  let testConfigDir: string;

  beforeAll(() => {
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

    // Mock HTTP 请求返回成功
    (httpRequest as jest.Mock).mockResolvedValue({
      retcode: '0',
      htbh: 'TEST123',
      no: '456'
    });
  });

  afterEach(async () => {
    if (scheduler) {
      try {
        await scheduler.stop();
      } catch (error) {
        // 忽略停止时的错误
      }
    }

    // 清理测试目录
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }

    // 重置所有 mocks
    jest.clearAllMocks();
  });

  describe('场景1: 调度器启动和基本运行', () => {
    it('应该成功启动调度器', async () => {
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
          log_level: 'error',
          check_interval: 1,
          notify_channels: []
        }
      };

      scheduler = new Scheduler(config);

      // 启动调度器
      await scheduler.start();

      // 验证调度器运行状态
      const status = scheduler.getStatus();
      expect(status.running).toBe(true);

      // 获取统计信息
      const stats = scheduler.getStats();
      expect(stats).toBeDefined();
      expect(stats.isRunning).toBe(true);
    });
  });

  describe('场景2: 规则检查功能', () => {
    it('应该能够触发规则检查', async () => {
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

      // Mock 行情查询
      (httpRequest as jest.Mock).mockImplementation((reqPath: string) => {
        if (reqPath.includes('quote')) {
          return Promise.resolve({
            retcode: '0',
            data: {
              quote: {
                StockCode: '600000',
                price: '8.5',
                name: '测试股票'
              }
            }
          });
        }
        return Promise.resolve({
          retcode: '0',
          htbh: 'TEST123'
        });
      });

      scheduler = new Scheduler(config);
      await scheduler.start();

      // 等待自动规则检查
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 手动触发规则检查
      await scheduler.triggerRuleCheck();

      // 获取统计信息
      const stats = scheduler.getStats();
      expect(stats).toBeDefined();
    });
  });

  describe('场景3: 插件功能测试', () => {
    it('应该能够加载和执行插件', async () => {
      const config: SchedulerConfig = {
        rules_path: path.join(testConfigDir, 'rules.yaml'),
        plugins_path: path.join(testConfigDir, 'plugins.yaml'),
        plugins: [{
          id: 'test-plugin-js',
          name: 'JavaScript测试插件',
          enabled: true,
          priority: 1,
          file: 'test-plugin.js',
          type: 'javascript',
          config: {
            threshold: 10,
            symbols: ['600000']
          }
        }],
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

      // Mock 查询
      (httpRequest as jest.Mock).mockImplementation((reqPath: string) => {
        if (reqPath.includes('query')) {
          return Promise.resolve({
            retcode: '0',
            data: {
              money: {
                zjye: 100000,
                kyje: 90000
              },
              position: {}
            }
          });
        }

        if (reqPath.includes('quote')) {
          return Promise.resolve({
            retcode: '0',
            data: {
              quote: {
                StockCode: '600000',
                price: '8.5',
                name: '测试股票'
              }
            }
          });
        }

        return Promise.resolve({
          retcode: '0',
          htbh: 'PLUGIN123'
        });
      });

      scheduler = new Scheduler(config);
      await scheduler.start();

      // 等待插件执行
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 手动触发插件检查
      await scheduler.triggerPluginCheck();

      // 获取统计信息
      const stats = scheduler.getStats();
      expect(stats.pluginStats).toBeDefined();
    });
  });

  describe('场景4: 统计信息获取', () => {
    it('应该正确返回统计信息', async () => {
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
          log_level: 'error',
          check_interval: 1,
          notify_channels: []
        }
      };

      scheduler = new Scheduler(config);
      await scheduler.start();

      const stats = scheduler.getStats();

      // 验证统计信息结构
      expect(stats).toHaveProperty('isRunning');
      expect(stats).toHaveProperty('ruleStats');
      expect(stats).toHaveProperty('safetyStats');
      expect(stats).toHaveProperty('pluginStats');

      // 验证调度器统计
      expect(stats.isRunning).toBe(true);
    });
  });

  describe('场景5: 调度器停止', () => {
    it('应该正确停止调度器', async () => {
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
      await scheduler.start();

      // 验证运行状态
      let status = scheduler.getStatus();
      expect(status.running).toBe(true);

      // 停止调度器
      await scheduler.stop();

      // 验证停止状态
      status = scheduler.getStatus();
      expect(status.running).toBe(false);
    });
  });

  describe('场景6: 事件监听', () => {
    it('应该正确发送事件', async () => {
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

      const startedSpy = jest.fn();
      const stoppedSpy = jest.fn();

      scheduler = new Scheduler(config);

      scheduler.on('scheduler:started', startedSpy);
      scheduler.on('scheduler:stopped', stoppedSpy);

      await scheduler.start();
      expect(startedSpy).toHaveBeenCalled();

      await scheduler.stop();
      expect(stoppedSpy).toHaveBeenCalled();
    });
  });
});

/**
 * 基础集成测试 - 验证核心组件
 */

import { Scheduler } from '../../src/core/Scheduler';
import { ConfigManager } from '../../src/core/ConfigManager';
import { RuleEngine } from '../../src/core/RuleEngine';
import { SafetyController } from '../../src/core/SafetyController';
import { PluginManager } from '../../src/core/PluginManager';
import type { SchedulerConfig } from '../../src/types-auto';
import * as fs from 'fs';
import * as path from 'path';

describe('基础集成测试', () => {
  let testConfigDir: string;

  beforeAll(() => {
    jest.setTimeout(10000);
  });

  beforeEach(() => {
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
  });

  afterEach(() => {
    // 清理测试目录
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
    jest.clearAllMocks();
  });

  describe('ConfigManager', () => {
    it('应该能够加载配置文件', async () => {
      const configManager = new ConfigManager({
        configDir: testConfigDir,
        watchEnabled: false
      });

      await configManager.loadAllConfigs();

      const rulesConfig = configManager.getRulesConfig();
      expect(rulesConfig).toBeDefined();
      expect(rulesConfig.rules).toBeInstanceOf(Array);
      expect(rulesConfig.rules.length).toBeGreaterThan(0);
    });
  });

  describe('RuleEngine', () => {
    it('应该能够加载规则', async () => {
      const ruleEngine = new RuleEngine();
      const configManager = new ConfigManager({
        configDir: testConfigDir,
        watchEnabled: false
      });

      await configManager.loadAllConfigs();
      const rulesConfig = configManager.getRulesConfig();

      await ruleEngine.loadRules(rulesConfig);

      const stats = ruleEngine.getStats();
      expect(stats.totalRules).toBeGreaterThan(0);
    });
  });

  describe('SafetyController', () => {
    it('应该能够进行安全检查', async () => {
      const safetyConfig = {
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
      };

      const safetyController = new SafetyController(safetyConfig);

      const result = await safetyController.checkTrade({
        id: 'test-1',
        source: 'rule',
        code: '600000',
        amount: 10000,
        action: 'buy'
      });

      expect(result.allowed).toBe(true);

      // SafetyController 不需要显式销毁
      // safetyController.destroy();
    });
  });

  describe('PluginManager', () => {
    it('应该能够创建插件管理器', () => {
      const configManager = new ConfigManager({
        configDir: testConfigDir,
        watchEnabled: false
      });

      const pluginManager = new PluginManager(
        path.join(__dirname, '../fixtures'),
        configManager
      );

      expect(pluginManager).toBeDefined();
    });
  });

  describe('Scheduler', () => {
    it('应该能够创建调度器实例', () => {
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

      const scheduler = new Scheduler(config);
      expect(scheduler).toBeDefined();
      expect(scheduler.getStatus).toBeDefined();
      expect(scheduler.getStats).toBeDefined();
    });

    it('应该能够启动和停止调度器', async () => {
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

      const scheduler = new Scheduler(config);

      // 启动
      await scheduler.start();
      let status = scheduler.getStatus();
      expect(status.running).toBe(true);

      // 停止
      await scheduler.stop();
      status = scheduler.getStatus();
      expect(status.running).toBe(false);
    });
  });
});

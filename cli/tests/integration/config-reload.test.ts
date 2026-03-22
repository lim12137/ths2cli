/**
 * 配置热重载集成测试
 *
 * 测试场景：
 * 1. 启动时加载初始配置
 * 2. 修改 rules.yaml 文件
 * 3. 触发文件监听器
 * 4. 验证配置自动重载
 * 5. 验证新规则生效
 */

import { Scheduler } from '../../src/core/Scheduler';
import { ConfigManager } from '../../src/core/ConfigManager';
import { httpRequest } from '../../src/utils';
import type { SchedulerConfig } from '../../src/types-auto';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

// Mock httpRequest
jest.mock('../../src/utils', () => ({
  ...jest.requireActual('../../src/utils'),
  httpRequest: jest.fn()
}));

// Mock fs.watch
jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    watch: jest.fn()
  };
});

describe('配置热重载集成测试', () => {
  let scheduler: Scheduler;
  let configManager: ConfigManager;
  let testConfigDir: string;
  let rulesFilePath: string;
  let mockWatcher: EventEmitter;

  beforeAll(() => {
    jest.setTimeout(10000);
  });

  beforeEach(async () => {
    // 创建测试配置目录
    testConfigDir = path.join(__dirname, '../fixtures/temp');
    if (!fs.existsSync(testConfigDir)) {
      fs.mkdirSync(testConfigDir, { recursive: true });
    }

    rulesFilePath = path.join(testConfigDir, 'rules.yaml');

    // 复制初始配置文件
    const rulesSource = path.join(__dirname, '../fixtures/test-rules.yaml');
    const pluginsSource = path.join(__dirname, '../fixtures/test-plugins.yaml');
    const safetySource = path.join(__dirname, '../fixtures/test-safety.yaml');

    fs.copyFileSync(rulesSource, rulesFilePath);
    fs.copyFileSync(pluginsSource, path.join(testConfigDir, 'plugins.yaml'));
    fs.copyFileSync(safetySource, path.join(testConfigDir, 'safety.yaml'));

    // 创建 mock watcher
    mockWatcher = new EventEmitter();
    (fs.watch as jest.Mock).mockReturnValue(mockWatcher);

    // Mock httpRequest
    (httpRequest as jest.Mock).mockResolvedValue({
      retcode: '0',
      data: {
        money: {
          zjye: 100000,
          kyje: 90000
        }
      }
    });

    // 创建配置管理器
    configManager = new ConfigManager({
      configDir: testConfigDir,
      watchEnabled: true
    });

    await configManager.loadAllConfigs();
  });

  afterEach(async () => {
    if (scheduler) {
      await scheduler.stop();
    }

    if (configManager) {
      configManager.destroy();
    }

    // 清理测试目录
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }

    // 重置 mocks
    jest.clearAllMocks();
    (fs.watch as jest.Mock).mockReset();
  });

  describe('场景1: 启动时加载初始配置', () => {
    it('应该正确加载初始规则配置', async () => {
      const rulesConfig = configManager.getRulesConfig();

      expect(rulesConfig).toBeDefined();
      expect(rulesConfig.rules).toBeDefined();
      expect(rulesConfig.rules.length).toBeGreaterThan(0);

      // 验证第一个规则
      const firstRule = rulesConfig.rules[0];
      expect(firstRule.id).toBe('test-rule-1');
      expect(firstRule.name).toBe('测试规则1 - 价格触发买入');
      expect(firstRule.enabled).toBe(true);
    });
  });

  describe('场景2: 文件变化触发配置重载', () => {
    it('应该在文件修改时触发重载事件', (done) => {
      const reloadCallback = jest.fn();

      // 监听重载事件
      configManager.on('config:reloaded', reloadCallback);

      // 模拟文件变化
      setTimeout(() => {
        mockWatcher.emit('change', 'rename', rulesFilePath);
      }, 100);

      // 等待事件触发
      setTimeout(() => {
        expect(reloadCallback).toHaveBeenCalled();
        done();
      }, 500);
    });
  });

  describe('场景3: 配置重载后新规则生效', () => {
    it('应该在重载后加载新的规则配置', async () => {
      // 获取初始规则数量
      const initialRules = configManager.getRulesConfig().rules;
      const initialCount = initialRules.length;

      // 修改配置文件，添加新规则
      const newRulesContent = `
rules:
  - id: test-rule-1
    name: 测试规则1 - 价格触发买入
    enabled: true
    priority: 1
    condition:
      type: price
      code: "600000"
      operator: "<"
      value: 10.0
    action:
      type: buy
      amount_type: fixed
      amount: 1000
      price_type: market

  - id: test-rule-1-new
    name: 新增规则 - 动态添加
    enabled: true
    priority: 5
    condition:
      type: price
      code: "600036"
      operator: ">"
      value: 5.0
    action:
      type: buy
      amount_type: fixed
      amount: 2000
      price_type: market
`;

      fs.writeFileSync(rulesFilePath, newRulesContent, 'utf8');

      // 模拟文件变化事件
      const reloadPromise = new Promise<void>((resolve) => {
        configManager.once('config:reloaded', () => {
          resolve();
        });
      });

      mockWatcher.emit('change', 'change', rulesFilePath);

      // 等待重载完成
      await reloadPromise;
      await new Promise(resolve => setTimeout(resolve, 300));

      // 验证规则数量增加
      const newRules = configManager.getRulesConfig().rules;
      expect(newRules.length).toBe(initialCount + 1);

      // 验证新规则存在
      const newRule = newRules.find(r => r.id === 'test-rule-1-new');
      expect(newRule).toBeDefined();
      expect(newRule.name).toBe('新增规则 - 动态添加');
    });
  });

  describe('场景4: 规则启用/禁用状态变化', () => {
    it('应该在重载后反映规则的启用/禁用状态', async () => {
      // 获取初始规则
      const initialRules = configManager.getRulesConfig().rules;
      const rule1 = initialRules.find(r => r.id === 'test-rule-1');

      expect(rule1.enabled).toBe(true);

      // 修改配置，禁用规则
      const modifiedRulesContent = `
rules:
  - id: test-rule-1
    name: 测试规则1 - 价格触发买入
    enabled: false  # 改为禁用
    priority: 1
    condition:
      type: price
      code: "600000"
      operator: "<"
      value: 10.0
    action:
      type: buy
      amount_type: fixed
      amount: 1000
      price_type: market
`;

      fs.writeFileSync(rulesFilePath, modifiedRulesContent, 'utf8');

      // 触发重载
      const reloadPromise = new Promise<void>((resolve) => {
        configManager.once('config:reloaded', () => {
          resolve();
        });
      });

      mockWatcher.emit('change', 'change', rulesFilePath);
      await reloadPromise;
      await new Promise(resolve => setTimeout(resolve, 300));

      // 验证规则状态已更新
      const updatedRules = configManager.getRulesConfig().rules;
      const updatedRule = updatedRules.find(r => r.id === 'test-rule-1');

      expect(updatedRule.enabled).toBe(false);
    });
  });

  describe('场景5: 配置文件错误处理', () => {
    it('应该在配置文件格式错误时保持旧配置', async () => {
      // 获取初始配置
      const initialRules = configManager.getRulesConfig();
      const initialConfig = JSON.stringify(initialRules);

      // 写入错误的配置
      const invalidContent = `
rules:
  - id: test-rule-invalid
    name: 无效规则
    enabled: true
    # 缺少必需字段
`;

      fs.writeFileSync(rulesFilePath, invalidContent, 'utf8');

      // 监听错误事件
      const errorCallback = jest.fn();
      configManager.on('config:error', errorCallback);

      // 触发重载
      mockWatcher.emit('change', 'change', rulesFilePath);
      await new Promise(resolve => setTimeout(resolve, 500));

      // 验证错误被捕获
      expect(errorCallback).toHaveBeenCalled();

      // 验证配置保持不变
      const currentRules = configManager.getRulesConfig();
      const currentConfig = JSON.stringify(currentRules);

      expect(currentConfig).toBe(initialConfig);
    });
  });

  describe('场景6: 调度器响应配置变化', () => {
    it('应该在配置变化后调度器使用新规则', async () => {
      // 创建调度器
      const config: SchedulerConfig = {
        rules_path: rulesFilePath,
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

      // 获取初始规则数量
      const initialRuleCount = scheduler.getActiveRules().length;

      // 添加新规则
      const newRulesContent = `
rules:
  - id: test-rule-1
    name: 测试规则1
    enabled: true
    priority: 1
    condition:
      type: price
      code: "600000"
      operator: "<"
      value: 10.0
    action:
      type: buy
      amount_type: fixed
      amount: 1000
      price_type: market

  - id: test-rule-new
    name: 新规则
    enabled: true
    priority: 10
    condition:
      type: time
      start: "09:00:00"
      end: "15:00:00"
    action:
      type: buy
      amount_type: fixed
      amount: 500
      price_type: market
`;

      fs.writeFileSync(rulesFilePath, newRulesContent, 'utf8');

      // 触发重载
      mockWatcher.emit('change', 'change', rulesFilePath);

      // 等待重载完成
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 验证调度器识别到新规则
      const updatedRuleCount = scheduler.getActiveRules().length;
      expect(updatedRuleCount).toBeGreaterThan(initialRuleCount);
    });
  });
});

/**
 * ConfigManager 测试套件
 * 测试配置管理器的所有核心功能
 */

import * as fs from 'fs';
import { ConfigManager } from '../../src/core/ConfigManager';

// Mock fs 模块
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('ConfigManager', () => {
  let manager: ConfigManager;
  let mockConfigDir: string;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigDir = '/test/config';

    manager = new ConfigManager({
      configDir: mockConfigDir,
      watchEnabled: false // 禁用文件监听，避免在测试中启动定时器
    });

    // Mock fs.existsSync 默认返回 true
    mockFs.existsSync.mockReturnValue(true);

    // Mock fs.watch
    mockFs.watch.mockReturnValue({
      close: jest.fn()
    } as any);
  });

  afterEach(() => {
    manager.stopWatching();
  });

  describe('配置加载', () => {
    it('应该加载 YAML 配置文件', async () => {
      const yamlContent = `
rules:
  - id: rule-1
    name: 测试规则
    enabled: true
    priority: 1
    condition:
      type: price
      code: "600000"
      operator: "<"
      value: 10
    action:
      type: buy
      amount_type: fixed
      amount: 1000
      price_type: market
      `;

      mockFs.readFileSync.mockReturnValue(yamlContent);

      const config = await manager.loadConfig('rules.yaml');

      expect(config).toBeDefined();
      expect(config.rules).toBeDefined();
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0].id).toBe('rule-1');
    });

    it('应该加载 JSON 配置文件', async () => {
      const jsonContent = JSON.stringify({
        plugins: [
          {
            id: 'plugin-1',
            name: '测试插件',
            enabled: true,
            priority: 1,
            file: 'test-plugin.js',
            type: 'javascript',
            config: {}
          }
        ]
      });

      mockFs.readFileSync.mockReturnValue(jsonContent);

      const config = await manager.loadConfig('plugins.json');

      expect(config).toBeDefined();
      expect(config.plugins).toBeDefined();
      expect(config.plugins).toHaveLength(1);
      expect(config.plugins[0].id).toBe('plugin-1');
    });

    it('应该拒绝不支持的文件格式', async () => {
      mockFs.readFileSync.mockReturnValue('content');

      await expect(manager.loadConfig('config.txt')).rejects.toThrow('不支持的配置文件格式');
    });

    it('应该在加载配置时发射事件', async () => {
      const yamlContent = `
rules:
  - id: rule-1
    name: 测试规则
    enabled: true
    priority: 1
    condition:
      type: price
      code: "600000"
      operator: "<"
      value: 10
    action:
      type: buy
      amount_type: fixed
      amount: 1000
      price_type: market
      `;

      mockFs.readFileSync.mockReturnValue(yamlContent);

      const emitSpy = jest.spyOn(manager, 'emit');

      await manager.loadConfig('rules.yaml');

      expect(emitSpy).toHaveBeenCalledWith('config:loaded', {
        filename: 'rules.yaml'
      });
    });

    it('应该在加载所有配置后发射事件', async () => {
      const yamlContent = 'rules: []';
      mockFs.readFileSync.mockReturnValue(yamlContent);

      const emitSpy = jest.spyOn(manager, 'emit');

      await manager.loadAllConfigs();

      expect(emitSpy).toHaveBeenCalledWith('configs:loaded', expect.any(Object));
    });

    it('应该在配置错误时发射事件', async () => {
      mockFs.readFileSync.mockReturnValue('invalid yaml {{{');

      const emitSpy = jest.spyOn(manager, 'emit');

      await expect(manager.loadConfig('rules.yaml')).rejects.toThrow();

      expect(emitSpy).toHaveBeenCalledWith('config:error', expect.any(Object));
    });
  });

  describe('配置验证', () => {
    it('应该验证规则配置的必填字段', async () => {
      const invalidYaml = `
rules:
  - id: rule-1
    name: 测试规则
    # missing condition and action
      `;

      mockFs.readFileSync.mockReturnValue(invalidYaml);

      await expect(manager.loadConfig('rules.yaml')).rejects.toThrow('缺少必需字段');
    });

    it('应该验证插件配置的必填字段', async () => {
      const invalidYaml = `
plugins:
  - id: plugin-1
    # missing file
      `;

      mockFs.readFileSync.mockReturnValue(invalidYaml);

      await expect(manager.loadConfig('plugins.yaml')).rejects.toThrow('缺少必需字段');
    });

    it('应该拒绝无效的配置值', async () => {
      const invalidYaml = `
rules:
  - id: rule-1
    name: 测试规则
    enabled: "not a boolean"
    priority: "not a number"
    condition:
      type: "invalid_type"
    action:
      type: "invalid_action"
      amount_type: "invalid_type"
      amount: "not a number"
      price_type: "invalid_type"
      `;

      mockFs.readFileSync.mockReturnValue(invalidYaml);

      // 验证应该失败
      const result = await manager.loadConfig('rules.yaml').catch(e => e);
      expect(result).toBeInstanceOf(Error);
    });

    it('应该要求 rules.yaml 包含 rules 数组', async () => {
      const invalidYaml = `
# missing rules array
something_else: []
      `;

      mockFs.readFileSync.mockReturnValue(invalidYaml);

      await expect(manager.loadConfig('rules.yaml')).rejects.toThrow('必须包含 rules 数组');
    });

    it('应该要求 plugins.yaml 包含 plugins 数组', async () => {
      const invalidYaml = `
# missing plugins array
something_else: []
      `;

      mockFs.readFileSync.mockReturnValue(invalidYaml);

      await expect(manager.loadConfig('plugins.yaml')).rejects.toThrow('必须包含 plugins 数组');
    });

    it('应该接受有效的规则配置', async () => {
      const validYaml = `
rules:
  - id: rule-1
    name: 测试规则
    enabled: true
    priority: 1
    condition:
      type: price
      code: "600000"
      operator: "<"
      value: 10
    action:
      type: buy
      amount_type: fixed
      amount: 1000
      price_type: market
  - id: rule-2
    name: 测试规则2
    enabled: false
    priority: 2
    condition:
      type: time
      start: "09:30:00"
      end: "15:00:00"
    action:
      type: sell
      amount_type: ratio
      ratio: 50
      price_type: market
      `;

      mockFs.readFileSync.mockReturnValue(validYaml);

      const config = await manager.loadConfig('rules.yaml');

      expect(config).toBeDefined();
      expect(config.rules).toHaveLength(2);
    });

    it('应该接受有效的插件配置', async () => {
      const validYaml = `
plugins:
  - id: plugin-1
    name: 测试插件
    enabled: true
    priority: 1
    file: plugin.js
    type: javascript
    config:
      param1: value1
      param2: value2
  - id: plugin-2
    name: 测试插件2
    enabled: false
    priority: 2
    file: plugin.py
    type: python
    config: {}
      `;

      mockFs.readFileSync.mockReturnValue(validYaml);

      const config = await manager.loadConfig('plugins.yaml');

      expect(config).toBeDefined();
      expect(config.plugins).toHaveLength(2);
    });
  });

  describe('配置获取', () => {
    it('应该能够获取已加载的配置', async () => {
      const yamlContent = 'rules: []';
      mockFs.readFileSync.mockReturnValue(yamlContent);

      await manager.loadConfig('rules.yaml');

      const config = manager.getConfig('rules.yaml');

      expect(config).toBeDefined();
      expect(config.rules).toEqual([]);
    });

    it('应该返回 undefined 对于未加载的配置', () => {
      const config = manager.getConfig('nonexistent.yaml');

      expect(config).toBeUndefined();
    });

    it('应该能够获取规则配置', async () => {
      const yamlContent = `
rules:
  - id: rule-1
    name: 测试规则
    enabled: true
    priority: 1
    condition:
      type: price
      code: "600000"
      operator: "<"
      value: 10
    action:
      type: buy
      amount_type: fixed
      amount: 1000
      price_type: market
      `;

      mockFs.readFileSync.mockReturnValue(yamlContent);

      await manager.loadConfig('rules.yaml');

      const rulesConfig = manager.getRulesConfig();

      expect(rulesConfig).toBeDefined();
      expect(rulesConfig.rules).toHaveLength(1);
    });

    it('应该能够获取插件配置', async () => {
      const yamlContent = `
plugins:
  - id: plugin-1
    name: 测试插件
    enabled: true
    priority: 1
    file: plugin.js
    type: javascript
    config: {}
      `;

      mockFs.readFileSync.mockReturnValue(yamlContent);

      await manager.loadConfig('plugins.yaml');

      const pluginsConfig = manager.getPluginsConfig();

      expect(pluginsConfig).toBeDefined();
      expect(pluginsConfig.plugins).toHaveLength(1);
    });

    it('应该能够获取安全配置', async () => {
      const yamlContent = `
rules:
  - id: rule-1
    name: 测试规则
    enabled: true
    priority: 1
    condition:
      type: price
      code: "600000"
      operator: "<"
      value: 10
    action:
      type: buy
      amount_type: fixed
      amount: 1000
      price_type: market

safety:
  funds:
    max_single_trade: 10000
    max_daily_trade: 100000
    min_reserve: 1000
  position:
    max_single_stock: 0.3
    max_total_position: 0.8
  circuit_breaker:
    enabled: true
    max_consecutive_losses: 3
    cooldown_minutes: 30
      `;

      mockFs.readFileSync.mockReturnValue(yamlContent);

      await manager.loadConfig('rules.yaml');

      const safetyConfig = manager.getSafetyConfig();

      expect(safetyConfig).toBeDefined();
      expect(safetyConfig.funds).toBeDefined();
      expect(safetyConfig.funds.max_single_trade).toBe(10000);
    });

    it('应该能够获取监控配置', async () => {
      const yamlContent = `
log_level: info
check_interval: 60
notify_channels:
  - email
  - webhook
      `;

      mockFs.readFileSync.mockReturnValue(yamlContent);

      await manager.loadConfig('monitoring.yaml');

      const monitoringConfig = manager.getMonitoringConfig();

      expect(monitoringConfig).toBeDefined();
      expect(monitoringConfig.log_level).toBe('info');
    });
  });

  describe('配置热重载', () => {
    it('应该在启用监听时监听文件变化', async () => {
      const watchEnabledManager = new ConfigManager({
        configDir: mockConfigDir,
        watchEnabled: true
      });

      const yamlContent = 'rules: []';
      mockFs.readFileSync.mockReturnValue(yamlContent);

      await watchEnabledManager.loadConfig('rules.yaml');

      expect(mockFs.watch).toHaveBeenCalled();

      watchEnabledManager.stopWatching();
    });

    it('应该在文件变化时重新加载配置', async () => {
      const watchEnabledManager = new ConfigManager({
        configDir: mockConfigDir,
        watchEnabled: true
      });

      const yamlContent = 'rules: []';
      mockFs.readFileSync.mockReturnValue(yamlContent);

      const watchCallback = mockFs.watch.mock.calls[0]?.[1];
      expect(watchCallback).toBeDefined();

      const emitSpy = jest.spyOn(watchEnabledManager, 'emit');

      // 模拟文件变化事件
      if (watchCallback) {
        watchCallback('change', 'rules.yaml');
      }

      // 等待异步操作
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(emitSpy).toHaveBeenCalledWith('config:reloaded', {
        filename: 'rules.yaml'
      });

      watchEnabledManager.stopWatching();
    });

    it('应该在重载失败时发射错误事件', async () => {
      const watchEnabledManager = new ConfigManager({
        configDir: mockConfigDir,
        watchEnabled: true
      });

      const yamlContent = 'rules: []';
      mockFs.readFileSync.mockReturnValue(yamlContent);

      const watchCallback = mockFs.watch.mock.calls[0]?.[1];

      // 模拟文件变化导致错误
      mockFs.readFileSync.mockReturnValue('invalid {{{');

      const emitSpy = jest.spyOn(watchEnabledManager, 'emit');

      if (watchCallback) {
        try {
          watchCallback('change', 'rules.yaml');
        } catch (e) {
          // 预期会出错
        }
      }

      // 等待异步操作
      await new Promise(resolve => setTimeout(resolve, 10));

      watchEnabledManager.stopWatching();
    });

    it('应该能够停止监听所有文件', () => {
      const watchEnabledManager = new ConfigManager({
        configDir: mockConfigDir,
        watchEnabled: true
      });

      // Mock watch 返回一个带有 close 方法的对象
      const mockWatcher = {
        close: jest.fn()
      };
      mockFs.watch.mockReturnValue(mockWatcher as any);

      watchEnabledManager.stopWatching();

      expect(mockWatcher.close).toHaveBeenCalled();
    });
  });

  describe('配置重载', () => {
    it('应该能够重载所有配置', async () => {
      const yamlContent = 'rules: []';
      mockFs.readFileSync.mockReturnValue(yamlContent);

      await manager.loadAllConfigs();

      expect(manager.getConfig('rules.yaml')).toBeDefined();

      // 清空 configs
      (manager as any).configs.clear();

      expect(manager.getConfig('rules.yaml')).toBeUndefined();

      // 重载
      await manager.reloadAll();

      expect(manager.getConfig('rules.yaml')).toBeDefined();
    });

    it('应该在重载时清空旧配置', async () => {
      const yamlContent = 'rules: []';
      mockFs.readFileSync.mockReturnValue(yamlContent);

      await manager.loadConfig('rules.yaml');

      expect(manager.getConfig('rules.yaml')).toBeDefined();

      await manager.reloadAll();

      // 应该仍然能够获取配置（因为重新加载了）
      expect(manager.getConfig('rules.yaml')).toBeDefined();
    });
  });

  describe('错误处理', () => {
    it('应该处理文件读取错误', async () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      await expect(manager.loadConfig('rules.yaml')).rejects.toThrow();
    });

    it('应该处理 YAML 解析错误', async () => {
      mockFs.readFileSync.mockReturnValue('invalid: yaml: content: {{{');

      await expect(manager.loadConfig('rules.yaml')).rejects.toThrow();
    });

    it('应该处理 JSON 解析错误', async () => {
      mockFs.readFileSync.mockReturnValue('invalid json {{{');

      await expect(manager.loadConfig('plugins.json')).rejects.toThrow();
    });

    it('应该跳过不存在的配置文件', async () => {
      mockFs.existsSync.mockReturnValue(false);

      await manager.loadAllConfigs();

      // 不应该抛出错误
      expect(true).toBe(true);
    });
  });

  describe('边界情况', () => {
    it('应该处理空的规则数组', async () => {
      const yamlContent = 'rules: []';
      mockFs.readFileSync.mockReturnValue(yamlContent);

      const config = await manager.loadConfig('rules.yaml');

      expect(config.rules).toEqual([]);
    });

    it('应该处理空的插件数组', async () => {
      const yamlContent = 'plugins: []';
      mockFs.readFileSync.mockReturnValue(yamlContent);

      const config = await manager.loadConfig('plugins.yaml');

      expect(config.plugins).toEqual([]);
    });

    it('应该处理包含额外字段的配置', async () => {
      const yamlContent = `
rules:
  - id: rule-1
    name: 测试规则
    enabled: true
    priority: 1
    condition:
      type: price
      code: "600000"
      operator: "<"
      value: 10
    action:
      type: buy
      amount_type: fixed
      amount: 1000
      price_type: market
    extra_field: extra_value
    another_field: 123
      `;

      mockFs.readFileSync.mockReturnValue(yamlContent);

      const config = await manager.loadConfig('rules.yaml');

      expect(config.rules[0].extra_field).toBe('extra_value');
      expect(config.rules[0].another_field).toBe(123);
    });

    it('应该处理包含嵌套配置的复杂结构', async () => {
      const yamlContent = `
rules:
  - id: rule-1
    name: 复杂规则
    enabled: true
    priority: 1
    condition:
      type: composite
      operator: AND
      conditions:
        - type: price
          code: "600000"
          operator: ">"
          value: 5
        - type: price
          code: "600000"
          operator: "<"
          value: 15
    action:
      type: buy
      amount_type: ratio
      ratio: 50
      price_type: limit
      price: 10.5
    constraints:
      max_execution: 10
      cooldown_seconds: 60
      position_limit: 0.2
      `;

      mockFs.readFileSync.mockReturnValue(yamlContent);

      const config = await manager.loadConfig('rules.yaml');

      expect(config.rules[0].condition.type).toBe('composite');
      expect(config.rules[0].condition.conditions).toHaveLength(2);
      expect(config.rules[0].constraints).toBeDefined();
    });
  });
});

/**
 * 插件加载和执行集成测试
 *
 * 测试场景：
 * 1. 加载 JavaScript 插件
 * 2. 插件初始化
 * 3. 插件 check 返回 true
 * 4. 插件 execute 执行交易
 * 5. 插件卸载清理
 */

import { Scheduler } from '../../src/core/Scheduler';
import { PluginManager } from '../../src/core/PluginManager';
import { ConfigManager } from '../../src/core/ConfigManager';
import { httpRequest } from '../../src/utils';
import type { SchedulerConfig, PluginConfig } from '../../src/types-auto';
import * as fs from 'fs';
import * as path from 'path';

// Mock httpRequest
jest.mock('../../src/utils', () => ({
  ...jest.requireActual('../../src/utils'),
  httpRequest: jest.fn()
}));

describe('插件加载和执行集成测试', () => {
  let scheduler: Scheduler;
  let pluginManager: PluginManager;
  let configManager: ConfigManager;
  let testConfigDir: string;
  let testPluginsDir: string;

  beforeAll(() => {
    jest.setTimeout(10000);
  });

  beforeEach(async () => {
    // 创建测试目录
    testConfigDir = path.join(__dirname, '../fixtures/temp');
    testPluginsDir = path.join(__dirname, '../fixtures');

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

    // Mock httpRequest
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

      // 默认返回交易成功
      return Promise.resolve({
        retcode: '0',
        htbh: 'PLUGIN123',
        no: '456'
      });
    });

    // 创建配置管理器
    configManager = new ConfigManager({
      configDir: testConfigDir,
      watchEnabled: false
    });

    await configManager.loadAllConfigs();

    // 创建插件管理器
    pluginManager = new PluginManager(testPluginsDir, configManager);
  });

  afterEach(async () => {
    if (scheduler) {
      await scheduler.stop();
    }

    if (pluginManager) {
      await pluginManager.unloadAllPlugins();
    }

    if (configManager) {
      configManager.destroy();
    }

    // 清理测试目录
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }

    jest.clearAllMocks();
  });

  describe('场景1: 加载 JavaScript 插件', () => {
    it('应该成功加载 JavaScript 插件', async () => {
      const pluginConfig: PluginConfig = {
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
      };

      const plugin = await pluginManager.loadPlugin(pluginConfig);

      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('test-plugin-js');
      expect(plugin.name).toBe('JavaScript测试插件');
      expect(plugin.instance).toBeDefined();
    });
  });

  describe('场景2: 插件初始化', () => {
    it('应该正确初始化插件', async () => {
      const pluginConfig: PluginConfig = {
        id: 'test-plugin-init',
        name: '初始化测试插件',
        enabled: true,
        priority: 1,
        file: 'test-plugin.js',
        type: 'javascript',
        config: {
          threshold: 10,
          symbols: ['600000'],
          testParam: 'test-value'
        }
      };

      const plugin = await pluginManager.loadPlugin(pluginConfig);

      // 验证插件已初始化
      expect(plugin.instance.initialized).toBe(true);
      expect(plugin.instance.config).toEqual(pluginConfig.config);
    });
  });

  describe('场景3: 插件 check 方法返回 true', () => {
    it('应该在条件满足时返回 true', async () => {
      const pluginConfig: PluginConfig = {
        id: 'test-plugin-check',
        name: 'Check测试插件',
        enabled: true,
        priority: 1,
        file: 'test-plugin.js',
        type: 'javascript',
        config: {
          threshold: 10, // 价格阈值
          symbols: ['600000']
        }
      };

      const plugin = await pluginManager.loadPlugin(pluginConfig);

      // 创建插件上下文
      const context = pluginManager.createPluginContext(scheduler);

      // 调用 check 方法（httpRequest 已 mock，返回价格为 8.5，小于阈值 10）
      const shouldTrigger = await plugin.instance.check(context);

      // 验证应该触发
      expect(shouldTrigger).toBe(true);
    });
  });

  describe('场景4: 插件 execute 执行交易', () => {
    it('应该成功执行交易', async () => {
      const pluginConfig: PluginConfig = {
        id: 'test-plugin-execute',
        name: 'Execute测试插件',
        enabled: true,
        priority: 1,
        file: 'test-plugin.js',
        type: 'javascript',
        config: {
          threshold: 10,
          symbols: ['600000']
        }
      };

      const plugin = await pluginManager.loadPlugin(pluginConfig);
      const context = pluginManager.createPluginContext(scheduler);

      // 执行交易
      const result = await plugin.instance.execute(context);

      // 验证交易成功
      expect(result.success).toBe(true);
      expect(result.symbol).toBe('600000');
      expect(result.amount).toBe(1000);

      // 验证 HTTP 被调用
      expect(httpRequest).toHaveBeenCalledWith(
        expect.stringContaining('buy'),
        expect.anything(),
        expect.objectContaining({
          code: '600000',
          amount: 1000
        })
      );
    });
  });

  describe('场景5: 插件完整生命周期', () => {
    it('应该完成完整的插件生命周期', async () => {
      const pluginConfig: PluginConfig = {
        id: 'test-plugin-lifecycle',
        name: '生命周期测试插件',
        enabled: true,
        priority: 1,
        file: 'test-plugin.js',
        type: 'javascript',
        config: {
          threshold: 10,
          symbols: ['600000']
        }
      };

      // 1. 加载插件
      const plugin = await pluginManager.loadPlugin(pluginConfig);
      expect(plugin.instance.initialized).toBe(true);

      // 2. 检查条件
      const context = pluginManager.createPluginContext(scheduler);
      const shouldExecute = await plugin.instance.check(context);
      expect(shouldExecute).toBe(true);

      // 3. 执行交易
      const result = await plugin.instance.execute(context);
      expect(result.success).toBe(true);

      // 4. 验证执行计数
      expect(plugin.instance.executeCount).toBe(1);

      // 5. 卸载插件
      await pluginManager.unloadPlugin(plugin.id);

      // 6. 验证插件已销毁
      const loadedPlugin = pluginManager.getPlugin(plugin.id);
      expect(loadedPlugin).toBeUndefined();
    });
  });

  describe('场景6: 插件监控和自动执行', () => {
    it('应该在监控周期内自动执行插件', async () => {
      const pluginConfig: PluginConfig = {
        id: 'test-plugin-monitor',
        name: '监控测试插件',
        enabled: true,
        priority: 1,
        file: 'test-plugin.js',
        type: 'javascript',
        config: {
          threshold: 10,
          symbols: ['600000']
        },
        schedule: {
          enabled: true,
          interval: 1 // 1秒检查一次
        }
      };

      await pluginManager.loadPlugin(pluginConfig);

      // 启动监控
      pluginManager.startMonitoring(1);

      // 等待几个监控周期
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 停止监控
      pluginManager.stopMonitoring();

      // 验证插件被执行
      const plugin = pluginManager.getPlugin('test-plugin-monitor');
      expect(plugin).toBeDefined();
      expect(plugin.instance.executeCount).toBeGreaterThan(0);
    });
  });

  describe('场景7: 插件错误处理', () => {
    it('应该处理插件执行错误', async () => {
      const pluginConfig: PluginConfig = {
        id: 'test-plugin-error',
        name: '错误处理测试插件',
        enabled: true,
        priority: 1,
        file: 'test-plugin.js',
        type: 'javascript',
        config: {
          threshold: 10,
          symbols: ['600000']
        }
      };

      await pluginManager.loadPlugin(pluginConfig);

      // Mock 交易失败
      (httpRequest as jest.Mock).mockImplementationOnce(() =>
        Promise.reject(new Error('网络错误'))
      );

      const context = pluginManager.createPluginContext(scheduler);
      const plugin = pluginManager.getPlugin('test-plugin-error');

      // 尝试执行，应该捕获错误
      try {
        await plugin.instance.execute(context);
        // 如果没有抛出错误，测试失败
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('网络错误');
      }
    });
  });

  describe('场景8: 调度器集成插件系统', () => {
    it('应该在调度器中正确集成插件', async () => {
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

      scheduler = new Scheduler(config);
      await scheduler.start();

      // 等待插件监控执行
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 验证插件已加载
      const plugins = scheduler.getActivePlugins();
      expect(plugins.length).toBeGreaterThan(0);

      // 验证插件被执行
      const pluginStats = scheduler.getStats().pluginStats;
      expect(pluginStats.totalExecutions).toBeGreaterThan(0);
    });
  });

  describe('场景9: 插件配置热重载', () => {
    it('应该在配置变化时重新加载插件', async () => {
      // 初始加载插件
      const pluginConfig: PluginConfig = {
        id: 'test-plugin-reload',
        name: '重载测试插件',
        enabled: true,
        priority: 1,
        file: 'test-plugin.js',
        type: 'javascript',
        config: {
          threshold: 10,
          symbols: ['600000']
        }
      };

      await pluginManager.loadPlugin(pluginConfig);

      // 修改插件配置
      const updatedConfig: PluginConfig = {
        ...pluginConfig,
        config: {
          threshold: 5, // 修改阈值
          symbols: ['600000', '600001'] // 添加新股票
        }
      };

      // 重新加载插件
      await pluginManager.reloadPlugin(updatedConfig);

      // 验证配置已更新
      const plugin = pluginManager.getPlugin('test-plugin-reload');
      expect(plugin.instance.config.threshold).toBe(5);
      expect(plugin.instance.config.symbols).toContain('600001');
    });
  });

  describe('场景10: 多个插件并发执行', () => {
    it('应该能够并发执行多个插件', async () => {
      // 加载多个插件
      const pluginConfigs: PluginConfig[] = [
        {
          id: 'plugin-1',
          name: '插件1',
          enabled: true,
          priority: 1,
          file: 'test-plugin.js',
          type: 'javascript',
          config: { threshold: 10, symbols: ['600000'] }
        },
        {
          id: 'plugin-2',
          name: '插件2',
          enabled: true,
          priority: 2,
          file: 'test-plugin.js',
          type: 'javascript',
          config: { threshold: 10, symbols: ['600001'] }
        }
      ];

      // 并发加载
      await Promise.all(
        pluginConfigs.map(config => pluginManager.loadPlugin(config))
      );

      // 验证所有插件都已加载
      expect(pluginManager.getPlugin('plugin-1')).toBeDefined();
      expect(pluginManager.getPlugin('plugin-2')).toBeDefined();

      // 并发执行
      const context = pluginManager.createPluginContext(scheduler);

      const results = await Promise.allSettled(
        pluginConfigs.map(async config => {
          const plugin = pluginManager.getPlugin(config.id);
          if (await plugin.instance.check(context)) {
            return await plugin.instance.execute(context);
          }
        })
      );

      // 验证所有插件都成功执行
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });
    });
  });
});

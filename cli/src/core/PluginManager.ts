/**
 * 插件管理器 - 动态加载和管理交易插件
 */

import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import type { Plugin, PluginConfig, PluginContext, MarketData } from '../types-auto';
import { httpRequest } from '../utils';

interface PluginInstance {
  config: PluginConfig;
  instance?: Plugin;
  process?: any;
  enabled: boolean;
  lastCheck: number;
  checkCount: number;
}

export class PluginManager extends EventEmitter {
  private plugins: Map<string, PluginInstance> = new Map();
  private watchInterval: NodeJS.Timeout | null = null;

  constructor(
    private pluginDir: string,
    private configManager: any
  ) {
    super();
  }

  /**
   * 加载所有插件
   */
  async loadAllPlugins(): Promise<void> {
    const pluginsConfig = this.configManager.getPluginsConfig();
    if (!pluginsConfig || !pluginsConfig.plugins) {
      console.log('⚠️  未找到插件配置');
      return;
    }

    for (const pluginConfig of pluginsConfig.plugins) {
      if (pluginConfig.enabled) {
        await this.loadPlugin(pluginConfig);
      }
    }

    this.emit('plugins:loaded', { count: this.plugins.size });
    console.log(`✓ 已加载 ${this.plugins.size} 个插件`);
  }

  /**
   * 加载单个插件
   */
  async loadPlugin(config: PluginConfig): Promise<void> {
    try {
      const pluginPath = path.join(this.pluginDir, config.file);

      if (!fs.existsSync(pluginPath)) {
        throw new Error(`插件文件不存在: ${pluginPath}`);
      }

      const pluginInstance: PluginInstance = {
        config,
        enabled: config.enabled,
        lastCheck: 0,
        checkCount: 0,
      };

      if (config.type === 'javascript') {
        // 动态加载 JavaScript 插件
        const pluginModule = await import(pluginPath);
        const PluginClass = pluginModule.default || pluginModule[config.id];

        if (typeof PluginClass !== 'function') {
          throw new Error(`插件 ${config.id} 必须导出默认类或以插件ID命名的类`);
        }

        pluginInstance.instance = new PluginClass();

        // 初始化插件
        if (pluginInstance.instance) {
          await pluginInstance.instance.init(config.config || {});
        }
        console.log(`✓ JavaScript 插件已加载: ${config.name} (${config.id})`);

      } else if (config.type === 'python') {
        // 启动 Python 插件进程
        pluginInstance.process = this.spawnPythonPlugin(pluginPath, config);
        console.log(`✓ Python 插件已启动: ${config.name} (${config.id})`);
      }

      this.plugins.set(config.id, pluginInstance);
      this.emit('plugin:loaded', { pluginId: config.id });

    } catch (error) {
      this.emit('plugin:error', { pluginId: config.id, error });
      console.error(`✗ 插件加载失败: ${config.name}`, error);
    }
  }

  /**
   * 启动 Python 插件进程
   */
  private spawnPythonPlugin(scriptPath: string, config: PluginConfig): any {
    const pythonProcess = spawn('python', [scriptPath, JSON.stringify(config.config || {})], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    pythonProcess.stdout.on('data', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        this.handlePluginMessage(config.id, message);
      } catch (error) {
        console.error(`解析插件消息失败: ${config.id}`, error);
      }
    });

    pythonProcess.stderr.on('data', (data: Buffer) => {
      console.error(`插件 ${config.id} 错误:`, data.toString());
    });

    pythonProcess.on('exit', (code: number) => {
      console.log(`插件 ${config.id} 退出，代码: ${code}`);
      this.emit('plugin:exited', { pluginId: config.id, code });
    });

    return pythonProcess;
  }

  /**
   * 处理插件消息
   */
  private async handlePluginMessage(pluginId: string, message: any): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    switch (message.type) {
      case 'check_result':
        if (message.result) {
          await this.executePlugin(pluginId);
        }
        break;

      case 'trade_request':
        this.emit('trade:request', {
          source: 'plugin',
          pluginId,
          ...message.data,
        });
        break;

      case 'notification':
        this.emit('notification', {
          type: message.level || 'info',
          message: message.text,
        });
        break;

      default:
        console.warn(`未知的插件消息类型: ${message.type}`);
    }
  }

  /**
   * 检查所有插件
   */
  async checkAllPlugins(marketData?: Map<string, any>): Promise<void> {
    for (const [id, plugin] of this.plugins) {
      if (!plugin.enabled) continue;

      try {
        await this.checkPlugin(id, marketData);
      } catch (error) {
        this.emit('plugin:error', { pluginId: id, error });
        console.error(`插件检查失败: ${id}`, error);
      }
    }
  }

  /**
   * 检查单个插件
   */
  async checkPlugin(pluginId: string, marketData?: Map<string, any>): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || !plugin.enabled) {
      return false;
    }

    // 检查冷却时间
    const now = Date.now();
    const cooldown = plugin.config.schedule?.check_interval || 60;
    if (now - plugin.lastCheck < cooldown * 1000) {
      return false;
    }

    plugin.lastCheck = now;

    try {
      const context = this.createContext(plugin.config);

      if (plugin.config.type === 'javascript' && plugin.instance) {
        const shouldExecute = await plugin.instance.check(context);
        plugin.checkCount++;

        if (shouldExecute) {
          this.emit('plugin:triggered', { pluginId });
          console.log(`📌 插件触发: ${plugin.config.name} (${pluginId})`);
          await this.executePlugin(pluginId);
        }

        return shouldExecute;

      } else if (plugin.config.type === 'python' && plugin.process) {
        // 发送检查请求到 Python 进程
        plugin.process.stdin.write(JSON.stringify({
          type: 'check',
          marketData: marketData ? Object.fromEntries(marketData) : null,
        }) + '\n');
      }

    } catch (error) {
      this.emit('plugin:error', { pluginId, error });
      console.error(`插件检查出错: ${pluginId}`, error);
    }

    return false;
  }

  /**
   * 执行插件
   */
  async executePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || !plugin.enabled) {
      return;
    }

    try {
      const context = this.createContext(plugin.config);

      if (plugin.config.type === 'javascript' && plugin.instance) {
        await plugin.instance.execute(context);
        this.emit('plugin:executed', { pluginId });
      }

      // Python 插件通过 check 响应自动执行

    } catch (error) {
      this.emit('plugin:error', { pluginId, error });
      console.error(`插件执行出错: ${pluginId}`, error);
    }
  }

  /**
   * 创建插件上下文
   */
  private createContext(config: PluginConfig): PluginContext {
    return {
      getQuote: async (code: string) => {
        const data = await httpRequest(`/quote?code=${code}`) as MarketData;
        return data;
      },

      getKline: async (code: string, period: number, length: number) => {
        const data = await httpRequest(`/kline?code=${code}&period=${period}&length=${length}`);
        return data;
      },

      buy: async (code: string, amount: number, options?: any) => {
        const tradeRequest = {
          source: 'plugin' as const,
          pluginId: config.id,
          code,
          amount,
          action: 'buy' as const,
          ...options,
        };

        this.emit('trade:request', tradeRequest);
        return { success: true, message: '交易请求已提交' };
      },

      sell: async (code: string, amount: number, options?: any) => {
        const tradeRequest = {
          source: 'plugin' as const,
          pluginId: config.id,
          code,
          amount,
          action: 'sell' as const,
          ...options,
        };

        this.emit('trade:request', tradeRequest);
        return { success: true, message: '交易请求已提交' };
      },

      getPosition: async () => {
        return await httpRequest('/position');
      },

      getMoney: async () => {
        return await httpRequest('/money');
      },

      config: config.config || {},

      notify: (message: string, level: 'info' | 'warn' | 'error' = 'info') => {
        this.emit('notification', { type: level, message });
        console.log(`[${level.toUpperCase()}] ${config.name}: ${message}`);
      },
    };
  }

  /**
   * 启动插件监控
   */
  startMonitoring(intervalSeconds: number): void {
    if (this.watchInterval) {
      console.log('插件监控已在运行中');
      return;
    }

    console.log(`🔍 启动插件监控，检查间隔: ${intervalSeconds}秒`);

    this.watchInterval = setInterval(async () => {
      try {
        // 获取市场数据（可选）
        const marketData = await this.fetchMarketData();
        await this.checkAllPlugins(marketData);
      } catch (error) {
        this.emit('plugin:error', { error });
        console.error('插件监控出错:', error);
      }
    }, intervalSeconds * 1000);
  }

  /**
   * 停止监控
   */
  stopMonitoring(): void {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
      console.log('⏹️  插件监控已停止');
    }
  }

  /**
   * 获取市场数据
   */
  private async fetchMarketData(): Promise<Map<string, any>> {
    // TODO: 调用桥接服务获取实时行情数据
    // 这里先返回模拟数据
    const mockData = new Map<string, any>();
    mockData.set('600000', {
      code: '600000',
      name: '浦发银行',
      price: 9.85,
      change: -0.15,
      volume: 1234567,
      timestamp: Date.now(),
    });
    return mockData;
  }

  /**
   * 重载插件
   */
  async reloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`插件不存在: ${pluginId}`);
    }

    // 卸载旧插件
    await this.unloadPlugin(pluginId);

    // 重新加载
    const pluginsConfig = this.configManager.getPluginsConfig();
    const config = pluginsConfig.plugins.find((p: PluginConfig) => p.id === pluginId);

    if (config) {
      await this.loadPlugin(config);
      console.log(`✓ 插件已重载: ${pluginId}`);
    }
  }

  /**
   * 卸载插件
   */
  async unloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return;
    }

    try {
      if (plugin.instance) {
        await plugin.instance.destroy();
      }

      if (plugin.process) {
        plugin.process.kill();
      }

      this.plugins.delete(pluginId);
      this.emit('plugin:unloaded', { pluginId });
      console.log(`✓ 插件已卸载: ${pluginId}`);

    } catch (error) {
      console.error(`插件卸载失败: ${pluginId}`, error);
    }
  }

  /**
   * 启用/禁用插件
   */
  togglePlugin(pluginId: string, enabled: boolean): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.enabled = enabled;
      console.log(`✓ 插件 ${enabled ? '启用' : '禁用'}: ${pluginId}`);
      this.emit('plugin:toggled', { pluginId, enabled });
    }
  }

  /**
   * 获取插件统计
   */
  getStats(): {
    totalPlugins: number;
    enabledPlugins: number;
    pluginDetails: Array<{
      id: string;
      name: string;
      enabled: boolean;
      checkCount: number;
    }>;
  } {
    const details = Array.from(this.plugins.values()).map(p => ({
      id: p.config.id,
      name: p.config.name,
      enabled: p.enabled,
      checkCount: p.checkCount,
    }));

    return {
      totalPlugins: this.plugins.size,
      enabledPlugins: Array.from(this.plugins.values()).filter(p => p.enabled).length,
      pluginDetails: details,
    };
  }

  /**
   * 清理所有插件
   */
  async cleanup(): Promise<void> {
    for (const [id] of this.plugins) {
      await this.unloadPlugin(id);
    }
    this.stopMonitoring();
    console.log('✓ 所有插件已清理');
  }
}

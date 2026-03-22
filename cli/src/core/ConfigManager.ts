/**
 * 配置管理器
 * 加载、验证和热重载配置文件
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { EventEmitter } from 'events';

export interface ConfigManagerOptions {
  configDir: string;
  watchEnabled: boolean;
}

export class ConfigManager extends EventEmitter {
  private configs: Map<string, any> = new Map();
  private watchers: Map<string, fs.FSWatcher> = new Map();

  constructor(private options: ConfigManagerOptions) {
    super();
  }

  /**
   * 加载所有配置文件
   */
  async loadAllConfigs(): Promise<void> {
    const configDir = this.options.configDir;
    const configFiles = [
      'rules.yaml',
      'plugins.yaml',
      'monitoring.yaml',
      'environments.yaml'
    ];

    for (const file of configFiles) {
      const filePath = path.join(configDir, file);
      if (fs.existsSync(filePath)) {
        await this.loadConfig(file);
      }
    }

    this.emit('configs:loaded', { count: this.configs.size });
  }

  /**
   * 加载单个配置文件
   */
  async loadConfig(filename: string): Promise<any> {
    const filePath = path.join(this.options.configDir, filename);
    const ext = path.extname(filename);

    try {
      let config: any;

      if (ext === '.yaml' || ext === '.yml') {
        const content = fs.readFileSync(filePath, 'utf8');
        config = yaml.load(content);
      } else if (ext === '.json') {
        const content = fs.readFileSync(filePath, 'utf8');
        config = JSON.parse(content);
      } else {
        throw new Error(`不支持的配置文件格式: ${ext}`);
      }

      // 验证配置
      this.validateConfig(filename, config);

      this.configs.set(filename, config);

      // 启用文件监听
      if (this.options.watchEnabled && !this.watchers.has(filename)) {
        this.watchFile(filename);
      }

      this.emit('config:loaded', { filename });
      return config;
    } catch (error) {
      this.emit('config:error', { filename, error });
      throw error;
    }
  }

  /**
   * 获取配置
   */
  getConfig(filename: string): any {
    return this.configs.get(filename);
  }

  /**
   * 获取规则配置
   */
  getRulesConfig(): any {
    return this.configs.get('rules.yaml');
  }

  /**
   * 获取插件配置
   */
  getPluginsConfig(): any {
    return this.configs.get('plugins.yaml');
  }

  /**
   * 获取安全配置
   */
  getSafetyConfig(): any {
    const rules = this.getRulesConfig();
    return rules?.safety;
  }

  /**
   * 获取监控配置
   */
  getMonitoringConfig(): any {
    return this.configs.get('monitoring.yaml');
  }

  /**
   * 验证配置
   */
  private validateConfig(filename: string, config: any): void {
    switch (filename) {
      case 'rules.yaml':
        this.validateRulesConfig(config);
        break;
      case 'plugins.yaml':
        this.validatePluginsConfig(config);
        break;
    }
  }

  /**
   * 验证规则配置
   */
  private validateRulesConfig(config: any): void {
    if (!config.rules || !Array.isArray(config.rules)) {
      throw new Error('rules.yaml 必须包含 rules 数组');
    }

    for (const rule of config.rules) {
      if (!rule.id || !rule.name || !rule.condition || !rule.action) {
        throw new Error(`规则 ${rule.id || ''} 缺少必需字段`);
      }
    }
  }

  /**
   * 验证插件配置
   */
  private validatePluginsConfig(config: any): void {
    if (!config.plugins || !Array.isArray(config.plugins)) {
      throw new Error('plugins.yaml 必须包含 plugins 数组');
    }

    for (const plugin of config.plugins) {
      if (!plugin.id || !plugin.file) {
        throw new Error(`插件 ${plugin.id || ''} 缺少必需字段`);
      }
    }
  }

  /**
   * 监听配置文件变化
   */
  private watchFile(filename: string): void {
    const filePath = path.join(this.options.configDir, filename);

    const watcher = fs.watch(filePath, async (eventType) => {
      if (eventType === 'change') {
        try {
          await this.loadConfig(filename);
          this.emit('config:reloaded', { filename });
          console.log(`✓ 配置文件已重载: ${filename}`);
        } catch (error) {
          this.emit('config:error', { filename, error });
          console.error(`✗ 配置文件重载失败: ${filename}`, error);
        }
      }
    });

    this.watchers.set(filename, watcher);
  }

  /**
   * 停止监听
   */
  stopWatching(): void {
    for (const [filename, watcher] of this.watchers) {
      watcher.close();
    }
    this.watchers.clear();
  }

  /**
   * 重载所有配置
   */
  async reloadAll(): Promise<void> {
    this.configs.clear();
    await this.loadAllConfigs();
  }
}

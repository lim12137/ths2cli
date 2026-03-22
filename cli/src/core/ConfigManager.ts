/**
 * 配置管理器
 * 加载、验证和热重载配置文件
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';

export interface ConfigManagerOptions {
  configDir: string;
  watchEnabled: boolean;
}

export class ConfigManager extends EventEmitter {
  private configs: Map<string, any> = new Map();
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private logger: Logger;

  constructor(private options: ConfigManagerOptions) {
    super();
    this.logger = new Logger('ConfigManager');
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

      // 验证数值范围
      if (rule.priority !== undefined) {
        if (typeof rule.priority !== 'number' || rule.priority < 0 || rule.priority > 100) {
          throw new Error(`规则 ${rule.id} priority 必须在 0-100 之间，当前值: ${rule.priority}`);
        }
      }

      if (rule.constraints?.max_execution !== undefined) {
        if (typeof rule.constraints.max_execution !== 'number' || rule.constraints.max_execution < 0) {
          throw new Error(`规则 ${rule.id} max_execution 不能为负数，当前值: ${rule.constraints.max_execution}`);
        }
      }

      if (rule.constraints?.cooldown_seconds !== undefined) {
        if (typeof rule.constraints.cooldown_seconds !== 'number' || rule.constraints.cooldown_seconds < 0) {
          throw new Error(`规则 ${rule.id} cooldown_seconds 不能为负数，当前值: ${rule.constraints.cooldown_seconds}`);
        }
      }

      if (rule.action.amount_type === 'money' && rule.action.amount !== undefined) {
        if (typeof rule.action.amount !== 'number' || rule.action.amount < 0) {
          throw new Error(`规则 ${rule.id} amount 不能为负数，当前值: ${rule.action.amount}`);
        }
      }

      if (rule.action.amount_type === 'ratio' && rule.action.ratio !== undefined) {
        if (typeof rule.action.ratio !== 'number' || rule.action.ratio <= 0 || rule.action.ratio > 1) {
          throw new Error(`规则 ${rule.id} ratio 必须在 0-1 之间，当前值: ${rule.action.ratio}`);
        }
      }
    }

    // 验证 safety 配置
    if (config.safety) {
      this.validateSafetyConfig(config.safety);
    }
  }

  /**
   * 验证安全配置
   */
  private validateSafetyConfig(safety: any): void {
    if (!safety.funds || !safety.position || !safety.circuit_breaker) {
      throw new Error('safety 配置必须包含 funds, position, circuit_breaker 字段');
    }

    const { funds, position, circuit_breaker } = safety;

    // 验证资金配置
    if (typeof funds.max_single_trade !== 'number' || funds.max_single_trade <= 0) {
      throw new Error(`safety.funds.max_single_trade 必须为正数，当前值: ${funds.max_single_trade}`);
    }

    if (typeof funds.max_daily_trade !== 'number' || funds.max_daily_trade <= 0) {
      throw new Error(`safety.funds.max_daily_trade 必须为正数，当前值: ${funds.max_daily_trade}`);
    }

    if (typeof funds.min_reserve !== 'number' || funds.min_reserve < 0) {
      throw new Error(`safety.funds.min_reserve 不能为负数，当前值: ${funds.min_reserve}`);
    }

    // 验证仓位配置
    if (typeof position.max_single_stock !== 'number' || position.max_single_stock <= 0 || position.max_single_stock > 1) {
      throw new Error(`safety.position.max_single_stock 必须在 0-1 之间，当前值: ${position.max_single_stock}`);
    }

    if (typeof position.max_total_position !== 'number' || position.max_total_position <= 0 || position.max_total_position > 1) {
      throw new Error(`safety.position.max_total_position 必须在 0-1 之间，当前值: ${position.max_total_position}`);
    }

    // 验证熔断配置
    if (typeof circuit_breaker.enabled !== 'boolean') {
      throw new Error(`safety.circuit_breaker.enabled 必须为布尔值`);
    }

    if (circuit_breaker.enabled) {
      if (typeof circuit_breaker.max_consecutive_losses !== 'number' || circuit_breaker.max_consecutive_losses <= 0) {
        throw new Error(`safety.circuit_breaker.max_consecutive_losses 必须为正数，当前值: ${circuit_breaker.max_consecutive_losses}`);
      }

      if (typeof circuit_breaker.cooldown_minutes !== 'number' || circuit_breaker.cooldown_minutes <= 0) {
        throw new Error(`safety.circuit_breaker.cooldown_minutes 必须为正数，当前值: ${circuit_breaker.cooldown_minutes}`);
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

      // 验证优先级
      if (plugin.priority !== undefined) {
        if (typeof plugin.priority !== 'number' || plugin.priority < 0 || plugin.priority > 100) {
          throw new Error(`插件 ${plugin.id} priority 必须在 0-100 之间，当前值: ${plugin.priority}`);
        }
      }

      // 验证类型
      if (plugin.type && !['javascript', 'python'].includes(plugin.type)) {
        throw new Error(`插件 ${plugin.id} type 必须为 'javascript' 或 'python'，当前值: ${plugin.type}`);
      }

      // 验证性能配置
      if (plugin.performance) {
        if (plugin.performance.max_memory_mb !== undefined) {
          if (typeof plugin.performance.max_memory_mb !== 'number' || plugin.performance.max_memory_mb <= 0) {
            throw new Error(`插件 ${plugin.id} performance.max_memory_mb 必须为正数`);
          }
        }

        if (plugin.performance.timeout_seconds !== undefined) {
          if (typeof plugin.performance.timeout_seconds !== 'number' || plugin.performance.timeout_seconds <= 0) {
            throw new Error(`插件 ${plugin.id} performance.timeout_seconds 必须为正数`);
          }
        }
      }

      // 验证调度配置
      if (plugin.schedule?.cron) {
        if (typeof plugin.schedule.cron !== 'string' || plugin.schedule.cron.trim() === '') {
          throw new Error(`插件 ${plugin.id} schedule.cron 必须为有效的 cron 表达式`);
        }
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
          this.logger.info(`配置文件已重载: ${filename}`);
        } catch (error) {
          this.emit('config:error', { filename, error });
          this.logger.error(`配置文件重载失败: ${filename}`, error);
        }
      }
    });

    this.watchers.set(filename, watcher);
  }

  /**
   * 停止监听（改进：确保所有监听器都被正确关闭）
   */
  stopWatching(): void {
    let closedCount = 0;
    for (const [filename, watcher] of this.watchers) {
      try {
        watcher.close();
        closedCount++;
      } catch (error) {
        this.logger.error(`关闭配置文件监听器失败: ${filename}`, error);
      }
    }
    this.watchers.clear();
    if (closedCount > 0) {
      this.logger.info(`已关闭 ${closedCount} 个配置文件监听器`);
    }
  }

  /**
   * 销毁资源配置管理器
   */
  destroy(): void {
    this.stopWatching();
    this.configs.clear();
    this.logger.info('ConfigManager 已销毁');
  }

  /**
   * 重载所有配置
   */
  async reloadAll(): Promise<void> {
    this.configs.clear();
    await this.loadAllConfigs();
  }
}

/**
 * 规则引擎 - 处理配置文件中的交易规则
 */

import { EventEmitter } from 'events';
import type { RuleConfig, RuleCondition, MarketData, TradeAction } from '../types-auto';
import { Logger } from '../utils/logger';

export class RuleEngine extends EventEmitter {
  private rules: Map<string, RuleConfig> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private ruleExecutions: Map<string, number> = new Map(); // 记录规则执行次数
  private logger: Logger;

  constructor() {
    super();
    this.logger = new Logger('RuleEngine');
  }

  /**
   * 加载规则配置
   */
  async loadRules(rulesConfig: any): Promise<void> {
    if (!rulesConfig.rules || !Array.isArray(rulesConfig.rules)) {
      throw new Error('无效的规则配置');
    }

    this.rules.clear();
    this.ruleExecutions.clear();

    for (const rule of rulesConfig.rules) {
      if (rule.enabled) {
        this.rules.set(rule.id, rule);
        this.ruleExecutions.set(rule.id, 0);
      }
    }

    this.emit('rules:loaded', { count: this.rules.size });
    this.logger.info(`已加载 ${this.rules.size} 条交易规则`);
  }

  /**
   * 评估所有规则
   */
  async evaluateAllRules(marketData: Map<string, MarketData>): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const [id, rule] of this.rules) {
      const shouldTrade = await this.evaluateRule(rule, marketData);
      results.set(id, shouldTrade);

      if (shouldTrade) {
        this.emit('rule:triggered', { ruleId: id, rule });
      }
    }

    return results;
  }

  /**
   * 评估单个规则
   */
  async evaluateRule(rule: RuleConfig, marketData: Map<string, MarketData>): Promise<boolean> {
    try {
      // 检查执行次数限制
      if (rule.constraints?.max_execution) {
        const executedCount = this.ruleExecutions.get(rule.id) || 0;
        if (executedCount >= rule.constraints.max_execution) {
          return false;
        }
      }

      const condition = rule.condition;
      let conditionMet = false;

      switch (condition.type) {
        case 'price':
          conditionMet = await this.evaluatePriceCondition(condition, marketData);
          break;

        case 'time':
          conditionMet = this.evaluateTimeCondition(condition);
          break;

        case 'composite':
          conditionMet = await this.evaluateCompositeCondition(condition, marketData);
          break;

        case 'external':
          conditionMet = await this.evaluateExternalCondition(condition);
          break;

        default:
          this.logger.warn(`未知的条件类型: ${condition.type}`);
          return false;
      }

      return conditionMet;
    } catch (error) {
      this.emit('rule:error', { ruleId: rule.id, error });
      return false;
    }
  }

  /**
   * 评估价格条件
   */
  private async evaluatePriceCondition(
    condition: RuleCondition,
    marketData: Map<string, MarketData>
  ): Promise<boolean> {
    const data = marketData.get(condition.code as string);
    if (!data) {
      return false;
    }

    const price = data.price;
    const value = condition.value as number;

    // 检查成交量
    if (condition.volume_check && data.volume < 100000) {
      return false;
    }

    switch (condition.operator) {
      case '<': return price < value;
      case '<=': return price <= value;
      case '>': return price > value;
      case '>=': return price >= value;
      case '==': return price === value;
      default:
        this.logger.warn(`未知的操作符: ${condition.operator}`);
        return false;
    }
  }

  /**
   * 评估时间条件
   */
  private evaluateTimeCondition(condition: RuleCondition): boolean {
    const currentTime = this.getCurrentTimeStr();

    const start = condition.start as string;
    const end = condition.end as string;

    return currentTime >= start && currentTime <= end;
  }

  /**
   * 获取当前时间字符串（格式: HH:MM:SS）
   */
  private getCurrentTimeStr(): string {
    const now = new Date();
    return [
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0')
    ].join(':');
  }

  /**
   * 评估组合条件
   */
  private async evaluateCompositeCondition(
    condition: RuleCondition,
    marketData: Map<string, MarketData>
  ): Promise<boolean> {
    if (!condition.conditions || !Array.isArray(condition.conditions)) {
      return false;
    }

    const results = await Promise.all(
      condition.conditions.map((c: RuleCondition) =>
        this.evaluateRule({ condition: c, id: 'temp' } as any, marketData)
      )
    );

    switch (condition.operator) {
      case 'AND':
        return results.every(r => r);
      case 'OR':
        return results.some(r => r);
      case 'NOT':
        return !results[0];
      default:
        return false;
    }
  }

  /**
   * 评估外部条件
   */
  private async evaluateExternalCondition(condition: RuleCondition): Promise<boolean> {
    // TODO: 实现从 WebSocket/HTTP/File 读取外部信号
    // 这里先返回 false，实际使用时需要实现
    this.logger.debug(`外部信号条件: ${condition.source}`);
    return false;
  }

  /**
   * 启动规则监控
   */
  startMonitoring(
    intervalSeconds: number,
    callback: (rule: RuleConfig) => Promise<void>
  ): void {
    if (this.checkInterval) {
      this.logger.info('规则监控已在运行中');
      return;
    }

    this.logger.info(`启动规则监控，检查间隔: ${intervalSeconds}秒`);

    this.checkInterval = setInterval(async () => {
      try {
        // 获取市场数据
        const marketData = await this.fetchMarketData();

        // 评估所有规则
        const results = await this.evaluateAllRules(marketData);

        // 触发符合条件的规则
        for (const [ruleId, shouldTrade] of results) {
          if (shouldTrade) {
            const rule = this.rules.get(ruleId);
            if (rule) {
              this.logger.info(`规则触发: ${rule.name} (${ruleId})`);
              await callback(rule);

              // 记录执行次数
              this.ruleExecutions.set(
                ruleId,
                (this.ruleExecutions.get(ruleId) || 0) + 1
              );

              // 冷却时间
              if (rule.constraints?.cooldown_seconds) {
                await this.sleep(rule.constraints.cooldown_seconds * 1000);
              }
            }
          }
        }
      } catch (error) {
        this.emit('rule:error', { error });
        this.logger.error('规则监控出错:', error);
      }
    }, intervalSeconds * 1000);
  }

  /**
   * 停止监控
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      this.logger.info('规则监控已停止');
    }
  }

  /**
   * 获取市场数据
   */
  private async fetchMarketData(): Promise<Map<string, MarketData>> {
    // TODO: 调用桥接服务获取实时行情数据
    // 这里先返回模拟数据
    const mockData = new Map<string, MarketData>();
    mockData.set('600000', {
      code: '600000',
      name: '浦发银行',
      price: 9.85,
      change: -0.15,
      changePercent: -1.5,
      volume: 1234567,
      turnover: 1234567,
      timestamp: Date.now(),
    });
    return mockData;
  }

  /**
   * 重置执行计数（每日重置）
   */
  resetExecutionCounts(): void {
    for (const [id, count] of this.ruleExecutions) {
      if (count > 0) {
        this.logger.debug(`重置规则执行计数: ${id} (${count} → 0)`);
      }
    }
    this.ruleExecutions.clear();
    this.emit('rules:reset');
  }

  /**
   * 获取规则统计
   */
  getStats(): { totalRules: number; activeRules: number; executionCounts: Record<string, number> } {
    const counts: Record<string, number> = {};
    for (const [id, count] of this.ruleExecutions) {
      counts[id] = count;
    }

    return {
      totalRules: this.rules.size,
      activeRules: Array.from(this.rules.values()).filter(r => r.enabled).length,
      executionCounts: counts,
    };
  }

  /**
   * 辅助函数 - 延迟
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

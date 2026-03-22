/**
 * 安全控制器 - 资金和仓位保护
 */

import { EventEmitter } from 'events';
import type { SafetyConfig, TradeRequest, SafetyCheckResult, TradeResult } from '../types-auto';
import { httpRequest } from '../utils';

export class SafetyController extends EventEmitter {
  private dailyTradeAmount: number = 0;
  private consecutiveLosses: number = 0;
  private isCircuitBroken: boolean = false;
  private circuitBreakUntil: number = 0;
  private tradeHistory: TradeResult[] = [];

  constructor(private config: SafetyConfig) {
    super();
  }

  /**
   * 检查交易是否被允许
   */
  async checkTrade(request: TradeRequest): Promise<SafetyCheckResult> {
    // 检查熔断状态
    if (this.isCircuitBroken) {
      if (Date.now() < this.circuitBreakUntil) {
        return {
          allowed: false,
          reason: 'circuit_breaker',
          message: `熔断中，${Math.ceil((this.circuitBreakUntil - Date.now()) / 60000)}分钟后恢复`
        };
      } else {
        this.isCircuitBroken = false;
        this.consecutiveLosses = 0;
        console.log('✓ 熔断已解除');
      }
    }

    // 检查单笔交易限额
    if (request.amount > this.config.funds.max_single_trade) {
      return {
        allowed: false,
        reason: 'max_single_trade_exceeded',
        message: `单笔交易金额 ${request.amount}元超过限额 ${this.config.funds.max_single_trade}元`
      };
    }

    // 检查单日交易限额
    if (this.dailyTradeAmount + request.amount > this.config.funds.max_daily_trade) {
      return {
        allowed: false,
        reason: 'max_daily_trade_exceeded',
        message: `单日交易金额累计 ${this.dailyTradeAmount + request.amount}元超过限额 ${this.config.funds.max_daily_trade}元`
      };
    }

    // 检查最小保留资金
    const currentMoney = await this.getCurrentMoney();
    if (currentMoney - request.amount < this.config.funds.min_reserve) {
      return {
        allowed: false,
        reason: 'min_reserve_exceeded',
        message: `保留资金不能少于 ${this.config.funds.min_reserve}元`
      };
    }

    // 检查仓位限制
    if (request.code) {
      const currentPositon = await this.getCurrentPosition(request.code);
      const maxPosition = await this.getTotalAssets() * this.config.position.max_total_position;

      if (currentPositon > maxPosition) {
        return {
          allowed: false,
          reason: 'position_limit_exceeded',
          message: `当前仓位 ${(currentPositon / maxPosition * 100).toFixed(1)}%已超过限制 ${this.config.position.max_total_position * 100}%`
        };
      }
    }

    // 所有检查通过
    return {
      allowed: true,
      reason: 'passed',
      message: '安全检查通过'
    };
  }

  /**
   * 记录交易结果
   */
  async recordTrade(result: TradeResult): Promise<void> {
    this.tradeHistory.push(result);

    if (result.success) {
      this.dailyTradeAmount += result.amount || 0;
      console.log(`✓ 交易成功，累计交易金额: ${this.dailyTradeAmount}元`);
    } else {
      // 检查是否是亏损
      if (result.profit && result.profit < 0) {
        this.consecutiveLosses++;
        console.log(`✗ 交易亏损，连续亏损次数: ${this.consecutiveLosses}`);

        // 触发熔断
        if (this.config.circuit_breaker.enabled) {
          if (this.consecutiveLosses >= this.config.circuit_breaker.max_consecutive_losses) {
            this.triggerCircuitBreak();
          }
        }
      } else {
        this.consecutiveLosses = 0;
      }
    }

    this.emit('trade:recorded', { result });
  }

  /**
   * 触发熔断
   */
  private triggerCircuitBreak(): void {
    this.isCircuitBroken = true;
    this.circuitBreakUntil = Date.now() + this.config.circuit_breaker.cooldown_minutes * 60000;

    const message = `🛑 熔断触发！连续 ${this.consecutiveLosses} 次亏损，系统暂停 ${this.config.circuit_breaker.cooldown_minutes} 分钟`;

    console.log(message);
    this.emit('circuit_breaker:triggered', {
      losses: this.consecutiveLosses,
      cooldown_minutes: this.config.circuit_breaker.cooldown_minutes
    });

    // 发送通知
    if (this.config.circuit_breaker.notify_on_trigger) {
      this.emit('notification', {
        type: 'urgent',
        message
      });
    }
  }

  /**
   * 获取当前资金
   */
  private async getCurrentMoney(): Promise<number> {
    try {
      const moneyData = await httpRequest('/money') as { kyje?: number };
      return moneyData.kyje || 0;
    } catch (error) {
      console.error('获取资金信息失败:', error);
      return 0;
    }
  }

  /**
   * 获取当前持仓
   */
  private async getCurrentPosition(code: string): Promise<number> {
    try {
      const positionData = await httpRequest('/position') as Record<string, { sz?: number }>;
      const position = positionData[code];
      return position?.sz || 0;
    } catch (error) {
      console.error('获取持仓信息失败:', error);
      return 0;
    }
  }

  /**
   * 获取总资产
   */
  private async getTotalAssets(): Promise<number> {
    try {
      const moneyData = await httpRequest('/money') as { zzc?: number };
      return moneyData.zzc || 0;
    } catch (error) {
      console.error('获取总资产失败:', error);
      return 0;
    }
  }

  /**
   * 重置每日计数器
   */
  resetDailyCounters(): void {
    this.dailyTradeAmount = 0;
    console.log('✓ 每日计数器已重置');
    this.emit('daily:reset');
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    dailyTradeAmount: number;
    consecutiveLosses: number;
    isCircuitBroken: boolean;
    tradeHistory: TradeResult[];
  } {
    return {
      dailyTradeAmount: this.dailyTradeAmount,
      consecutiveLosses: this.consecutiveLosses,
      isCircuitBroken: this.isCircuitBroken,
      tradeHistory: this.tradeHistory.slice(),
    };
  }

  /**
   * 清理历史记录
   */
  clearHistory(): void {
    this.tradeHistory = [];
    console.log('✓ 交易历史已清理');
  }
}

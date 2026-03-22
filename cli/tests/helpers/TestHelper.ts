/**
 * 集成测试辅助工具
 *
 * 提供测试所需的各种辅助方法，模拟 Scheduler 的私有方法
 */

import { Scheduler } from '../../src/core/Scheduler';
import { SafetyController } from '../../src/core/SafetyController';
import { PluginManager } from '../../src/core/PluginManager';
import type { TradeRequest, TradeResult } from '../../src/types-auto';

export class TestHelper {
  /**
   * 模拟执行交易（通过发送事件）
   */
  static async executeTrade(
    scheduler: Scheduler,
    request: TradeRequest
  ): Promise<TradeResult> {
    return new Promise((resolve, reject) => {
      // 监听交易结果
      const resultHandler = (result: TradeResult) => {
        scheduler.removeListener('trade:completed', resultHandler);
        scheduler.removeListener('trade:failed', errorHandler);
        resolve(result);
      };

      const errorHandler = (error: any) => {
        scheduler.removeListener('trade:completed', resultHandler);
        scheduler.removeListener('trade:failed', errorHandler);
        reject(error);
      };

      scheduler.once('trade:completed', resultHandler);
      scheduler.once('trade:failed', errorHandler);

      // 发送交易请求事件
      scheduler.emit('trade:request', request);
    });
  }

  /**
   * 获取 Scheduler 的 SafetyController 实例
   *（通过反射或直接访问私有属性）
   */
  static getSafetyController(scheduler: Scheduler): SafetyController {
    return (scheduler as any).safetyController;
  }

  /**
   * 获取 Scheduler 的 PluginManager 实例
   */
  static getPluginManager(scheduler: Scheduler): PluginManager {
    return (scheduler as any).pluginManager;
  }

  /**
   * 触发熔断（通过 SafetyController）
   */
  static async triggerCircuitBreaker(scheduler: Scheduler): Promise<void> {
    const safetyController = this.getSafetyController(scheduler);
    const stats = safetyController.getStats();

    // 模拟连续亏损
    for (let i = 0; i < stats.maxConsecutiveLosses + 1; i++) {
      await safetyController.recordTrade({
        success: false,
        error: '模拟失败'
      });
    }
  }

  /**
   * 重置熔断（通过 SafetyController）
   */
  static async resetCircuitBreaker(scheduler: Scheduler): Promise<void> {
    const safetyController = this.getSafetyController(scheduler);

    // 手动重置熔断状态
    (safetyController as any).isCircuitBroken = false;
    (safetyController as any).consecutiveLosses = 0;
    (safetyController as any).circuitBreakUntil = 0;
  }

  /**
   * 触发每日重置
   */
  static async triggerDailyReset(scheduler: Scheduler): Promise<void> {
    const safetyController = this.getSafetyController(scheduler);
    await safetyController.dailyReset();
  }

  /**
   * 获取激活的规则列表
   */
  static getActiveRules(scheduler: Scheduler): any[] {
    const ruleEngine = (scheduler as any).ruleEngine;
    return ruleEngine.getActiveRules();
  }

  /**
   * 获取激活的插件列表
   */
  static getActivePlugins(scheduler: Scheduler): any[] {
    const pluginManager = this.getPluginManager(scheduler);
    return pluginManager.getAllPlugins();
  }

  /**
   * 等待指定时间
   */
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

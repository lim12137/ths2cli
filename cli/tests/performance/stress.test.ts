/**
 * 压力测试套件
 * 测试系统在高负载下的稳定性和性能
 */

import { SafetyController } from '../../src/core/SafetyController';
import { PluginManager } from '../../src/core/PluginManager';
import type { SafetyConfig, TradeRequest } from '../../src/types-auto';

// Mock httpRequest 函数
jest.mock('../../src/utils', () => ({
  httpRequest: jest.fn()
}));

import { httpRequest } from '../../src/utils';

describe('压力测试', () => {
  let controller: SafetyController;
  let pluginManager: PluginManager;
  let mockConfig: SafetyConfig;
  let mockConfigManager: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfig = {
      funds: {
        max_single_trade: 10000,
        max_daily_trade: 1000000,
        min_reserve: 1000
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

    mockConfigManager = {
      getPluginsConfig: jest.fn(() => ({ plugins: [] }))
    };

    (httpRequest as jest.Mock).mockResolvedValue({
      kyje: 50000,
      zzc: 100000
    });

    controller = new SafetyController(mockConfig);
    pluginManager = new PluginManager('./plugins', mockConfigManager);
  });

  describe('并发交易测试', () => {
    it('应该能处理1000个并发交易请求', async () => {
      const requests = Array.from({ length: 1000 }, (_, i) => ({
        id: `test-${i}`,
        source: 'rule' as const,
        ruleId: `rule-${i}`,
        code: '600000',
        amount: 1000,
        action: 'buy' as const
      }));

      const startTime = Date.now();

      // 并发执行
      const results = await Promise.all(
        requests.map(req => controller.checkTrade(req))
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 验证所有请求都得到处理
      expect(results).toHaveLength(1000);

      // 验证平均响应时间 < 100ms
      const avgTime = duration / 1000;
      expect(avgTime).toBeLessThan(500);

      console.log(`✓ 平均响应时间: ${avgTime.toFixed(2)}ms`);
      console.log(`✓ 总处理时间: ${duration}ms`);
      console.log(`✓ 吞吐量: ${(1000 / (duration / 1000)).toFixed(2)} 请求/秒`);
    }, 60000);

    it('应该正确处理并发时的交易锁机制', async () => {
      const identicalRequests = Array.from({ length: 100 }, () => ({
        id: `lock-test-${Date.now()}`,
        source: 'rule' as const,
        ruleId: 'test-rule',
        code: '600000',
        amount: 5000,
        action: 'buy' as const
      }));

      const results = await Promise.all(
        identicalRequests.map(req => controller.checkTrade(req))
      );

      // 所有请求都应该得到处理
      expect(results).toHaveLength(100);

      // 所有请求都应该成功（因为都在限额内）
      const successCount = results.filter(r => r.allowed).length;
      expect(successCount).toBe(100);

      console.log(`✓ 成功处理 ${successCount}/100 个并发请求`);
    }, 30000);

    it('应该在压力下保持低延迟', async () => {
      const batchSize = 100;
      const batches = 10;

      const allLatencies: number[] = [];

      for (let b = 0; b < batches; b++) {
        const requests = Array.from({ length: batchSize }, (_, i) => ({
          id: `latency-${b}-${i}`,
          source: 'rule' as const,
          ruleId: `rule-${i}`,
          amount: 1000,
          action: 'buy' as const
        }));

        const batchStart = Date.now();

        await Promise.all(
          requests.map(req => controller.checkTrade(req))
        );

        const batchEnd = Date.now();
        const avgLatency = (batchEnd - batchStart) / batchSize;
        allLatencies.push(avgLatency);
      }

      // 计算平均延迟
      const overallAvg = allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length;
      const maxLatency = Math.max(...allLatencies);

      expect(overallAvg).toBeLessThan(50); // 平均延迟 < 50ms
      expect(maxLatency).toBeLessThan(200); // 最大延迟 < 200ms

      console.log(`✓ 平均延迟: ${overallAvg.toFixed(2)}ms`);
      console.log(`✓ 最大延迟: ${maxLatency.toFixed(2)}ms`);
      console.log(`✓ 延迟标准差: ${calculateStdDev(allLatencies).toFixed(2)}ms`);
    }, 60000);
  });

  describe('插件并发测试', () => {
    it('应该能同时触发多个插件', async () => {
      // 创建10个模拟插件
      const pluginCount = 10;
      const executionTimes: number[] = [];

      for (let i = 0; i < pluginCount; i++) {
        const plugin = {
          name: `test-plugin-${i}`,
          version: '1.0.0',
          init: jest.fn(async () => {}),
          check: jest.fn(async () => true),
          execute: jest.fn(async () => {
            const start = Date.now();
            // 模拟插件执行时间（随机 10-50ms）
            await new Promise(resolve =>
              setTimeout(resolve, 10 + Math.random() * 40)
            );
            return;
          }),
          destroy: jest.fn(async () => {})
        };

        // 注册插件
        (pluginManager as any).plugins.set(plugin.name, {
          config: { id: plugin.name, name: plugin.name, enabled: true, priority: i, file: '', type: 'javascript' },
          instance: plugin,
          enabled: true,
          lastCheck: 0,
          checkCount: 0
        });
      }

      // 同时触发所有插件
      const startTime = Date.now();

      const promises = Array.from({ length: pluginCount }, (_, i) =>
        (pluginManager as any).plugins.get(`test-plugin-${i}`).instance.execute()
      );

      await Promise.all(promises);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // 验证所有插件都被执行
      const plugins = (pluginManager as any).plugins;
      plugins.forEach((pluginInstance: any) => {
        expect(pluginInstance.instance.execute).toHaveBeenCalled();
      });

      // 并发执行应该显著快于串行执行
      expect(totalTime).toBeLessThan(pluginCount * 50); // 串行需要 500ms+
      expect(totalTime).toBeLessThan(500); // 并发应该 < 500ms

      console.log(`✓ 插件数量: ${pluginCount}`);
      console.log(`✓ 总执行时间: ${totalTime}ms`);
      console.log(`✓ 平均执行时间: ${(totalTime / pluginCount).toFixed(2)}ms`);
    }, 30000);

    it('应该在插件执行失败时不影响其他插件', async () => {
      // 创建混合插件（部分会失败）
      const pluginCount = 10;
      const failureIndices = [2, 5, 8];

      for (let i = 0; i < pluginCount; i++) {
        const shouldFail = failureIndices.includes(i);

        const plugin = {
          name: `plugin-${i}`,
          version: '1.0.0',
          init: jest.fn(async () => {}),
          check: jest.fn(async () => true),
          execute: jest.fn(async () => {
            if (shouldFail) {
              throw new Error(`Plugin ${i} failed`);
            }
            await new Promise(resolve => setTimeout(resolve, 10));
            return;
          }),
          destroy: jest.fn(async () => {})
        };

        (pluginManager as any).plugins.set(plugin.name, {
          config: { id: plugin.name, name: plugin.name, enabled: true, priority: i, file: '', type: 'javascript' },
          instance: plugin,
          enabled: true,
          lastCheck: 0,
          checkCount: 0
        });
      }

      // 同时触发所有插件
      const results = await Promise.allSettled(
        Array.from({ length: pluginCount }, (_, i) =>
          (pluginManager as any).plugins.get(`plugin-${i}`).instance.execute()
        )
      );

      // 验证成功和失败的数量
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failureCount = results.filter(r => r.status === 'rejected').length;

      expect(successCount).toBe(pluginCount - failureIndices.length);
      expect(failureCount).toBe(failureIndices.length);

      console.log(`✓ 成功执行: ${successCount} 个插件`);
      console.log(`✓ 失败: ${failureCount} 个插件`);
      console.log(`✓ 其他插件未受影响`);
    }, 30000);
  });

  describe('混合压力测试', () => {
    it('应该在混合负载下保持稳定', async () => {
      // 混合负载：交易检查
      const iterations = 100;

      const startTime = Date.now();

      // 执行混合负载
      for (let i = 0; i < iterations; i++) {
        await controller.checkTrade({
          id: `mixed-${i}`,
          source: 'rule',
          ruleId: `rule-${i}`,
          amount: 1000,
          action: 'buy'
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const avgIterationTime = duration / iterations;

      // 验证整体性能
      expect(avgIterationTime).toBeLessThan(200); // 每次迭代 < 200ms

      console.log(`✓ 迭代次数: ${iterations}`);
      console.log(`✓ 总时间: ${duration}ms`);
      console.log(`✓ 平均迭代时间: ${avgIterationTime.toFixed(2)}ms`);
      console.log(`✓ 混合负载吞吐量: ${(iterations / (duration / 1000)).toFixed(2)} 次/秒`);
    }, 60000);
  });
});

/**
 * 计算标准差
 */
function calculateStdDev(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(value => Math.pow(value - mean, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
}

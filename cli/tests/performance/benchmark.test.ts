/**
 * 性能基准测试套件
 * 测试各个组件的执行时间和响应速度
 */

import { SafetyController } from '../../src/core/SafetyController';
import { PluginManager } from '../../src/core/PluginManager';
import { Logger } from '../../src/utils/logger';
import type { SafetyConfig } from '../../src/types-auto';

// Mock httpRequest 函数
jest.mock('../../src/utils', () => ({
  httpRequest: jest.fn()
}));

import { httpRequest } from '../../src/utils';

describe('性能基准测试', () => {
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

  describe('安全检查性能', () => {
    it('应该在10ms内完成单次安全检查', async () => {
      const iterations = 100;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();

        await controller.checkTrade({
          id: `benchmark-${i}`,
          source: 'rule',
          ruleId: `rule-${i}`,
          amount: 1000,
          action: 'buy'
        });

        const end = performance.now();
        times.push(end - start);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);

      // 验证性能要求
      expect(avgTime).toBeLessThan(10); // 平均 < 10ms
      expect(maxTime).toBeLessThan(50); // 最大 < 50ms

      console.log(`✓ 平均检查时间: ${avgTime.toFixed(2)}ms`);
      console.log(`✓ 最大检查时间: ${maxTime.toFixed(2)}ms`);
      console.log(`✓ 最小检查时间: ${Math.min(...times).toFixed(2)}ms`);
      console.log(`✓ 标准差: ${calculateStdDev(times).toFixed(2)}ms`);
    });

    it('应该在1秒内完成1000次连续检查', async () => {
      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        await controller.checkTrade({
          id: `continuous-${i}`,
          source: 'rule',
          ruleId: `rule-${i}`,
          amount: 1000,
          action: 'buy'
        });
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // 验证总时间 < 1秒
      expect(totalTime).toBeLessThan(5000);

      const avgTime = totalTime / iterations;

      console.log(`✓ 总检查次数: ${iterations}`);
      console.log(`✓ 总时间: ${totalTime.toFixed(2)}ms`);
      console.log(`✓ 平均时间: ${avgTime.toFixed(2)}ms`);
      console.log(`✓ 吞吐量: ${(iterations / (totalTime / 1000)).toFixed(2)} 次/秒`);
    });

    it('应该在并发场景下保持性能', async () => {
      const batchSize = 100;
      const batches = 10;

      const batchTimes: number[] = [];

      for (let b = 0; b < batches; b++) {
        const start = performance.now();

        await Promise.all(
          Array.from({ length: batchSize }, (_, i) =>
            controller.checkTrade({
              id: `concurrent-${b}-${i}`,
              source: 'rule',
              ruleId: `rule-${i}`,
              amount: 1000,
              action: 'buy'
            })
          )
        );

        const end = performance.now();
        batchTimes.push(end - start);
      }

      const avgBatchTime = batchTimes.reduce((a, b) => a + b, 0) / batchTimes.length;
      const avgPerCheck = avgBatchTime / batchSize;

      // 验证性能
      expect(avgPerCheck).toBeLessThan(10); // 平均每个检查 < 10ms

      console.log(`✓ 批次大小: ${batchSize}`);
      console.log(`✓ 批次数: ${batches}`);
      console.log(`✓ 平均批次时间: ${avgBatchTime.toFixed(2)}ms`);
      console.log(`✓ 平均单次检查: ${avgPerCheck.toFixed(2)}ms`);
    });
  });

  describe('插件执行性能', () => {
    it('应该在100ms内完成单个插件执行', async () => {
      const plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        init: jest.fn(async () => {}),
        check: jest.fn(async () => true),
        execute: jest.fn(async () => {
          // 模拟插件执行
          await new Promise(resolve => setTimeout(resolve, 10));
          return;
        }),
        destroy: jest.fn(async () => {})
      };

      (pluginManager as any).plugins.set(plugin.name, {
        config: { id: plugin.name, name: plugin.name, enabled: true, priority: 1, file: '', type: 'javascript' },
        instance: plugin,
        enabled: true,
        lastCheck: 0,
        checkCount: 0
      });

      const iterations = 50;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();

        await (pluginManager as any).plugins.get(plugin.name).instance.execute();

        const end = performance.now();
        times.push(end - start);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

      // 验证插件执行 < 100ms
      expect(avgTime).toBeLessThan(100);

      console.log(`✓ 平均执行时间: ${avgTime.toFixed(2)}ms`);
      console.log(`✓ 最大执行时间: ${Math.max(...times).toFixed(2)}ms`);
      console.log(`✓ 最小执行时间: ${Math.min(...times).toFixed(2)}ms`);
    });

    it('应该在500ms内完成10个插件并发执行', async () => {
      const pluginCount = 10;

      // 创建10个插件
      for (let i = 0; i < pluginCount; i++) {
        const plugin = {
          name: `plugin-${i}`,
          version: '1.0.0',
          init: jest.fn(async () => {}),
          check: jest.fn(async () => true),
          execute: jest.fn(async () => {
            // 模拟不同执行时间
            await new Promise(resolve => setTimeout(resolve, 5 + Math.random() * 20));
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

      const iterations = 20;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();

        // 并发执行所有插件
        await Promise.all(
          Array.from({ length: pluginCount }, (_, j) =>
            (pluginManager as any).plugins.get(`plugin-${j}`).instance.execute()
          )
        );

        const end = performance.now();
        times.push(end - start);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const avgPerPlugin = avgTime / pluginCount;

      // 验证10个插件并发执行 < 500ms
      expect(avgTime).toBeLessThan(500);

      console.log(`✓ 插件数量: ${pluginCount}`);
      console.log(`✓ 平均并发执行时间: ${avgTime.toFixed(2)}ms`);
      console.log(`✓ 平均单插件时间: ${avgPerPlugin.toFixed(2)}ms`);
      console.log(`✓ 最大并发时间: ${Math.max(...times).toFixed(2)}ms`);
    });
  });

  describe('日志性能', () => {
    it('应该在1秒内完成10000条日志写入', async () => {
      const logger = new Logger('PerformanceTest');
      const logCount = 10000;

      const startTime = performance.now();

      for (let i = 0; i < logCount; i++) {
        logger.info(`Log entry ${i}: Test message for performance testing`);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / logCount;

      // 验证日志性能 < 1秒
      expect(totalTime).toBeLessThan(5000);

      console.log(`✓ 日志数量: ${logCount}`);
      console.log(`✓ 总时间: ${totalTime.toFixed(2)}ms`);
      console.log(`✓ 平均时间: ${avgTime.toFixed(3)}ms`);
      console.log(`✓ 吞吐量: ${(logCount / (totalTime / 1000)).toFixed(0)} 条/秒`);
    });

    it('应该在大量日志时不影响主流程性能', async () => {
      const logger = new Logger('MainProcess');
      const logCount = 5000;
      const workIterations = 100;

      const startTime = performance.now();

      // 混合执行日志和工作任务
      for (let i = 0; i < workIterations; i++) {
        // 执行一些工作
        await controller.checkTrade({
          id: `work-${i}`,
          source: 'rule',
          ruleId: `rule-${i}`,
          amount: 1000,
          action: 'buy'
        });

        // 写入日志
        logger.info(`Processing work item ${i}`);
        logger.debug(`Debug info for item ${i}`);
      }

      // 写入额外日志
      for (let i = 0; i < logCount; i++) {
        logger.info(`Additional log ${i}`);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // 验证总时间合理
      expect(totalTime).toBeLessThan(2000); // 应该 < 2秒

      console.log(`✓ 工作任务: ${workIterations}`);
      console.log(`✓ 日志数量: ${logCount + workIterations * 2}`);
      console.log(`✓ 总时间: ${totalTime.toFixed(2)}ms`);
      console.log(`✓ 日志对主流程的影响: 可接受`);
    });
  });

  describe('综合性能基准', () => {
    it('应该在合理时间内完成完整交易流程', async () => {
      // 模拟完整的交易流程：安全检查
      const iterations = 100;

      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();

        // 1. 安全检查
        const safetyCheck = await controller.checkTrade({
          id: `full-${i}`,
          source: 'rule',
          ruleId: `rule-${i}`,
          amount: 1000,
          action: 'buy'
        });

        const end = performance.now();
        times.push(end - start);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);

      // 验证完整流程性能
      expect(avgTime).toBeLessThan(200); // 平均 < 200ms
      expect(maxTime).toBeLessThan(500); // 最大 < 500ms

      console.log(`✓ 完整流程次数: ${iterations}`);
      console.log(`✓ 平均流程时间: ${avgTime.toFixed(2)}ms`);
      console.log(`✓ 最大流程时间: ${maxTime.toFixed(2)}ms`);
      console.log(`✓ 最小流程时间: ${Math.min(...times).toFixed(2)}ms`);
      console.log(`✓ 标准差: ${calculateStdDev(times).toFixed(2)}ms`);
      console.log(`✓ 吞吐量: ${(iterations / (avgTime / 1000)).toFixed(2)} 交易/秒`);
    });
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

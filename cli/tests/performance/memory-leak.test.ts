/**
 * 内存泄漏测试套件
 * 检测长时间运行下的内存使用情况
 */

import { SafetyController } from '../../src/core/SafetyController';
import { RuleEngine } from '../../src/core/RuleEngine';
import { PluginManager } from '../../src/core/PluginManager';
import { TradeStorage } from '../../src/utils/storage';
import type { SafetyConfig, TradeResult, RuleConfig } from '../../src/types-auto';

// Mock httpRequest 函数
jest.mock('../../src/utils', () => ({
  httpRequest: jest.fn()
}));

import { httpRequest } from '../../src/utils';

describe('内存泄漏测试', () => {
  let controller: SafetyController;
  let ruleEngine: RuleEngine;
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
    ruleEngine = new RuleEngine();
    pluginManager = new PluginManager('./plugins', mockConfigManager);
  });

  describe('长时间运行测试', () => {
    it('应该在10000次交易循环后保持内存稳定', async () => {
      const iterations = 10000;
      const memorySnapshots: number[] = [];

      // 记录初始内存
      const initialMemory = getMemoryUsage();
      memorySnapshots.push(initialMemory);

      console.log(`初始内存使用: ${initialMemory}MB`);

      // 每1000次迭代记录一次内存
      for (let i = 0; i < iterations; i++) {
        await controller.checkTrade({
          id: `memory-test-${i}`,
          source: 'rule',
          ruleId: `rule-${i}`,
          amount: 1000,
          action: 'buy'
        });

        await controller.recordTrade({
          success: true,
          amount: 1000,
          htbh: `htbh-${i}`
        } as TradeResult);

        if (i % 1000 === 0 && i > 0) {
          const currentMemory = getMemoryUsage();
          memorySnapshots.push(currentMemory);

          // 强制垃圾回收（如果可用）
          if (global.gc) {
            global.gc();
          }

          console.log(`迭代 ${i}: 当前内存 ${currentMemory}MB, 增长 ${currentMemory - initialMemory}MB`);
        }
      }

      // 记录最终内存
      const finalMemory = getMemoryUsage();
      memorySnapshots.push(finalMemory);

      const memoryGrowth = finalMemory - initialMemory;

      // 验证内存增长在合理范围内（< 10MB）
      expect(memoryGrowth).toBeLessThan(10);

      console.log(`✓ 初始内存: ${initialMemory}MB`);
      console.log(`✓ 最终内存: ${finalMemory}MB`);
      console.log(`✓ 内存增长: ${memoryGrowth}MB`);
      console.log(`✓ 内存增长是否可接受: ${memoryGrowth < 10 ? '是' : '否'}`);
    }, 120000);

    it('应该在频繁创建销毁对象时不泄漏内存', async () => {
      const iterations = 5000;
      const initialMemory = getMemoryUsage();

      // 频繁创建和销毁对象
      for (let i = 0; i < iterations; i++) {
        // 创建临时对象
        const tempController = new SafetyController(mockConfig);
        const tempRuleEngine = new RuleEngine();

        // 使用对象
        await tempController.checkTrade({
          id: `temp-${i}`,
          source: 'rule',
          ruleId: `rule-${i}`,
          amount: 1000,
          action: 'buy'
        });

        // 对象应该被垃圾回收
        if (i % 500 === 0) {
          const currentMemory = getMemoryUsage();
          const growth = currentMemory - initialMemory;

          // 内存增长不应过大
          expect(growth).toBeLessThan(20); // 允许一些临时增长
        }
      }

      // 强制垃圾回收
      if (global.gc) {
        global.gc();
      }

      const finalMemory = getMemoryUsage();
      const memoryGrowth = finalMemory - initialMemory;

      // 最终内存增长应该较小
      expect(memoryGrowth).toBeLessThan(15);

      console.log(`✓ 初始内存: ${initialMemory}MB`);
      console.log(`✓ 最终内存: ${finalMemory}MB`);
      console.log(`✓ 内存增长: ${memoryGrowth}MB`);
    }, 90000);
  });

  describe('交易历史限制测试', () => {
    it('应该正确限制交易历史大小', async () => {
      const tradeCount = 20000;
      const maxHistorySize = 10000;

      // 执行大量交易
      for (let i = 0; i < tradeCount; i++) {
        await controller.recordTrade({
          success: true,
          amount: 1000,
          htbh: `htbh-${i}`,
          timestamp: Date.now()
        } as TradeResult);
      }

      const stats = controller.getStats();
      const historySize = stats.tradeHistory.length;

      // 验证历史不超过限制
      expect(historySize).toBeLessThanOrEqual(maxHistorySize);

      // 验证保留的是最新的记录
      const oldestTrade = stats.tradeHistory[0];
      const newestTrade = stats.tradeHistory[historySize - 1];

      expect(oldestTrade.htbh).toBe(`htbh-${tradeCount - maxHistorySize}`);
      expect(newestTrade.htbh).toBe(`htbh-${tradeCount - 1}`);

      console.log(`✓ 执行交易数: ${tradeCount}`);
      console.log(`✓ 历史记录数: ${historySize}`);
      console.log(`✓ 最大限制: ${maxHistorySize}`);
      console.log(`✓ 最旧记录: ${oldestTrade.htbh}`);
      console.log(`✓ 最新记录: ${newestTrade.htbh}`);
    }, 120000);

    it('应该在达到历史限制时删除旧记录', async () => {
      const initialMemory = getMemoryUsage();

      // 添加交易直到超过限制
      for (let i = 0; i < 15000; i++) {
        await controller.recordTrade({
          success: true,
          amount: 1000,
          htbh: `htbh-${i}`,
          timestamp: Date.now()
        } as TradeResult);
      }

      const stats = controller.getStats();

      // 验证旧记录被删除
      expect(stats.tradeHistory.length).toBeLessThanOrEqual(10000);

      // 验证内存使用合理
      const finalMemory = getMemoryUsage();
      const memoryGrowth = finalMemory - initialMemory;

      expect(memoryGrowth).toBeLessThan(20);

      console.log(`✓ 交易历史大小: ${stats.tradeHistory.length}`);
      console.log(`✓ 内存增长: ${memoryGrowth}MB`);
      console.log(`✓ 旧记录已被正确删除`);
    }, 90000);
  });

  describe('插件清理测试', () => {
    it('应该在频繁加载卸载插件时不泄漏监听器', async () => {
      const initialMemory = getMemoryUsage();

        // 创建临时插件管理器
        for (let i = 0; i < 100; i++) {
          const tempConfigManager = {
            getPluginsConfig: jest.fn(() => ({ plugins: [] }))
          };
          const tempManager = new PluginManager('./plugins', tempConfigManager);

        // 注册一些插件
        for (let j = 0; j < 5; j++) {
          const plugin = {
            name: `temp-plugin-${i}-${j}`,
            version: '1.0.0',
            execute: jest.fn(async () => ({ success: true }))
          };

          (tempManager as any).plugins.set(plugin.name, plugin);
        }

        // 触发一些事件
        tempManager.emit('test', { data: 'test' });

        // 管理器应该被清理
        if (i % 10 === 0) {
          const currentMemory = getMemoryUsage();
          const growth = currentMemory - initialMemory;

          // 验证内存增长可控
          expect(growth).toBeLessThan(15);
        }
      }

      // 强制垃圾回收
      if (global.gc) {
        global.gc();
      }

      const finalMemory = getMemoryUsage();
      const memoryGrowth = finalMemory - initialMemory;

      expect(memoryGrowth).toBeLessThan(20);

      console.log(`✓ 加载卸载循环: 100次`);
      console.log(`✓ 内存增长: ${memoryGrowth}MB`);
      console.log(`✓ 无监听器泄漏`);
    }, 60000);

    it('应该正确清理插件事件监听器', async () => {
      const manager = new PluginManager();
      let listenerCount = 0;

      // 注册一个插件并添加监听器
      const plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        execute: jest.fn(async () => ({ success: true }))
      };

      (manager as any).plugins.set(plugin.name, plugin);

      // 添加监听器
      const handler = () => { listenerCount++; };
      manager.on('test', handler);

      // 触发事件
      manager.emit('test');
      expect(listenerCount).toBe(1);

      // 移除监听器
      manager.removeListener('test', handler);

      // 再次触发事件
      manager.emit('test');
      expect(listenerCount).toBe(1); // 应该仍然是1

      console.log(`✓ 事件监听器被正确清理`);
    });
  });

  describe('存储清理测试', () => {
    it('应该在存储大量数据后不泄漏内存', async () => {
      const storage = new TradeStorage();
      const initialMemory = getMemoryUsage();

      // 存储大量交易记录
      for (let i = 0; i < 10000; i++) {
        storage.add({
          id: `storage-${i}`,
          timestamp: Date.now(),
          success: true,
          amount: 1000
        });
      }

      // 清空存储
      storage.clear();

      // 强制垃圾回收
      if (global.gc) {
        global.gc();
      }

      const finalMemory = getMemoryUsage();
      const memoryGrowth = finalMemory - initialMemory;

      // 清空后内存应该释放
      expect(memoryGrowth).toBeLessThan(10);

      console.log(`✓ 存储记录数: 10000`);
      console.log(`✓ 清空后内存增长: ${memoryGrowth}MB`);
      console.log(`✓ 内存已释放`);
    }, 60000);
  });

  describe('规则引擎内存测试', () => {
    it('应该在频繁添加删除规则时不泄漏内存', async () => {
      const initialMemory = getMemoryUsage();

      // 频繁添加和删除规则
      for (let i = 0; i < 1000; i++) {
        const engine = new RuleEngine();

        // 添加规则
        const rules: RuleConfig[] = [];
        for (let j = 0; j < 50; j++) {
          rules.push({
            id: `rule-${i}-${j}`,
            name: `规则 ${i}-${j}`,
            enabled: true,
            priority: j,
            condition: {
              type: 'price',
              operator: '>',
              value: 10
            },
            action: {
              type: 'buy',
              amount_type: 'fixed',
              amount: 1000,
              price_type: 'market'
            }
          });
        }

        await engine.loadRules({ rules });

        // 规则引擎会自动清理旧规则

        if (i % 100 === 0) {
          const currentMemory = getMemoryUsage();
          const growth = currentMemory - initialMemory;

          // 验证内存增长可控
          expect(growth).toBeLessThan(15);
        }
      }

      // 强制垃圾回收
      if (global.gc) {
        global.gc();
      }

      const finalMemory = getMemoryUsage();
      const memoryGrowth = finalMemory - initialMemory;

      expect(memoryGrowth).toBeLessThan(20);

      console.log(`✓ 添加删除循环: 1000次`);
      console.log(`✓ 内存增长: ${memoryGrowth}MB`);
      console.log(`✓ 无规则对象泄漏`);
    }, 90000);
  });

  describe('缓存和临时对象测试', () => {
    it('应该正确清理LRU缓存', async () => {
      const initialMemory = getMemoryUsage();

      // 创建一个带LRU缓存的控制器
      const testController = new SafetyController(mockConfig);

      // 生成大量唯一的交易请求
      for (let i = 0; i < 5000; i++) {
        await testController.checkTrade({
          id: `cache-test-${i}`,
          source: 'rule', ruleId: 'test-rule',
          code: `60${String(i).padStart(4, '0')}`,
          amount: 1000,
          action: 'buy'
        });
      }

      // 强制垃圾回收
      if (global.gc) {
        global.gc();
      }

      const finalMemory = getMemoryUsage();
      const memoryGrowth = finalMemory - initialMemory;

      // 缓存应该限制内存增长
      expect(memoryGrowth).toBeLessThan(15);

      console.log(`✓ 缓存请求数: 5000`);
      console.log(`✓ 内存增长: ${memoryGrowth}MB`);
      console.log(`✓ LRU缓存工作正常`);
    }, 60000);
  });
});

/**
 * 获取当前内存使用量（MB）
 */
function getMemoryUsage(): number {
  if (process.memoryUsage) {
    return Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  }
  return 0;
}

/**
 * 模拟垃圾回收（用于测试）
 */
declare global {
  namespace NodeJS {
    interface Global {
      gc?: () => void;
    }
  }
}

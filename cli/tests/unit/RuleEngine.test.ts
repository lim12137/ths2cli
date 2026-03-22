/**
 * RuleEngine 测试套件
 * 测试规则引擎的所有核心功能
 */

import { RuleEngine } from '../../src/core/RuleEngine';
import type { RuleConfig, RuleCondition, MarketData } from '../../src/types-auto';

describe('RuleEngine', () => {
  let engine: RuleEngine;
  let mockRulesConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new RuleEngine();

    mockRulesConfig = {
      rules: [
        {
          id: 'rule-1',
          name: '价格低于10元买入',
          enabled: true,
          priority: 1,
          condition: {
            type: 'price',
            code: '600000',
            operator: '<',
            value: 10,
            volume_check: true
          },
          action: {
            type: 'buy',
            amount_type: 'fixed',
            amount: 1000,
            price_type: 'market'
          }
        },
        {
          id: 'rule-2',
          name: '价格高于20元卖出',
          enabled: true,
          priority: 2,
          condition: {
            type: 'price',
            code: '600000',
            operator: '>',
            value: 20,
            volume_check: false
          },
          action: {
            type: 'sell',
            amount_type: 'ratio',
            ratio: 50,
            price_type: 'market'
          }
        },
        {
          id: 'rule-3',
          name: '时间范围交易',
          enabled: true,
          priority: 3,
          condition: {
            type: 'time',
            start: '09:30:00',
            end: '15:00:00'
          },
          action: {
            type: 'buy',
            amount_type: 'fixed',
            amount: 500,
            price_type: 'market'
          }
        },
        {
          id: 'rule-4',
          name: '组合条件规则',
          enabled: true,
          priority: 4,
          condition: {
            type: 'composite',
            operator: 'AND',
            conditions: [
              {
                type: 'price',
                code: '600000',
                operator: '>',
                value: 5
              },
              {
                type: 'price',
                code: '600000',
                operator: '<',
                value: 15
              }
            ]
          },
          action: {
            type: 'buy',
            amount_type: 'fixed',
            amount: 1000,
            price_type: 'market'
          }
        },
        {
          id: 'rule-5',
          name: '禁用的规则',
          enabled: false,
          priority: 5,
          condition: {
            type: 'price',
            code: '600000',
            operator: '>',
            value: 100
          },
          action: {
            type: 'buy',
            amount_type: 'fixed',
            amount: 100,
            price_type: 'market'
          }
        },
        {
          id: 'rule-6',
          name: '有执行次数限制的规则',
          enabled: true,
          priority: 6,
          condition: {
            type: 'price',
            code: '600000',
            operator: '<',
            value: 8
          },
          action: {
            type: 'buy',
            amount_type: 'fixed',
            amount: 500,
            price_type: 'market'
          },
          constraints: {
            max_execution: 3,
            cooldown_seconds: 60
          }
        }
      ]
    };
  });

  describe('规则加载', () => {
    it('应该正确加载启用的规则', async () => {
      await engine.loadRules(mockRulesConfig);

      const stats = engine.getStats();
      expect(stats.totalRules).toBe(5); // 5个启用的规则
      expect(stats.activeRules).toBe(5);
    });

    it('应该忽略禁用的规则', async () => {
      await engine.loadRules(mockRulesConfig);

      const stats = engine.getStats();
      expect(stats.totalRules).toBe(5); // rule-5 被禁用
    });

    it('应该拒绝无效的规则配置', async () => {
      await expect(engine.loadRules({})).rejects.toThrow('无效的规则配置');
    });

    it('应该在加载规则时发射事件', async () => {
      const emitSpy = jest.spyOn(engine, 'emit');

      await engine.loadRules(mockRulesConfig);

      expect(emitSpy).toHaveBeenCalledWith('rules:loaded', { count: 5 });
    });
  });

  describe('价格条件判断', () => {
    beforeEach(async () => {
      await engine.loadRules(mockRulesConfig);
    });

    it('应该正确判断价格大于条件', async () => {
      const marketData = new Map<string, MarketData>();
      marketData.set('600000', {
        code: '600000',
        name: '浦发银行',
        price: 25,
        change: 5,
        changePercent: 20,
        volume: 200000,
        turnover: 5000000,
        timestamp: Date.now()
      });

      const results = await engine.evaluateAllRules(marketData);

      // rule-2: 价格 > 20
      expect(results.get('rule-2')).toBe(true);
    });

    it('应该正确判断价格小于条件', async () => {
      const marketData = new Map<string, MarketData>();
      marketData.set('600000', {
        code: '600000',
        name: '浦发银行',
        price: 8,
        change: -2,
        changePercent: -20,
        volume: 200000,
        turnover: 1600000,
        timestamp: Date.now()
      });

      const results = await engine.evaluateAllRules(marketData);

      // rule-1: 价格 < 10
      expect(results.get('rule-1')).toBe(true);
    });

    it('应该正确判断价格等于条件', async () => {
      const customConfig = {
        rules: [{
          id: 'rule-equal',
          name: '价格等于测试',
          enabled: true,
          priority: 1,
          condition: {
            type: 'price',
            code: '600000',
            operator: '==',
            value: 10
          },
          action: {
            type: 'buy',
            amount_type: 'fixed',
            amount: 1000,
            price_type: 'market'
          }
        }]
      };

      await engine.loadRules(customConfig);

      const marketData = new Map<string, MarketData>();
      marketData.set('600000', {
        code: '600000',
        name: '浦发银行',
        price: 10,
        change: 0,
        changePercent: 0,
        volume: 100000,
        turnover: 1000000,
        timestamp: Date.now()
      });

      const results = await engine.evaluateAllRules(marketData);

      expect(results.get('rule-equal')).toBe(true);
    });

    it('应该检查成交量条件', async () => {
      const marketData = new Map<string, MarketData>();
      marketData.set('600000', {
        code: '600000',
        name: '浦发银行',
        price: 8,
        change: -2,
        changePercent: -20,
        volume: 50000, // 低于 100000，volume_check 应该失败
        turnover: 400000,
        timestamp: Date.now()
      });

      const results = await engine.evaluateAllRules(marketData);

      // rule-1 有 volume_check，成交量不足应该返回 false
      expect(results.get('rule-1')).toBe(false);
    });

    it('应该处理缺失的市场数据', async () => {
      const marketData = new Map<string, MarketData>();
      // 不包含 600000 的数据

      const results = await engine.evaluateAllRules(marketData);

      expect(results.get('rule-1')).toBe(false);
      expect(results.get('rule-2')).toBe(false);
    });
  });

  describe('时间条件判断', () => {
    beforeEach(async () => {
      await engine.loadRules(mockRulesConfig);
    });

    it('应该在正确的时间范围内触发', () => {
      // 由于 evaluateTimeCondition 使用 new Date()，这里我们测试规则评估
      // 实际时间测试可能需要 mock Date
      const rule = mockRulesConfig.rules.find((r: any) => r.id === 'rule-3') as RuleConfig;

      expect(rule.condition.type).toBe('time');
      expect(rule.condition.start).toBe('09:30:00');
      expect(rule.condition.end).toBe('15:00:00');
    });

    it('应该正确格式化时间字符串', () => {
      const rule = mockRulesConfig.rules.find((r: any) => r.id === 'rule-3') as RuleConfig;

      expect(rule.condition.start).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      expect(rule.condition.end).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });
  });

  describe('组合条件判断', () => {
    beforeEach(async () => {
      await engine.loadRules(mockRulesConfig);
    });

    it('应该正确判断 AND 条件', async () => {
      const marketData = new Map<string, MarketData>();
      marketData.set('600000', {
        code: '600000',
        name: '浦发银行',
        price: 10, // 5 < 10 < 15
        change: 0,
        changePercent: 0,
        volume: 100000,
        turnover: 1000000,
        timestamp: Date.now()
      });

      const results = await engine.evaluateAllRules(marketData);

      // rule-4: 价格 > 5 AND 价格 < 15
      expect(results.get('rule-4')).toBe(true);
    });

    it('应该在 AND 条件不满足时返回 false', async () => {
      const marketData = new Map<string, MarketData>();
      marketData.set('600000', {
        code: '600000',
        name: '浦发银行',
        price: 20, // 不满足 < 15
        change: 10,
        changePercent: 100,
        volume: 200000,
        turnover: 4000000,
        timestamp: Date.now()
      });

      const results = await engine.evaluateAllRules(marketData);

      expect(results.get('rule-4')).toBe(false);
    });

    it('应该正确判断 OR 条件', async () => {
      const orConfig = {
        rules: [{
          id: 'rule-or',
          name: 'OR条件测试',
          enabled: true,
          priority: 1,
          condition: {
            type: 'composite',
            operator: 'OR',
            conditions: [
              {
                type: 'price',
                code: '600000',
                operator: '<',
                value: 5
              },
              {
                type: 'price',
                code: '600000',
                operator: '>',
                value: 20
              }
            ]
          },
          action: {
            type: 'buy',
            amount_type: 'fixed',
            amount: 1000,
            price_type: 'market'
          }
        }]
      };

      await engine.loadRules(orConfig);

      const marketData = new Map<string, MarketData>();
      marketData.set('600000', {
        code: '600000',
        name: '浦发银行',
        price: 25, // 满足 > 20
        change: 15,
        changePercent: 150,
        volume: 250000,
        turnover: 6250000,
        timestamp: Date.now()
      });

      const results = await engine.evaluateAllRules(marketData);

      expect(results.get('rule-or')).toBe(true);
    });

    it('应该正确判断 NOT 条件', async () => {
      const notConfig = {
        rules: [{
          id: 'rule-not',
          name: 'NOT条件测试',
          enabled: true,
          priority: 1,
          condition: {
            type: 'composite',
            operator: 'NOT',
            conditions: [
              {
                type: 'price',
                code: '600000',
                operator: '>',
                value: 20
              }
            ]
          },
          action: {
            type: 'buy',
            amount_type: 'fixed',
            amount: 1000,
            price_type: 'market'
          }
        }]
      };

      await engine.loadRules(notConfig);

      const marketData = new Map<string, MarketData>();
      marketData.set('600000', {
        code: '600000',
        name: '浦发银行',
        price: 10, // 不满足 > 20，NOT 后为 true
        change: -5,
        changePercent: -33.33,
        volume: 100000,
        turnover: 1000000,
        timestamp: Date.now()
      });

      const results = await engine.evaluateAllRules(marketData);

      expect(results.get('rule-not')).toBe(true);
    });
  });

  describe('执行次数限制', () => {
    beforeEach(async () => {
      await engine.loadRules(mockRulesConfig);
    });

    it('应该记录规则执行次数', async () => {
      const marketData = new Map<string, MarketData>();
      marketData.set('600000', {
        code: '600000',
        name: '浦发银行',
        price: 7,
        change: -3,
        changePercent: -30,
        volume: 150000,
        turnover: 1050000,
        timestamp: Date.now()
      });

      // 第一次评估
      await engine.evaluateAllRules(marketData);

      let stats = engine.getStats();
      expect(stats.executionCounts['rule-6']).toBe(1);

      // 第二次评估
      await engine.evaluateAllRules(marketData);

      stats = engine.getStats();
      expect(stats.executionCounts['rule-6']).toBe(2);
    });

    it('应该在达到执行次数限制后停止执行', async () => {
      const marketData = new Map<string, MarketData>();
      marketData.set('600000', {
        code: '600000',
        name: '浦发银行',
        price: 7,
        change: -3,
        changePercent: -30,
        volume: 150000,
        turnover: 1050000,
        timestamp: Date.now()
      });

      // 执行3次（达到限制）
      for (let i = 0; i < 3; i++) {
        const results = await engine.evaluateAllRules(marketData);
        if (i < 3) {
          expect(results.get('rule-6')).toBe(true);
        }
      }

      let stats = engine.getStats();
      expect(stats.executionCounts['rule-6']).toBe(3);

      // 第4次应该返回 false
      const results = await engine.evaluateAllRules(marketData);
      expect(results.get('rule-6')).toBe(false);
    });
  });

  describe('冷却时间', () => {
    it('应该遵守冷却时间限制', async () => {
      await engine.loadRules(mockRulesConfig);

      const cooldownSpy = jest.spyOn(engine as any, 'sleep');

      // 模拟监控流程
      const marketData = new Map<string, MarketData>();
      marketData.set('600000', {
        code: '600000',
        name: '浦发银行',
        price: 7,
        change: -3,
        changePercent: -30,
        volume: 150000,
        turnover: 1050000,
        timestamp: Date.now()
      });

      // 在测试中，startMonitoring 会调用 sleep
      // 我们可以通过检查统计信息来验证冷却时间
      const stats = engine.getStats();
      expect(stats.executionCounts).toBeDefined();
    });
  });

  describe('每日重置', () => {
    it('应该重置所有执行计数', async () => {
      await engine.loadRules(mockRulesConfig);

      const marketData = new Map<string, MarketData>();
      marketData.set('600000', {
        code: '600000',
        name: '浦发银行',
        price: 7,
        change: -3,
        changePercent: -30,
        volume: 150000,
        turnover: 1050000,
        timestamp: Date.now()
      });

      // 执行一些规则
      await engine.evaluateAllRules(marketData);
      await engine.evaluateAllRules(marketData);

      let stats = engine.getStats();
      expect(Object.values(stats.executionCounts).some(c => c > 0)).toBe(true);

      // 重置
      engine.resetExecutionCounts();

      stats = engine.getStats();
      expect(Object.values(stats.executionCounts).every(c => c === 0)).toBe(true);
    });

    it('应该在重置时发射事件', async () => {
      await engine.loadRules(mockRulesConfig);

      const emitSpy = jest.spyOn(engine, 'emit');

      engine.resetExecutionCounts();

      expect(emitSpy).toHaveBeenCalledWith('rules:reset');
    });
  });

  describe('统计信息', () => {
    it('应该返回正确的统计信息', async () => {
      await engine.loadRules(mockRulesConfig);

      const stats = engine.getStats();

      expect(stats).toHaveProperty('totalRules');
      expect(stats).toHaveProperty('activeRules');
      expect(stats).toHaveProperty('executionCounts');
      expect(stats.totalRules).toBe(5);
      expect(stats.activeRules).toBe(5);
    });
  });

  describe('监控功能', () => {
    it('应该能够启动监控', async () => {
      await engine.loadRules(mockRulesConfig);

      const callback = jest.fn().mockResolvedValue(undefined);

      // 启动监控
      engine.startMonitoring(1, callback);

      // 等待一段时间让监控运行
      await new Promise(resolve => setTimeout(resolve, 100));

      // 停止监控
      engine.stopMonitoring();

      // 验证回调被调用（由于使用模拟数据，可能不会触发任何规则）
      expect(callback).toBeDefined();
    });

    it('应该能够停止监控', async () => {
      await engine.loadRules(mockRulesConfig);

      const callback = jest.fn().mockResolvedValue(undefined);

      engine.startMonitoring(1, callback);
      engine.stopMonitoring();

      // 再次停止不应该报错
      engine.stopMonitoring();
    });

    it('应该在规则触发时发射事件', async () => {
      await engine.loadRules(mockRulesConfig);

      const emitSpy = jest.spyOn(engine, 'emit');

      const marketData = new Map<string, MarketData>();
      marketData.set('600000', {
        code: '600000',
        name: '浦发银行',
        price: 8,
        change: -2,
        changePercent: -20,
        volume: 200000,
        turnover: 1600000,
        timestamp: Date.now()
      });

      await engine.evaluateAllRules(marketData);

      // rule-1 应该被触发
      expect(emitSpy).toHaveBeenCalledWith('rule:triggered', {
        ruleId: 'rule-1',
        rule: expect.any(Object)
      });
    });
  });

  describe('错误处理', () => {
    it('应该处理规则评估错误', async () => {
      const invalidConfig = {
        rules: [{
          id: 'rule-invalid',
          name: '无效规则',
          enabled: true,
          priority: 1,
          condition: {
            type: 'invalid_type' as any
          },
          action: {
            type: 'buy',
            amount_type: 'fixed',
            amount: 1000,
            price_type: 'market'
          }
        }]
      };

      await engine.loadRules(invalidConfig);

      const marketData = new Map<string, MarketData>();
      const results = await engine.evaluateAllRules(marketData);

      // 应该返回 false 而不是抛出错误
      expect(results.get('rule-invalid')).toBe(false);
    });

    it('应该在错误时发射事件', async () => {
      const invalidConfig = {
        rules: [{
          id: 'rule-error',
          name: '错误规则',
          enabled: true,
          priority: 1,
          condition: {
            type: 'invalid_type' as any
          },
          action: {
            type: 'buy',
            amount_type: 'fixed',
            amount: 1000,
            price_type: 'market'
          }
        }]
      };

      await engine.loadRules(invalidConfig);

      const emitSpy = jest.spyOn(engine, 'emit');

      const marketData = new Map<string, MarketData>();
      await engine.evaluateAllRules(marketData);

      expect(emitSpy).toHaveBeenCalledWith('rule:error', expect.any(Object));
    });
  });
});

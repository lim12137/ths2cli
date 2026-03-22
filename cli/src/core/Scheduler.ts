/**
 * 统一调度器 - 协调规则引擎和插件系统
 */

import { EventEmitter } from 'events';
import { ConfigManager } from './ConfigManager';
import { RuleEngine } from './RuleEngine';
import { SafetyController } from './SafetyController';
import { PluginManager } from './PluginManager';
import type { TradeRequest, TradeResult as AutoTradeResult, MarketData, SchedulerConfig } from '../types-auto';
import type { TradeResult as ApiTradeResult } from '../types';
import { executeTrade, executeCancel, httpRequest } from '../utils';

export class Scheduler extends EventEmitter {
  private configManager: ConfigManager;
  private ruleEngine: RuleEngine;
  private safetyController: SafetyController;
  private pluginManager: PluginManager;

  private isRunning: boolean = false;
  private tradeTimeRange: { start: string; end: string } = { start: '09:30:00', end: '15:00:00' };
  private allowEmpty: boolean = false;
  private checkInterval: number = 5;

  constructor(private config: SchedulerConfig) {
    super();

    // 初始化配置管理器
    this.configManager = new ConfigManager({
      configDir: config.rules_path.replace('/rules.yaml', ''),
      watchEnabled: true,
    });

    // 初始化规则引擎
    this.ruleEngine = new RuleEngine();

    // 初始化安全控制器
    this.safetyController = new SafetyController(config.safety);

    // 初始化插件管理器
    this.pluginManager = new PluginManager(
      config.plugins_path.replace('/plugins.yaml', ''),
      this.configManager
    );

    // 设置事件监听
    this.setupEventListeners();
  }

  /**
   * 启动调度器
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  调度器已在运行中');
      return;
    }

    try {
      console.log('🚀 启动自动化交易调度器...\n');

      // 1. 加载所有配置
      await this.configManager.loadAllConfigs();
      console.log('✓ 配置加载完成\n');

      // 2. 加载规则
      const rulesConfig = this.configManager.getRulesConfig();
      await this.ruleEngine.loadRules(rulesConfig);

      // 3. 加载插件
      await this.pluginManager.loadAllPlugins();

      // 4. 启动规则监控
      this.ruleEngine.startMonitoring(this.checkInterval, async (rule) => {
        await this.handleRuleTrigger(rule);
      });

      // 5. 启动插件监控
      this.pluginManager.startMonitoring(this.checkInterval);

      // 6. 设置每日重置定时器
      this.setupDailyReset();

      this.isRunning = true;
      console.log('\n✓ 调度器启动成功！');
      console.log(`✓ 交易时间: ${this.tradeTimeRange.start} - ${this.tradeTimeRange.end}`);
      console.log(`✓ 检查间隔: ${this.checkInterval}秒`);
      console.log(`✓ 允许空仓: ${this.allowEmpty ? '是' : '否'}\n`);

      this.emit('scheduler:started');

    } catch (error) {
      console.error('❌ 调度器启动失败:', error);
      this.emit('scheduler:error', { error });
      throw error;
    }
  }

  /**
   * 停止调度器
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('\n⏹️  停止调度器...');

    // 停止规则监控
    this.ruleEngine.stopMonitoring();

    // 停止插件监控
    this.pluginManager.stopMonitoring();

    // 清理插件
    await this.pluginManager.cleanup();

    // 停止配置监听
    this.configManager.stopWatching();

    this.isRunning = false;
    console.log('✓ 调度器已停止');
    this.emit('scheduler:stopped');
  }

  /**
   * 设置事件监听
   */
  private setupEventListeners(): void {
    // 配置重载
    this.configManager.on('config:reloaded', async ({ filename }) => {
      console.log(`📝 配置文件已重载: ${filename}`);

      if (filename === 'rules.yaml') {
        const rulesConfig = this.configManager.getRulesConfig();
        await this.ruleEngine.loadRules(rulesConfig);
      }

      if (filename === 'plugins.yaml') {
        await this.pluginManager.loadAllPlugins();
      }
    });

    // 规则触发
    this.ruleEngine.on('rule:triggered', ({ ruleId, rule }) => {
      console.log(`📌 规则触发: ${rule.name} (${ruleId})`);
    });

    // 插件触发
    this.pluginManager.on('plugin:triggered', ({ pluginId }) => {
      console.log(`🔌 插件触发: ${pluginId}`);
    });

    // 熔断器触发
    this.safetyController.on('circuit_breaker:triggered', ({ losses, cooldown_minutes }) => {
      console.log(`🛑 熔断触发！连续 ${losses} 次亏损，暂停 ${cooldown_minutes} 分钟`);
    });

    // 交易请求
    this.pluginManager.on('trade:request', async (request: TradeRequest) => {
      await this.processTradeRequest(request);
    });

    // 通知
    this.on('notification', ({ type, message }) => {
      console.log(`[${type.toUpperCase()}] ${message}`);
    });

    // 错误处理
    this.on('scheduler:error', ({ error }) => {
      console.error('调度器错误:', error);
    });

    this.ruleEngine.on('rule:error', ({ error }) => {
      console.error('规则错误:', error);
    });

    this.pluginManager.on('plugin:error', ({ error }) => {
      console.error('插件错误:', error);
    });
  }

  /**
   * 处理规则触发
   */
  private async handleRuleTrigger(rule: any): Promise<void> {
    try {
      const tradeRequest: TradeRequest = {
        id: `rule_${rule.id}_${Date.now()}`,
        source: 'rule',
        ruleId: rule.id,
        code: rule.condition.code as string,
        amount: this.calculateTradeAmount(rule.action),
        price: rule.action.price,
        action: rule.action.type,
      };

      await this.processTradeRequest(tradeRequest);

    } catch (error) {
      console.error('处理规则触发失败:', error);
    }
  }

  /**
   * 处理交易请求
   */
  async processTradeRequest(request: TradeRequest): Promise<void> {
    // 1. 检查交易时间
    if (!this.isTradeTime()) {
      console.log(`⏰ 非交易时间，忽略交易请求: ${request.id}`);
      return;
    }

    // 2. 安全检查
    const safetyCheck = await this.safetyController.checkTrade(request);
    if (!safetyCheck.allowed) {
      console.log(`🚫 安全检查失败: ${safetyCheck.message}`);
      this.emit('trade:rejected', { request, reason: safetyCheck.reason });
      return;
    }

    // 3. 执行交易
    console.log(`\n💰 执行交易: ${request.action.toUpperCase()} ${request.code} ${request.amount}元`);

    try {
      let apiResult: ApiTradeResult;

      if (request.action === 'buy') {
        apiResult = await executeTrade('buy', request.code!, request.amount, request.price);
      } else if (request.action === 'sell') {
        apiResult = await executeTrade('sell', request.code!, request.amount, request.price);
      } else {
        throw new Error(`未知的交易类型: ${request.action}`);
      }

      // 转换API响应为自动化系统格式
      const result: AutoTradeResult = this.convertTradeResult(apiResult, request);

      // 4. 记录交易结果
      await this.safetyController.recordTrade(result);

      if (result.success) {
        console.log(`✅ 交易成功: ${result.htbh}`);
        this.emit('trade:success', { request, result });
      } else {
        console.log(`❌ 交易失败: ${result.error}`);
        this.emit('trade:failed', { request, result });
      }

    } catch (error) {
      console.error('交易执行出错:', error);
      this.emit('trade:error', { request, error });
    }
  }

  /**
   * 转换API响应为自动化系统格式
   */
  private convertTradeResult(apiResult: ApiTradeResult, request: TradeRequest): AutoTradeResult {
    const success = apiResult.retcode === '0';
    return {
      success,
      htbh: apiResult.htbh,
      amount: request.amount,
      error: success ? undefined : apiResult.retmsg || '未知错误',
    };
  }

  /**
   * 计算交易金额
   */
  private calculateTradeAmount(action: any): number {
    if (action.amount_type === 'fixed') {
      return action.amount || 0;
    } else if (action.amount_type === 'ratio') {
      // 根据总资产计算比例
      // TODO: 实现动态计算
      return action.amount || 0;
    } else if (action.amount_type === 'money') {
      return action.amount || 0;
    }
    return 0;
  }

  /**
   * 检查是否在交易时间
   */
  private isTradeTime(): boolean {
    const now = new Date();
    const currentTime = now.toTimeString();

    const isOpen = currentTime >= this.tradeTimeRange.start && currentTime <= this.tradeTimeRange.end;

    // 允许空仓模式
    if (this.allowEmpty) {
      return true;
    }

    return isOpen;
  }

  /**
   * 设置每日重置定时器
   */
  private setupDailyReset(): void {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    setTimeout(() => {
      this.performDailyReset();
      // 设置每日重复
      setInterval(() => this.performDailyReset(), 24 * 60 * 60 * 1000);
    }, msUntilMidnight);

    console.log(`✓ 每日重置定时器已设置: ${tomorrow.toLocaleString()}`);
  }

  /**
   * 执行每日重置
   */
  private performDailyReset(): void {
    console.log('\n🔄 执行每日重置...');

    // 重置安全控制器
    this.safetyController.resetDailyCounters();

    // 重置规则引擎
    this.ruleEngine.resetExecutionCounts();

    console.log('✓ 每日重置完成\n');
    this.emit('daily:reset');
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    isRunning: boolean;
    ruleStats: any;
    safetyStats: any;
    pluginStats: any;
  } {
    return {
      isRunning: this.isRunning,
      ruleStats: this.ruleEngine.getStats(),
      safetyStats: this.safetyController.getStats(),
      pluginStats: this.pluginManager.getStats(),
    };
  }

  /**
   * 手动触发规则检查
   */
  async triggerRuleCheck(): Promise<void> {
    try {
      const marketData = await this.fetchMarketData();
      const results = await this.ruleEngine.evaluateAllRules(marketData);

      console.log(`\n🔍 手动触发规则检查，共 ${results.size} 条规则`);

      for (const [ruleId, shouldTrade] of results) {
        console.log(`  ${ruleId}: ${shouldTrade ? '✅ 触发' : '❌ 未触发'}`);
      }

    } catch (error) {
      console.error('规则检查失败:', error);
    }
  }

  /**
   * 手动触发插件检查
   */
  async triggerPluginCheck(): Promise<void> {
    try {
      const marketData = await this.fetchMarketData();
      await this.pluginManager.checkAllPlugins(marketData);
      console.log('✓ 插件检查完成');
    } catch (error) {
      console.error('插件检查失败:', error);
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
   * 获取系统状态
   */
  getStatus(): {
    running: boolean;
    tradeTime: boolean;
    circuitBroken: boolean;
    activeRules: number;
    activePlugins: number;
  } {
    const safetyStats = this.safetyController.getStats();
    const ruleStats = this.ruleEngine.getStats();
    const pluginStats = this.pluginManager.getStats();

    return {
      running: this.isRunning,
      tradeTime: this.isTradeTime(),
      circuitBroken: safetyStats.isCircuitBroken,
      activeRules: ruleStats.totalRules,
      activePlugins: pluginStats.enabledPlugins,
    };
  }
}

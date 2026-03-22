/**
 * 测试插件 - 用于集成测试
 *
 * 功能：
 * 1. 初始化时记录配置
 * 2. check 方法根据配置决定是否触发
 * 3. execute 方法执行买入操作
 * 4. destroy 时清理资源
 */

class TestPlugin {
  constructor() {
    this.name = 'TestPlugin';
    this.version = '1.0.0';
    this.initialized = false;
    this.config = null;
    this.executeCount = 0;
  }

  /**
   * 插件初始化
   */
  async init(config) {
    this.config = config;
    this.initialized = true;
    console.log(`[TestPlugin] 初始化完成，配置:`, JSON.stringify(config));
  }

  /**
   * 检查是否触发交易
   * 返回 true 表示触发，false 表示不触发
   */
  async check(context) {
    if (!this.initialized) {
      throw new Error('插件未初始化');
    }

    // 可以从 context 获取行情数据
    try {
      const symbols = this.config?.symbols || ['600000'];
      const threshold = this.config?.threshold || 10;

      // 简单策略：价格小于阈值时触发
      for (const symbol of symbols) {
        const quote = await context.getQuote(symbol);
        if (quote.price < threshold) {
          console.log(`[TestPlugin] 触发条件满足: ${symbol} 价格 ${quote.price} < ${threshold}`);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('[TestPlugin] check 方法出错:', error.message);
      return false;
    }
  }

  /**
   * 执行交易
   */
  async execute(context) {
    if (!this.initialized) {
      throw new Error('插件未初始化');
    }

    this.executeCount++;

    const symbols = this.config?.symbols || ['600000'];
    const symbol = symbols[0]; // 使用第一个股票

    try {
      // 执行买入操作
      const amount = 1000; // 固定买入 1000 股
      await context.buy(symbol, amount);

      context.notify(
        `[TestPlugin] 执行第 ${this.executeCount} 次交易: 买入 ${symbol} ${amount} 股`,
        'info'
      );

      return {
        success: true,
        symbol,
        amount,
        executeCount: this.executeCount
      };
    } catch (error) {
      context.notify(
        `[TestPlugin] 交易执行失败: ${error.message}`,
        'error'
      );
      throw error;
    }
  }

  /**
   * 销毁插件
   */
  async destroy() {
    this.initialized = false;
    console.log(`[TestPlugin] 销毁完成，共执行 ${this.executeCount} 次交易`);
  }
}

// 导出插件类
module.exports = TestPlugin;

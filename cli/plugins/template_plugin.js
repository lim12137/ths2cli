/**
 * 插件开发模板
 * 可基于此模板开发自定义交易策略插件
 */

class TemplatePlugin {
  constructor() {
    this.id = 'plugin_template';
    this.name = '模板插件';
    this.version = '1.0.0';
  }

  /**
   * 初始化插件
   * @param {Object} config - 插件配置
   */
  async init(config) {
    this.config = config;

    // 初始化逻辑
    console.log(`✓ ${this.name} 插件初始化完成`);
  }

  /**
   * 检查是否满足交易条件
   * @param {PluginContext} context - 插件上下文
   * @returns {Promise<boolean>} - 是否应该执行交易
   */
  async check(context) {
    try {
      // 1. 获取市场数据
      const quote = await context.getQuote('600000');
      console.log(`当前价格: ${quote.price}`);

      // 2. 获取K线数据
      const kline = await context.getKline('600000', 1440, 20);

      // 3. 获取持仓信息
      const position = await context.getPosition();
      const money = await context.getMoney();

      // 4. 分析条件
      const shouldBuy = this.analyzeBuyCondition(quote, kline, position);
      const shouldSell = this.analyzeSellCondition(quote, kline, position);

      // 5. 返回是否触发交易
      if (shouldBuy || shouldSell) {
        context.notify(`触发交易信号: ${shouldBuy ? '买入' : '卖出'}`, 'info');
        return true;
      }

      return false;

    } catch (error) {
      context.notify(`检查失败: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * 执行交易
   * @param {PluginContext} context - 插件上下文
   */
  async execute(context) {
    try {
      // 1. 获取当前持仓
      const position = await context.getPosition();
      const hasPosition = Object.values(position).some(p => p.sz > 0);

      // 2. 根据条件执行交易
      if (hasPosition) {
        // 卖出逻辑
        const pos = Object.values(position).find(p => p.sz > 0);
        await context.sell('600000', pos.sz, {
          price_type: 'market',
          notip: true
        });
        context.notify(`卖出: 600000, 数量: ${pos.sz}`, 'info');
      } else {
        // 买入逻辑
        const money = await context.getMoney();
        const amount = this.config.trade_amount || 10000;

        await context.buy('600000', amount, {
          price_type: 'market',
          notip: true
        });
        context.notify(`买入: 600000, 金额: ${amount}`, 'info');
      }

    } catch (error) {
      context.notify(`交易执行失败: ${error.message}`, 'error');
    }
  }

  /**
   * 分析买入条件
   */
  analyzeBuyCondition(quote, kline, position) {
    // 实现买入条件逻辑
    // 示例：价格低于某个阈值时买入
    return quote.price < 10.00;
  }

  /**
   * 分析卖出条件
   */
  analyzeSellCondition(quote, kline, position) {
    // 实现卖出条件逻辑
    // 示例：价格高于某个阈值时卖出
    return quote.price > 11.00;
  }

  /**
   * 销毁插件
   */
  async destroy() {
    console.log(`✓ ${this.name} 插件已销毁`);
  }
}

module.exports = TemplatePlugin;

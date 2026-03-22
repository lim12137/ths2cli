/**
 * 移动平均线策略插件
 * 当短期均线上穿长期均线时买入，下穿时卖出
 */

class MAStrategy {
  constructor() {
    this.id = 'plugin_ma';
    this.name = '移动平均线策略';
    this.version = '1.0.0';
  }

  /**
   * 初始化插件
   */
  async init(config) {
    this.config = config;
    this.shortPeriod = config.short_period || 5;
    this.longPeriod = config.long_period || 20;
    this.tradeAmount = config.trade_amount || 10000;

    console.log(`✓ ${this.name} 插件初始化完成`);
    console.log(`  短期周期: ${this.shortPeriod}, 长期周期: ${this.longPeriod}`);
  }

  /**
   * 检查是否满足交易条件
   */
  async check(context) {
    try {
      // 获取持仓信息
      const position = await context.getPosition();
      const hasPosition = Object.values(position).some(p => p.sz > 0);

      // 获取K线数据
      const kline = await context.getKline('600000', 1440, this.longPeriod + 1);

      if (!kline || kline.length < this.longPeriod) {
        context.notify('K线数据不足', 'warn');
        return false;
      }

      // 计算移动平均线
      const shortMA = this.calculateMA(kline, this.shortPeriod);
      const longMA = this.calculateMA(kline, this.longPeriod);

      // 获取前一天的MA值
      const prevShortMA = this.calculateMA(kline.slice(0, -1), this.shortPeriod);
      const prevLongMA = this.calculateMA(kline.slice(0, -1), this.longPeriod);

      // 金叉：短期均线上穿长期均线
      const goldenCross = shortMA > longMA && prevShortMA <= prevLongMA;

      // 死叉：短期均线下穿长期均线
      const deathCross = shortMA < longMA && prevShortMA >= prevLongMA;

      if (goldenCross && !hasPosition) {
        context.notify(`检测到金叉信号，MA${this.shortPeriod} > MA${this.longPeriod}`, 'info');
        return true;
      }

      if (deathCross && hasPosition) {
        context.notify(`检测到死叉信号，MA${this.shortPeriod} < MA${this.longPeriod}`, 'info');
        return true;
      }

      return false;

    } catch (error) {
      context.notify(`策略检查失败: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * 执行交易
   */
  async execute(context) {
    try {
      const position = await context.getPosition();
      const hasPosition = Object.values(position).some(p => p.sz > 0);

      const kline = await context.getKline('600000', 1440, this.longPeriod + 1);
      const shortMA = this.calculateMA(kline, this.shortPeriod);
      const longMA = this.calculateMA(kline, this.longPeriod);

      if (shortMA > longMA && !hasPosition) {
        // 买入
        context.notify(`执行买入: 600000, 金额: ${this.tradeAmount}元`, 'info');
        await context.buy('600000', this.tradeAmount, { price_type: 'market' });

      } else if (shortMA < longMA && hasPosition) {
        // 卖出
        const pos = Object.values(position).find(p => p.sz > 0);
        if (pos) {
          context.notify(`执行卖出: 600000, 数量: ${pos.sz}`, 'info');
          await context.sell('600000', pos.sz, { price_type: 'market' });
        }
      }

    } catch (error) {
      context.notify(`交易执行失败: ${error.message}`, 'error');
    }
  }

  /**
   * 计算移动平均线
   */
  calculateMA(kline, period) {
    if (kline.length < period) return 0;

    const sum = kline.slice(-period).reduce((acc, item) => acc + item.close, 0);
    return sum / period;
  }

  /**
   * 销毁插件
   */
  async destroy() {
    console.log(`✓ ${this.name} 插件已销毁`);
  }
}

module.exports = MAStrategy;

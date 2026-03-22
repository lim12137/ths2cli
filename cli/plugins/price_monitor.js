/**
 * 价格监控告警插件
 * 监控价格波动，在触及阈值时发送告警
 */

class PriceMonitor {
  constructor() {
    this.id = 'plugin_monitor';
    this.name = '价格监控告警';
    this.version = '1.0.0';
    this.alertHistory = new Map();
  }

  /**
   * 初始化插件
   */
  async init(config) {
    this.config = config;
    this.watchList = config.watch_list || [];
    this.checkInterval = config.check_interval || 300;

    console.log(`✓ ${this.name} 插件初始化完成`);
    console.log(`  监控股票: ${this.watchList.length} 只`);
  }

  /**
   * 检查价格是否触发告警
   */
  async check(context) {
    try {
      let hasAlert = false;

      for (const stock of this.watchList) {
        const quote = await context.getQuote(stock.code);

        if (!quote) {
          context.notify(`获取 ${stock.name} 行情失败`, 'warn');
          continue;
        }

        // 检查高价告警
        if (quote.price >= stock.high_threshold) {
          const alertKey = `${stock.code}_high`;
          if (!this.alertHistory.has(alertKey)) {
            context.notify(
              `⚠️ ${stock.name}(${stock.code}) 价格超过上限: ` +
              `${quote.price.toFixed(2)} > ${stock.high_threshold.toFixed(2)}`,
              'warn'
            );
            this.alertHistory.set(alertKey, Date.now());
            hasAlert = true;
          }
        }

        // 检查低价告警
        if (quote.price <= stock.low_threshold) {
          const alertKey = `${stock.code}_low`;
          if (!this.alertHistory.has(alertKey)) {
            context.notify(
              `⚠️ ${stock.name}(${stock.code}) 价格低于下限: ` +
              `${quote.price.toFixed(2)} < ${stock.low_threshold.toFixed(2)}`,
              'warn'
            );
            this.alertHistory.set(alertKey, Date.now());
            hasAlert = true;
          }
        }

        // 清理过期的告警记录（1小时后可再次告警）
        const now = Date.now();
        for (const [key, time] of this.alertHistory.entries()) {
          if (now - time > 3600000) {
            this.alertHistory.delete(key);
          }
        }
      }

      // 这是一个仅告警的插件，不触发交易
      return false;

    } catch (error) {
      context.notify(`价格监控失败: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * 执行操作（此插件不执行交易）
   */
  async execute(context) {
    // 仅告警，不执行交易
    context.notify('价格监控插件不执行交易操作', 'info');
  }

  /**
   * 销毁插件
   */
  async destroy() {
    console.log(`✓ ${this.name} 插件已销毁`);
  }
}

module.exports = PriceMonitor;

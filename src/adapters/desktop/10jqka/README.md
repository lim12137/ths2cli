# 同花顺适配器使用示例

## 安装与初始化

```typescript
import { TenjqkaAdapter } from '@/adapters/desktop/10jqka';

// 创建适配器实例
const adapter = new TenjqkaAdapter();

// 初始化
await adapter.initialize();

// 测试连接
const isConnected = await adapter.testConnection();
console.log('连接状态:', isConnected);
```

## 一、行情查询

### 1.1 获取实时行情

```typescript
const quoteCmd = adapter.commands.quote;

// 获取单个股票行情
const quote = await quoteCmd.getQuote('600000');
console.log('浦发银行现价:', quote['600000'].price);
console.log('涨幅:', quote['600000'].zf);
console.log('涨停价:', quote['600000'].zt_p);

// 批量获取行情
const quotes = await quoteCmd.batchGetQuote(['600000', '300033', '000001']);
for (const code in quotes) {
  console.log(`${code}: ${quotes[code].price}`);
}

// 获取指定字段
const price = await quoteCmd.getPrice('600000');
const changePercent = await quoteCmd.getChangePercent('600000');
const volume = await quoteCmd.getVolume('600000');
```

### 1.2 获取K线数据

```typescript
// 获取日K线
const daily = await quoteCmd.getDaily('600000', 10); // 10条日线
console.log('最新收盘价:', daily[daily.length - 1].close);

// 获取分钟K线
const minute1 = await quoteCmd.getMinute('600000', 240); // 240条1分钟线

// 获取自定义周期K线
const kline = await quoteCmd.getKline('600000', 60, 5); // 60分钟线，5条
```

### 1.3 问财选股

```typescript
// 自然语言选股
const stocks = await quoteCmd.selectStock('涨幅>5% 且 价格<20元 且 量比>2');
console.log('选股结果:', stocks);

// 按板块选股
const bankStocks = await quoteCmd.selectStock('银行业板块');
```

### 1.4 自选股管理

```typescript
// 获取自选股
const selfStocks = await quoteCmd.getSelfStock();
console.log('自选股:', selfStocks);

// 获取自定义板块
const block1 = await quoteCmd.getBlock('板块1');
console.log('板块1成分股:', block1.zqdm);
```

### 1.5 涨跌停判断

```typescript
// 判断是否涨停
const isLimitUp = await quoteCmd.isLimitUp('600000');

// 判断是否跌停
const isLimitDown = await quoteCmd.isLimitDown('600000');

// 获取涨跌停价
const limitUpPrice = await quoteCmd.getLimitUpPrice('600000');
const limitDownPrice = await quoteCmd.getLimitDownPrice('600000');
```

## 二、交易操作

### 2.1 买入股票

```typescript
const tradeCmd = adapter.commands.trade;

// 方式1: 以最新价买入100股
const ret1 = await tradeCmd.buyAtLatest('600000', 100);
console.log('委托结果:', ret1);

// 方式2: 以涨停价买入（提高成交概率）
const ret2 = await tradeCmd.buyAtLimitUp('600000', 100);

// 方式3: 以对手价买入（卖一价）
const ret3 = await tradeCmd.buyAtOpponent('600000', 100);

// 方式4: 按金额买入（买入10万元）
const ret4 = await tradeCmd.buyByMoney('600000', 100000);

// 方式5: 买入到目标仓位（使持仓达到1/3仓位）
const ret5 = await tradeCmd.buyToPosition('600000', '1/3');

// 方式6: 指定价格买入
const ret6 = await tradeCmd.buy('600000', 12.50, 100);
```

### 2.2 卖出股票

```typescript
// 方式1: 以最新价卖出100股
const ret1 = await tradeCmd.sellAtLatest('600000', 100);

// 方式2: 以跌停价卖出（提高成交概率）
const ret2 = await tradeCmd.sellAtLimitDown('600000', 100);

// 方式3: 以对手价卖出（买一价）
const ret3 = await tradeCmd.sellAtOpponent('600000', 100);

// 方式4: 按金额卖出（卖出10万元）
const ret4 = await tradeCmd.sellByMoney('600000', 100000);

// 方式5: 卖出到目标仓位（使持仓降到1/4）
const ret5 = await tradeCmd.sellToPosition('600000', '1/4');

// 方式6: 指定价格卖出
const ret6 = await tradeCmd.sell('600000', 13.00, 100);
```

### 2.3 撤单操作

```typescript
// 方式1: 按合同编号撤单
const ret1 = await tradeCmd.cancelByHtbh('1234567890');

// 方式2: 撤销某股票的所有委托
const ret2 = await tradeCmd.cancelByCode('600000');

// 方式3: 撤销某股票的所有买单
const ret3 = await tradeCmd.cancelBuy('600000');

// 方式4: 撤销某股票的所有卖单
const ret4 = await tradeCmd.cancelSell('600000');

// 方式5: 全部撤单
const ret5 = await tradeCmd.cancelAll();
```

### 2.4 等待成交

```typescript
import { TenjqkaOrderStatus } from '@/adapters/desktop/10jqka/types';

// 下单
const ret = await tradeCmd.buyAtLatest('600000', 100);

// 等待成交，超时10秒
const success = await tradeCmd.waitUpdate(
  ret,
  TenjqkaOrderStatus.dealed,
  10
);

if (success) {
  console.log('成交成功！');
} else {
  console.log('未成交，已撤单');
}
```

## 三、持仓查询

### 3.1 资金查询

```typescript
const posCmd = adapter.commands.position;

// 获取完整资金数据
const money = await posCmd.getMoney();
console.log('资金余额:', money.zjye);
console.log('可用资金:', money.kyje);
console.log('总资产:', money.zzc);
console.log('总市值:', money.zsz);

// 快捷方法
const balance = await posCmd.getBalance();        // 资金余额
const available = await posCmd.getAvailable();     // 可用资金
const totalAssets = await posCmd.getTotalAssets(); // 总资产
```

### 3.2 持仓查询

```typescript
// 获取完整持仓数据
const position = await posCmd.getPosition();

// 获取持仓列表
const positionList = await posCmd.getPositionList();
for (const pos of positionList) {
  console.log(`${pos.zqmc}(${pos.zqdm}):`);
  console.log(`  持仓: ${pos.sjsl}股`);
  console.log(`  可用: ${pos.kyye}股`);
  console.log(`  成本: ${pos.cbj}元`);
  console.log(`  盈亏: ${pos.yk}元`);
}

// 获取指定股票持仓
const pos = await posCmd.getStockPosition('600000');
if (pos) {
  console.log('持仓数量:', pos.sjsl);
  console.log('可用数量:', pos.kyye);
  console.log('成本价:', pos.cbj);
}

// 判断是否持有某股票
const hasPosition = await posCmd.hasPosition('600000');

// 获取可用数量
const availableAmount = await posCmd.getAvailableAmount('600000');
```

### 3.3 委托查询

```typescript
// 获取所有委托
const orders = await posCmd.getOrders();
const orderList = await posCmd.getOrderList();

// 获取未成交委托
const pendingOrders = await posCmd.getPendingOrders();

// 获取已成交委托
const filledOrders = await posCmd.getFilledOrders();

// 获取买单/卖单
const buyOrders = await posCmd.getBuyOrders();
const sellOrders = await posCmd.getSellOrders();

// 获取指定股票委托
const stockOrders = await posCmd.getStockOrders('600000');
```

### 3.4 账户摘要

```typescript
// 获取账户摘要信息
const summary = await posCmd.getAccountSummary();
console.log('总资产:', summary.totalAssets);
console.log('持仓市值:', summary.marketValue);
console.log('可用资金:', summary.available);
console.log('持仓数量:', summary.positionCount);
console.log('仓位比例:', summary.positionRatio.toFixed(2) + '%');
console.log('总盈亏:', summary.totalProfit);
console.log('待成交委托:', summary.pendingOrders);
```

## 四、实战策略示例

### 4.1 条件单：涨停买入

```typescript
async function buyAtLimitUp(code: string, amount: number) {
  const quoteCmd = adapter.commands.quote;
  const tradeCmd = adapter.commands.trade;

  // 监控行情
  while (true) {
    const isLimitUp = await quoteCmd.isLimitUp(code);

    if (isLimitUp) {
      // 涨停，以涨停价买入
      const ret = await tradeCmd.buyAtLimitUp(code, amount);
      console.log('涨停买入委托:', ret);

      // 等待成交
      const success = await tradeCmd.waitUpdate(ret, TenjqkaOrderStatus.dealed, 60);
      if (success) {
        console.log('涨停买入成功！');
        return;
      }
    }

    // 等待1秒后继续监控
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

### 4.2 条件单：破位止损

```typescript
async function stopLoss(code: string, stopPrice: number) {
  const quoteCmd = adapter.commands.quote;
  const tradeCmd = adapter.commands.trade;
  const posCmd = adapter.commands.position;

  // 检查是否有持仓
  const hasPos = await posCmd.hasPosition(code);
  if (!hasPos) {
    console.log('没有持仓，无需止损');
    return;
  }

  // 监控行情
  while (true) {
    const price = await quoteCmd.getPrice(code);

    if (price <= stopPrice) {
      console.log(`触发止损价 ${stopPrice}，当前价 ${price}`);

      // 以对手价卖出
      const amount = await posCmd.getAvailableAmount(code);
      const ret = await tradeCmd.sellAtOpponent(code, amount);

      // 等待成交
      const success = await tradeCmd.waitUpdate(ret, TenjqkaOrderStatus.dealed, 10);
      if (success) {
        console.log('止损成功！');
        return;
      }
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

### 4.3 网格交易

```typescript
async function gridTrade(
  code: string,
  basePrice: number,
  gridSpacing: number,
  gridSize: number
) {
  const quoteCmd = adapter.commands.quote;
  const tradeCmd = adapter.commands.trade;

  const buyLevels = [];
  const sellLevels = [];

  // 生成网格价位
  for (let i = 1; i <= gridSize; i++) {
    buyLevels.push(basePrice - gridSpacing * i);
    sellLevels.push(basePrice + gridSpacing * i);
  }

  console.log('网格价位:');
  console.log('买入档位:', buyLevels);
  console.log('卖出档位:', sellLevels);

  // 监控并交易
  while (true) {
    const price = await quoteCmd.getPrice(code);

    // 检查买入档位
    for (const buyPrice of buyLevels) {
      if (price <= buyPrice) {
        console.log(`触发买入档位 ${buyPrice}`);
        await tradeCmd.buy('600000', buyPrice, 100);
        buyLevels.splice(buyLevels.indexOf(buyPrice), 1); // 移除已触发档位
        break;
      }
    }

    // 检查卖出档位
    for (const sellPrice of sellLevels) {
      if (price >= sellPrice) {
        console.log(`触发卖出档位 ${sellPrice}`);
        await tradeCmd.sell('600000', sellPrice, 100);
        sellLevels.splice(sellLevels.indexOf(sellPrice), 1); // 移除已触发档位
        break;
      }
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

### 4.4 盘后监控

```typescript
async function afterMarketMonitor() {
  const posCmd = adapter.commands.position;
  const quoteCmd = adapter.commands.quote;

  // 获取账户摘要
  const summary = await posCmd.getAccountSummary();
  console.log('=== 账户摘要 ===');
  console.log(`总资产: ${summary.totalAssets.toFixed(2)}元`);
  console.log(`持仓市值: ${summary.marketValue.toFixed(2)}元`);
  console.log(`可用资金: ${summary.available.toFixed(2)}元`);
  console.log(`今日盈亏: ${summary.totalProfit.toFixed(2)}元`);
  console.log(`仓位: ${summary.positionRatio.toFixed(2)}%`);

  // 获取持仓明细
  const positionList = await posCmd.getPositionList();
  console.log('\n=== 持仓明细 ===');
  for (const pos of positionList) {
    const profitPercent = await posCmd.getProfitPercent(pos.zqdm);
    console.log(`${pos.zqmc}(${pos.zqdm}):`);
    console.log(`  持仓: ${pos.sjsl}股`);
    console.log(`  成本: ${pos.cbj}元`);
    console.log(`  现价: ${pos.sj}元`);
    console.log(`  盈亏: ${pos.yk.toFixed(2)}元 (${profitPercent.toFixed(2)}%)`);
  }

  // 获取今日委托
  const orderList = await posCmd.getOrderList();
  console.log('\n=== 今日委托 ===');
  for (const order of orderList) {
    console.log(`${order.zqmc}(${order.zqdm}):`);
    console.log(`  ${order.cz} ${order.wtsl}股 @ ${order.wtjg}元`);
    console.log(`  状态: ${order.bz}`);
    console.log(`  时间: ${order.wtrq} ${order.wtsj}`);
  }
}
```

## 五、错误处理

```typescript
try {
  // 初始化适配器
  await adapter.initialize();

  // 执行操作
  const quote = await adapter.commands.quote.getQuote('600000');
  console.log(quote);

} catch (error) {
  if (error.message.includes('未运行')) {
    console.error('请先启动同花顺客户端');
  } else if (error.message.includes('无法连接')) {
    console.error('无法连接到同花顺，请检查网络');
  } else {
    console.error('发生错误:', error.message);
  }
} finally {
  // 清理资源
  await adapter.cleanup();
}
```

## 注意事项

1. **交易时间**：只在交易时间内执行交易操作
2. **资金安全**：先在模拟账户测试，确认无误后再使用实盘
3. **错误处理**：做好异常捕获，避免程序崩溃
4. **日志记录**：记录所有操作，便于事后分析
5. **风险控制**：设置止损止盈，控制单笔交易金额

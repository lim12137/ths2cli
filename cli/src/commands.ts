/**
 * 命令实现
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import {
  httpRequest,
  formatMoneyTable,
  formatPositionTable,
  formatOrderTable,
  formatQuoteTable,
  printTradeResult,
  printError,
  buildTradeCommand,
  buildCancelCommand,
  DEFAULTS,
  KLINE_PERIOD,
} from './utils';
import type {
  TradeOptions,
  CancelOptions,
  KlineOptions,
  ApiError,
  MoneyData,
  PositionData,
  PositionItem,
  OrderData,
  OrderItem,
  KlineItem,
  QuoteData,
  TradeResult,
} from './types';

// ==================== 系统命令 ====================

/**
 * 测试连接
 */
export async function testConnection(): Promise<void> {
  try {
    const result = await httpRequest<{ status: string }>('/test');
    if (result.status === 'ok') {
      console.log(chalk.green('✓ 连接成功'));
    } else {
      console.log(chalk.red('✗ 连接失败'));
    }
  } catch (error) {
    printError(error as Error);
  }
}

/**
 * 启动桥接服务
 */
export async function startServer(options: { port?: string }): Promise<void> {
  const port = options.port || '18888';

  console.log(chalk.bold('\n🚀 启动Python桥接服务\n'));
  console.log(chalk.yellow('请确保：'));
  console.log('  1. 同花顺客户端已启动');
  console.log('  2. Python环境已配置');
  console.log('  3. 桥接脚本路径正确\n');
  console.log(chalk.cyan('服务端口:'), port);
  console.log(chalk.gray('\n提示：请手动启动桥接服务'));
  console.log(chalk.gray('命令：python cli/bridge_server.py'), port);
}

// ==================== 查询命令 ====================

/**
 * 通用查询执行器
 */
async function executeQuery<T>(
  endpoint: string,
  formatter: (data: T) => void,
  title: string,
  emoji: string
): Promise<void> {
  try {
    const data = await httpRequest<T>(endpoint, 'GET', undefined, { useCache: true });
    console.log(chalk.bold(`\n${emoji} ${title}\n`));
    formatter(data);
  } catch (error) {
    printError(error as Error);
  }
}

/**
 * 查询资金
 */
export async function queryMoney(): Promise<void> {
  await executeQuery<MoneyData>(
    '/money',
    formatMoneyTable,
    '账户资金信息',
    '📊'
  );
}

/**
 * 查询持仓
 */
export async function queryPosition(options: { code?: string }): Promise<void> {
  try {
    if (options.code) {
      // 查询特定股票
      const data = await httpRequest<Record<string, PositionItem>>('/position', 'GET', undefined, { useCache: true });

      if (data[options.code]) {
        console.log(chalk.bold('\n📈 持仓信息\n'));
        formatPositionTable({ [options.code]: data[options.code] });
      } else {
        console.log(chalk.yellow(`未找到股票 ${options.code} 的持仓`));
      }
    } else {
      // 查询所有持仓
      await executeQuery<Record<string, PositionItem>>(
        '/position',
        formatPositionTable,
        '持仓信息',
        '📈'
      );
    }
  } catch (error) {
    printError(error as Error);
  }
}

/**
 * 查询委托（优化：避免不必要的请求）
 */
export async function queryOrders(options: { all?: boolean }): Promise<void> {
  try {
    console.log(chalk.bold('\n📋 委托信息\n'));

    if (options.all) {
      // 直接查询全量委托，避免无用的 /order 请求
      const fullData = await httpRequest<Record<string, OrderItem[]>>('/fullorder', 'GET', undefined, { useCache: true });
      formatOrderTable(fullData);
    } else {
      // 只查询可撤委托
      const data = await httpRequest<Record<string, OrderItem[]>>('/order', 'GET', undefined, { useCache: true });
      formatOrderTable(data);
    }
  } catch (error) {
    printError(error as Error);
  }
}

// ==================== 交易命令 ====================

/**
 * 通用交易执行器
 */
async function executeTrade(
  action: 'buy' | 'sell',
  code: string,
  amount: string,
  options: TradeOptions
): Promise<void> {
  try {
    const cmd = buildTradeCommand({
      action,
      code,
      amount,
      price: options.price || DEFAULTS.PRICE,
      money: options.money,
      position: options.position,
      target: options.target,
      notip: options.notip !== undefined ? options.notip : DEFAULTS.NOTIP,
    });

    const emoji = action === 'buy' ? '💰' : '💸';
    const label = action === 'buy' ? '买入' : '卖出';

    console.log(chalk.bold(`\n${emoji} ${label}操作`));
    console.log(chalk.cyan('股票代码:'), code);
    console.log(chalk.cyan('委托命令:'), cmd);

    const result = await httpRequest('/cmd', 'POST', { cmd }) as TradeResult;
    printTradeResult(result);
  } catch (error) {
    printError(error as Error);
  }
}

/**
 * 买入股票
 */
export async function buy(code: string, amount: string, options: TradeOptions): Promise<void> {
  await executeTrade('buy', code, amount, options);
}

/**
 * 卖出股票
 */
export async function sell(code: string, amount: string, options: TradeOptions): Promise<void> {
  await executeTrade('sell', code, amount, options);
}

// ==================== 撤单命令 ====================

/**
 * 通用撤单执行器
 */
async function executeCancel(
  type: 'all' | 'code' | 'htbh' | 'last',
  params?: { code?: string; htbh?: string; direction?: string }
): Promise<void> {
  try {
    const cmd = buildCancelCommand({ type, ...params });

    const label = type === 'all' ? '全部撤单' :
                  type === 'code' ? `撤销 ${params?.code} 的所有委托` :
                  '撤单操作';

    console.log(chalk.bold(`\n❌ ${label}`));
    console.log(chalk.cyan('撤单命令:'), cmd);

    const result = await httpRequest('/cmd', 'POST', { cmd }) as TradeResult;
    printTradeResult(result);
  } catch (error) {
    printError(error as Error);
  }
}

/**
 * 撤单
 */
export async function cancel(htbh: string | undefined, options: CancelOptions): Promise<void> {
  if (htbh) {
    await executeCancel('htbh', { htbh });
  } else if (options.code) {
    await executeCancel('code', { code: options.code, direction: options.direction });
  } else if (options.last) {
    await executeCancel('last');
  } else {
    await executeCancel('all');
  }
}

/**
 * 全部撤单
 */
export async function cancelAll(): Promise<void> {
  await executeCancel('all');
}

/**
 * 按代码撤单
 */
export async function cancelByCode(code: string): Promise<void> {
  await executeCancel('code', { code });
}

// ==================== 行情命令 ====================

/**
 * 查询行情
 */
export async function getQuote(code: string): Promise<void> {
  try {
    const data = await httpRequest(`/quote?code=${code}`, 'GET', undefined, { useCache: true }) as QuoteData | Record<string, QuoteData>;
    console.log(chalk.bold('\n📈 行情信息\n'));
    formatQuoteTable(data);
  } catch (error) {
    printError(error as Error);
  }
}

/**
 * 查询K线
 */
export async function getKline(code: string, options: KlineOptions): Promise<void> {
  try {
    const period = options.period || DEFAULTS.KLINE_PERIOD;
    const length = parseInt(options.length || String(DEFAULTS.KLINE_LENGTH));

    const data = await httpRequest<KlineItem[]>(
      `/kline?code=${code}&period=${period}&length=${length}`,
      'GET',
      undefined,
      { useCache: true }
    );

    console.log(chalk.bold(`\n📊 ${code} K线数据\n`));

    if (data && data.length > 0) {
      const table = new Table({
        head: [
          chalk.cyan('日期'),
          chalk.cyan('开盘'),
          chalk.cyan('最高'),
          chalk.cyan('最低'),
          chalk.cyan('收盘'),
          chalk.cyan('成交量'),
          chalk.cyan('成交额'),
        ],
      });

      const rows = data.map(item => {
        const date = new Date(item.datetime * 1000).toLocaleDateString('zh-CN');
        return [
          date,
          item.open.toFixed(2),
          item.high.toFixed(2),
          item.low.toFixed(2),
          item.close.toFixed(2),
          item.volume.toString(),
          `${(item.amount / 10000).toFixed(2)}万`,
        ];
      });

      rows.forEach(row => table.push(row));
      console.log(table.toString());
    } else {
      console.log(chalk.yellow('暂无K线数据'));
    }
  } catch (error) {
    printError(error as Error);
  }
}

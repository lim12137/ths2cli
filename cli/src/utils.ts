/**
 * CLI 工具函数
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import axios, { AxiosError } from 'axios';
import type {
  MoneyData,
  PositionItem,
  OrderItem,
  QuoteData,
  TradeResult,
  ApiError,
  TradeCommandBuilder,
  CancelCommandBuilder,
  TradeOptions,
} from './types';

// ==================== 常量定义 ====================

/**
 * 桥接服务配置
 */
export const BRIDGE_CONFIG = {
  host: '127.0.0.1',
  port: 18888,
  timeout: 30000,
} as const;

/**
 * 订单价格类型
 */
export const ORDER_PRICE_TYPE = {
  LATEST: 'zxjg',        // 最新价
  LIMIT_UP: 'ztjg',      // 涨停价
  LIMIT_DOWN: 'dtjg',    // 跌停价
  OPPONENT1: 'dsj1',     // 对手价1（默认）
  OPPONENT2: 'dsj2',     // 对手价2
  BUY1: 'mrj1',          // 买一价
  BUY5: 'mrj5',          // 买五价
  SELL1: 'mcj1',         // 卖一价
  SELL5: 'mcj5',         // 卖五价
} as const;

/**
 * K线周期
 */
export const KLINE_PERIOD = {
  MIN_1: '1',         // 1分钟
  MIN_5: '5',         // 5分钟
  MIN_15: '15',       // 15分钟
  MIN_30: '30',       // 30分钟
  MIN_60: '60',       // 60分钟
  DAY: '1440',        // 日线（默认）
  WEEK: '10080',      // 周线
  MONTH: '86400',     // 月线
} as const;

/**
 * 默认值
 */
export const DEFAULTS = {
  PRICE: ORDER_PRICE_TYPE.OPPONENT1,
  KLINE_PERIOD: KLINE_PERIOD.DAY,
  KLINE_LENGTH: 5,
  NOTIP: true,
} as const;

/**
 * 订单状态
 */
export const ORDER_STATUS = {
  UNFILLED: '未成交',
  PARTIAL: '部分成交',
  FILLED: '全部成交',
  CANCELLED: '已撤',
  REJECTED: '废单',
} as const;

/**
 * HTTP 缓存配置
 */
const CACHE_CONFIG = {
  enabled: true,
  ttl: 1000, // 1秒缓存
};

// ==================== HTTP 缓存 ====================

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const requestCache = new Map<string, CacheEntry>();

/**
 * 清理过期缓存
 */
function cleanExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of requestCache.entries()) {
    if (now - entry.timestamp > CACHE_CONFIG.ttl) {
      requestCache.delete(key);
    }
  }
}

// 定期清理缓存
setInterval(cleanExpiredCache, CACHE_CONFIG.ttl);

// ==================== HTTP 请求 ====================

/**
 * HTTP 请求封装（支持缓存）
 */
export async function httpRequest<T = unknown>(
  path: string,
  method: 'GET' | 'POST' = 'GET',
  data?: unknown,
  options: {
    useCache?: boolean;
    timeout?: number;
  } = {}
): Promise<T> {
  const { useCache = false, timeout = BRIDGE_CONFIG.timeout } = options;
  const url = `http://${BRIDGE_CONFIG.host}:${BRIDGE_CONFIG.port}${path}`;

  // 仅对 GET 请求使用缓存
  if (method === 'GET' && useCache && CACHE_CONFIG.enabled) {
    const cached = requestCache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_CONFIG.ttl) {
      return cached.data as T;
    }
  }

  try {
    const response = await axios({
      method,
      url,
      data,
      timeout,
    });

    const result = response.data as T;

    // 缓存 GET 请求结果
    if (method === 'GET' && useCache && CACHE_CONFIG.enabled) {
      requestCache.set(url, { data: result, timestamp: Date.now() });
    }

    return result;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;

    if (axiosError.code === 'ECONNREFUSED') {
      throw new Error('无法连接到桥接服务，请先运行: xiadan server');
    }
    if (axiosError.code === 'ECONNRESET') {
      throw new Error('连接被重置，请检查网络连接');
    }
    if (axiosError.code === 'ETIMEDOUT') {
      throw new Error('请求超时，请稍后重试');
    }

    const apiError: ApiError = new Error(
      axiosError.response?.data?.message || axiosError.message || '未知错误'
    ) as ApiError;
    apiError.code = axiosError.code;
    apiError.response = axiosError.response?.data
      ? { status: axiosError.response.status }
      : undefined;

    throw apiError;
  }
}

// ==================== 命令构建 ====================

/**
 * 构建交易命令
 */
export function buildTradeCommand(builder: TradeCommandBuilder): string {
  const { action, code, price = DEFAULTS.PRICE, money, position, target, amount, notip = DEFAULTS.NOTIP } = builder;

  const parts: string[] = [action, code, price];

  if (money) {
    parts.push('-m', money);
  } else if (action === 'buy' && position) {
    parts.push('-cw', position);
  } else if (target) {
    parts.push('-zcw', target);
  } else if (amount) {
    parts.push(amount);
  }

  if (notip) {
    parts.push('-notip');
  }

  return parts.join(' ');
}

/**
 * 构建撤单命令
 */
export function buildCancelCommand(builder: CancelCommandBuilder): string {
  let cmd = 'cancel';

  switch (builder.type) {
    case 'all':
      cmd += ' all';
      break;
    case 'code':
      cmd += ` ${builder.code}`;
      if (builder.direction) {
        cmd += ` ${builder.direction}`;
      }
      break;
    case 'htbh':
      cmd += ` -h ${builder.htbh}`;
      break;
    case 'last':
      cmd += ' last';
      break;
  }

  return cmd;
}

// ==================== 通用表格格式化 ====================

interface TableConfig {
  head: string[];
  colWidths?: number[];
  rows: unknown[][];
}

/**
 * 通用表格格式化
 */
function formatGenericTable(config: TableConfig): void {
  const table = new Table({
    head: config.head,
    colWidths: config.colWidths,
  });

  config.rows.forEach(row => table.push(row as string[]));
  console.log(table.toString());
}

// ==================== 数据格式化 ====================

/**
 * 格式化价格
 */
export function formatPrice(price: unknown): string {
  const num = typeof price === 'number' ? price : parseFloat(price as string);
  return isNaN(num) ? '-' : num.toFixed(2);
}

/**
 * 格式化数字（带千分位）
 */
export function formatNumber(num: unknown, color: boolean = false): string {
  const n = typeof num === 'number' ? num : parseFloat(num as string);
  if (isNaN(n)) return '-';

  const formatted = n.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (color) {
    return n >= 0 ? chalk.red(formatted) : chalk.green(formatted);
  }

  return formatted;
}

/**
 * 格式化状态
 */
export function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    [ORDER_STATUS.UNFILLED]: chalk.yellow('未成交'),
    [ORDER_STATUS.PARTIAL]: chalk.blue('部分成交'),
    [ORDER_STATUS.FILLED]: chalk.green('已成交'),
    [ORDER_STATUS.CANCELLED]: chalk.gray('已撤单'),
    [ORDER_STATUS.REJECTED]: chalk.red('废单'),
  };

  return statusMap[status] || status;
}

/**
 * 格式化资金表格
 */
export function formatMoneyTable(data: MoneyData): void {
  if (!data || Object.keys(data).length === 0) {
    console.log(chalk.yellow('暂无资金数据'));
    return;
  }

  const labels: Record<keyof MoneyData, string> = {
    hbdw: '货币单位',
    zjye: '资金余额',
    djje: '冻结金额',
    kyje: '可用金额',
    kqje: '可取金额',
    zsz: '总市值',
    zzc: '总资产',
    sz: '市值',
  };

  const rows = (Object.entries(labels) as [keyof MoneyData, string][])
    .filter(([key]) => key in data)
    .map(([key, label]) => [label, formatNumber(data[key])]);

  formatGenericTable({
    head: [chalk.cyan('项目'), chalk.cyan('金额')],
    colWidths: [20, 20],
    rows,
  });
}

/**
 * 格式化持仓表格
 */
export function formatPositionTable(data: Record<string, PositionItem>): void {
  if (!data || Object.keys(data).length === 0) {
    console.log(chalk.yellow('暂无持仓数据'));
    return;
  }

  const formatContractNo = (s: string) => s?.substring(0, 10) || '-';
  const formatName = (s: string) => s?.substring(0, 6) || '';

  const rows = Object.entries(data).map(([code, pos]) => [
    pos.zqdm || code,
    pos.zqmc || '-',
    pos.kyye?.toString() || '0',
    pos.sjsl?.toString() || '0',
    formatPrice(pos.cbj),
    formatPrice(pos.sj),
    formatNumber(pos.yk, true),
    formatNumber(pos.sz),
  ]);

  formatGenericTable({
    head: [
      chalk.cyan('代码'),
      chalk.cyan('名称'),
      chalk.cyan('可用'),
      chalk.cyan('持仓'),
      chalk.cyan('成本'),
      chalk.cyan('现价'),
      chalk.cyan('盈亏'),
      chalk.cyan('市值'),
    ],
    rows,
  });
}

/**
 * 格式化委托表格
 */
export function formatOrderTable(data: Record<string, OrderItem[]>): void {
  if (!data || Object.keys(data).length === 0) {
    console.log(chalk.yellow('暂无委托数据'));
    return;
  }

  const formatContractNo = (s: string) => s?.substring(0, 10) || '-';
  const formatName = (s: string) => s?.substring(0, 6) || '';

  const rows: unknown[][] = [];

  for (const [code, orders] of Object.entries(data)) {
    for (const order of orders) {
      rows.push([
        formatContractNo(order.htbh || ''),
        order.zqdm || code,
        formatName(order.zqmc || ''),
        order.cz === '买入' ? chalk.green('买') : chalk.red('卖'),
        formatPrice(order.wtjg),
        order.wtsl?.toString() || '0',
        order.cjsl?.toString() || '0',
        formatStatus(order.bz || ''),
        order.wtsj || '-',
      ]);
    }
  }

  formatGenericTable({
    head: [
      chalk.cyan('合同号'),
      chalk.cyan('代码'),
      chalk.cyan('名称'),
      chalk.cyan('方向'),
      chalk.cyan('价格'),
      chalk.cyan('数量'),
      chalk.cyan('成交'),
      chalk.cyan('状态'),
      chalk.cyan('时间'),
    ],
    colWidths: [12, 8, 10, 6, 8, 8, 8, 10, 10],
    rows,
  });
}

/**
 * 格式化行情表格
 */
export function formatQuoteTable(data: QuoteData | Record<string, QuoteData>): void {
  if (!data) {
    console.log(chalk.yellow('暂无行情数据'));
    return;
  }

  // 处理返回的数据结构
  const quote = (data as QuoteData).StockCode ? data as QuoteData : (data as Record<string, QuoteData>)[Object.keys(data)[0]];

  if (!quote) {
    console.log(chalk.yellow('暂无行情数据'));
    return;
  }

  const price = parseFloat(quote.price) || 0;
  const preClose = parseFloat(quote.pre_close) || 0;
  const change = price - preClose;
  const percent = preClose > 0 ? (change / preClose) * 100 : 0;

  const changeStr = formatNumber(change, true);
  const percentStr = `${percent.toFixed(2)}%`;
  const colorFunc = change >= 0 ? chalk.red : chalk.green;

  const rows = [
    ['股票代码', quote.StockCode, '股票名称', quote.name || '-'],
    ['现价', chalk.yellow(formatPrice(price)), '昨收', formatPrice(preClose)],
    ['涨跌', colorFunc(changeStr), '涨幅%', colorFunc(percentStr)],
    ['开盘', formatPrice(quote.open), '最高', formatPrice(quote.high)],
    ['最低', formatPrice(quote.low), '涨停', formatPrice(quote.zt_p)],
    ['跌停', formatPrice(quote.dt_p), '成交量', formatNumber(quote.volume)],
    ['成交额', formatNumber(quote.amount), '换手率', `${quote.hs || 0}%`],
    ['量比', quote.lb || '-', '总市值', formatNumber(quote.zsz)]
  ];

  formatGenericTable({
    head: [chalk.cyan('项目'), chalk.cyan('值'), chalk.cyan('项目'), chalk.cyan('值')],
    rows,
  });
}

// ==================== 结果打印 ====================

/**
 * 打印交易结果
 */
export function printTradeResult(result: TradeResult): void {
  if (result.retcode === '0') {
    console.log(chalk.green('✓ 委托成功'));
    console.log(chalk.cyan('  合同编号:'), result.htbh || '-');
    console.log(chalk.cyan('  命令编号:'), result.no || '-');
  } else {
    console.log(chalk.red('✗ 委托失败'));
    console.log(chalk.red('  错误代码:'), result.retcode);
    console.log(chalk.red('  错误信息:'), result.retmsg || '-');
  }
}

/**
 * 打印错误信息
 */
export function printError(error: Error | ApiError): void {
  console.log(chalk.red('错误:'), error.message);

  const apiError = error as ApiError;
  if (apiError.response) {
    console.log(chalk.red('响应状态:'), apiError.response.status);
  }
}

// ==================== 交易执行（供自动化系统使用） ====================

/**
 * 执行交易（买入/卖出）
 * 返回 TradeResult 供自动化系统使用
 */
export async function executeTrade(
  action: 'buy' | 'sell',
  code: string,
  amount: number | string,
  price?: number,
  options?: Partial<TradeOptions>
): Promise<TradeResult> {
  try {
    const cmd = buildTradeCommand({
      action,
      code,
      amount: String(amount),
      price: price ? String(price) : DEFAULTS.PRICE,
      money: options?.money,
      position: options?.position,
      target: options?.target,
      notip: options?.notip !== undefined ? options.notip : DEFAULTS.NOTIP,
    });

    const result = await httpRequest('/cmd', 'POST', { cmd });
    return result as TradeResult;
  } catch (error) {
    const err = error as ApiError;
    return {
      retcode: '-1',
      retmsg: err.message,
    } as TradeResult;
  }
}

/**
 * 执行撤单
 * 返回 TradeResult 供自动化系统使用
 */
export async function executeCancel(
  htbh: string
): Promise<TradeResult> {
  try {
    const cmd = buildCancelCommand({ type: 'htbh', htbh });
    const result = await httpRequest('/cmd', 'POST', { cmd });
    return result as TradeResult;
  } catch (error) {
    const err = error as ApiError;
    return {
      retcode: '-1',
      retmsg: err.message,
    } as TradeResult;
  }
}


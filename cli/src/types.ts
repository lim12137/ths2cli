/**
 * 类型定义文件
 */

/**
 * 资金数据接口
 */
export interface MoneyData {
  hbdw?: string;  // 货币单位
  zjye?: number;  // 资金余额
  djje?: number;  // 冻结金额
  kyje?: number;  // 可用金额
  kqje?: number;  // 可取金额
  zsz?: number;   // 总市值
  zzc?: number;   // 总资产
  sz?: number;    // 市值
}

/**
 * 持仓数据项接口
 */
export interface PositionItem {
  zqdm?: string;   // 证券代码
  zqmc?: string;   // 证券名称
  kyye?: number;   // 可用余额
  sjsl?: number;   // 实际数量
  cbj?: number;    // 成本价
  sj?: number;     // 市价
  yk?: number;     // 盈亏
  sz?: number;     // 市值
}

/**
 * 持仓数据集合
 */
export type PositionData = Record<string, PositionItem>;

/**
 * 委托数据项接口
 */
export interface OrderItem {
  htbh?: string;   // 合同编号
  zqdm?: string;   // 证券代码
  zqmc?: string;   // 证券名称
  cz?: string;     // 操作（买入/卖出）
  wtjg?: number;   // 委托价格
  wtsl?: number;   // 委托数量
  cjsl?: number;   // 成交数量
  bz?: string;     // 备注（状态）
  wtsj?: string;   // 委托时间
}

/**
 * 委托数据集合
 */
export type OrderData = Record<string, OrderItem[]>;

/**
 * 行情数据接口
 */
export interface QuoteData {
  StockCode: string;
  name?: string;
  price: string;
  pre_close: string;
  open?: string;
  high?: string;
  low?: string;
  zt_p?: string;    // 涨停价
  dt_p?: string;    // 跌停价
  volume?: string;
  amount?: string;
  hs?: string;      // 换手率
  lb?: string;      // 量比
  zsz?: string;     // 总市值
}

/**
 * K线数据项接口
 */
export interface KlineItem {
  datetime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount: number;
}

/**
 * 交易结果接口
 */
export interface TradeResult {
  retcode: string;
  retmsg?: string;
  htbh?: string;
  no?: string;
}

/**
 * API 错误接口
 */
export interface ApiError extends Error {
  code?: string;
  response?: {
    status: number;
    data?: unknown;
  };
}

/**
 * HTTP 响应接口
 */
export interface ApiResponse<T = unknown> {
  status?: string;
  retcode?: string;
  retmsg?: string;
  data?: T;
  [key: string]: unknown;
}

/**
 * 交易选项接口
 */
export interface TradeOptions {
  price?: string;
  money?: string;
  position?: string;
  target?: string;
  notip?: boolean;
}

/**
 * 撤单选项接口
 */
export interface CancelOptions {
  code?: string;
  direction?: 'buy' | 'sell';
  all?: boolean;
  last?: boolean;
}

/**
 * K线查询选项接口
 */
export interface KlineOptions {
  period?: string;
  length?: string;
}

/**
 * 命令构建器接口
 */
export interface TradeCommandBuilder {
  action: 'buy' | 'sell';
  code: string;
  price?: string;
  amount?: string;
  money?: string;
  position?: string;
  target?: string;
  notip?: boolean;
}

/**
 * 撤单命令构建器接口
 */
export interface CancelCommandBuilder {
  type: 'all' | 'code' | 'htbh' | 'last';
  code?: string;
  htbh?: string;
  direction?: string;
}

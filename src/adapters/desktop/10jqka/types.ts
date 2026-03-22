/**
 * 同花顺适配器类型定义
 */

export interface TenjqkaQuoteData {
  StockCode: string;           // 股票代码
  MarketId: string;            // 市场ID
  open: number;                // 开盘价
  high: number;                // 最高价
  low: number;                 // 最低价
  pre_close: number;           // 昨收
  price: number;               // 现价
  b1_p: number; b1_v: number;  // 买一价、量
  b2_p: number; b2_v: number;  // 买二价、量
  b3_p: number; b3_v: number;
  b4_p: number; b4_v: number;
  b5_p: number; b5_v: number;
  a1_p: number; a1_v: number;  // 卖一价、量
  a2_p: number; a2_v: number;
  a3_p: number; a3_v: number;
  a4_p: number; a4_v: number;
  a5_p: number; a5_v: number;
  zt_p: number;                // 涨停价
  dt_p: number;                // 跌停价
  zf: number;                  // 涨幅
  zd: number;                  // 涨跌
  zsz: number;                 // 总市值
  zgb: number;                 // 总股本
  ltz: number;                 // 流通值
  ltg: number;                 // 流通股
  amount: number;              // 成交金额
  volume: number;              // 成交量
  lb: number;                  // 量比
  hs: number;                  // 换手率
}

export interface TenjqkaKlineData {
  Index: number;               // 第几条
  volume: number;              // 成交量
  amount: number;              // 成交金额
  MarketId: string;
  low: number;                 // 最低价
  close: number;               // 收盘价
  datetime: number;            // 日期时间
  high: number;                // 最高价
  StockCode: string;
  open: number;                // 开盘价
}

export interface TenjqkaMoneyData {
  hbdw: string;                // 货币单位
  zjye: number;                // 资金余额
  djje: number;                // 冻结金额
  kyje: number;                // 可用金额
  kqje: number;                // 可取金额
  zsz: number;                 // 总市值
  zzc: number;                 // 总资产
  sz: number;                  // 市值
}

export interface TenjqkaPositionData {
  hbdw: string;                // 货币单位
  yk: number;                  // 盈亏
  jysc: string;                // 交易市场
  kyye: number;                // 可用余额
  gdzh: string;                // 股东账号
  sjsl: number;                // 实际数量
  sj: number;                  // 市价
  djsl: number;                // 冻结数量
  sz: number;                  // 市值
  zqmc: string;                // 证券名称
  zqdm: string;                // 证券代码
  gpye: number;                // 股票余额
  cbj: number;                 // 成本价
}

export interface TenjqkaOrderData {
  zqdm: string;                // 证券代码
  zqmc: string;                // 证券名称
  bz: string;                  // 备注（未成交、部分成交等）
  wtsl: number;                // 委托数量
  cjsl: number;                // 成交数量
  wtjg: number;                // 委托价格
  cjjj: number;                // 成交均价
  cz: string;                  // 操作（买入/卖出）
  wtsj: string;                // 委托时间
  wtrq: string;                // 委托日期
  htbh: string;                // 合同编号
  jysc: string;                // 交易市场
  gdzh: string;                // 股东代码
  cxsl: number;                // 撤销数量
}

export enum TenjqkaOrderStatus {
  error = 'error',         // 委托前失败
  fail = 'fail',          // 委托后失败
  submitted = 'submitted', // 委托成功
  dealing = 'dealing',     // 部分成交
  dealed = 'dealed',      // 全部成交
  cancel = 'cancel',      // 撤单已报
  canceled = 'canceled',  // 已撤
  inactive = 'inactive'   // 废单
}

export interface TenjqkaTradeResult {
  retcode: string;         // '0'-成功，其他-失败
  retmsg: string;          // 返回消息
  no: string;             // 命令编号
  stockcode: string;      // 股票代码
  user?: string;          // 加密用户数据
  htbh?: string;          // 合同编号
}

export interface TenjqkaBlockData {
  zqdm: string[];          // 证券代码列表
  zqmc: string[];          // 证券名称列表
}

export enum TenjqkaPriceType {
  Latest = 'zxjg',         // 最新价
  LimitUp = 'ztjg',        // 涨停价
  LimitDown = 'dtjg',      // 跌停价
  Buy1 = 'mrj1',           // 买一价
  Buy2 = 'mrj2',
  Buy3 = 'mrj3',
  Buy4 = 'mrj4',
  Buy5 = 'mrj5',
  Sell1 = 'mcj1',          // 卖一价
  Sell2 = 'mcj2',
  Sell3 = 'mcj3',
  Sell4 = 'mcj4',
  Sell5 = 'mcj5',
  Opponent1 = 'dsj1',      // 对手价1
  Opponent2 = 'dsj2',
  Opponent3 = 'dsj3',
  Opponent4 = 'dsj4',
  Opponent5 = 'dsj5',
}

/**
 * 类型定义 - 自动化交易系统
 */

// ==================== 基础类型 ====================

export interface MarketData {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  turnover: number;
  timestamp: number;
  indicators?: {
    ma5?: number;
    ma10?: number;
    rsi?: number;
  };
}

// ==================== 规则引擎类型 ====================

export interface RuleCondition {
  type: 'price' | 'time' | 'composite' | 'external';
  operator?: '<' | '<=' | '>' | '>=' | '==' | 'AND' | 'OR' | 'NOT';
  value?: number | string;
  conditions?: RuleCondition[];
  // 价格条件专用属性
  code?: string;
  volume_check?: boolean;
  // 时间条件专用属性
  start?: string;
  end?: string;
  // 外部条件专用属性
  source?: string;
}

export interface TradeAction {
  type: 'buy' | 'sell';
  amount_type: 'fixed' | 'ratio' | 'money';
  amount?: number;
  ratio?: number;
  price_type: 'market' | 'limit' | 'opponent1' | 'zxjg' | 'ztjg' | 'dtjg';
  price?: number;
}

export interface RuleConfig {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  condition: RuleCondition;
  action: TradeAction;
  constraints?: {
    max_execution?: number;
    cooldown_seconds?: number;
    position_limit?: number;
  };
}

// ==================== 插件系统类型 ====================

export interface Plugin {
  id: string;
  name: string;
  version: string;
  init(config: any): Promise<void>;
  check(context: PluginContext): Promise<boolean>;
  execute(context: PluginContext): Promise<void>;
  destroy(): Promise<void>;
}

export interface PluginContext {
  getQuote(code: string): Promise<MarketData>;
  getKline(code: string, period: number, length: number): Promise<any>;
  buy(code: string, amount: number, options?: any): Promise<any>;
  sell(code: string, amount: number, options?: any): Promise<any>;
  getPosition(): Promise<any>;
  getMoney(): Promise<any>;
  config: any;
  notify(message: string, level?: 'info' | 'warn' | 'error'): void;
}

export interface PluginConfig {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  file: string;
  type: 'javascript' | 'python';
  config: any;
  schedule?: any;
  performance?: any;
}

// ==================== 安全控制类型 ====================

export interface SafetyConfig {
  funds: {
    max_single_trade: number;
    max_daily_trade: number;
    min_reserve: number;
  };
  position: {
    max_single_stock: number;
    max_total_position: number;
  };
  circuit_breaker: {
    enabled: boolean;
    max_consecutive_losses: number;
    cooldown_minutes: number;
    notify_on_trigger?: boolean;
  };
}

export interface TradeRequest {
  id: string;
  source: 'rule' | 'plugin';
  ruleId?: string;
  pluginId?: string;
  code?: string;
  amount: number;
  price?: number;
  action: 'buy' | 'sell';
}

export interface SafetyCheckResult {
  allowed: boolean;
  reason: string;
  message: string;
}

// ==================== 调度器类型 ====================

export interface SchedulerConfig {
  rules_path: string;
  plugins_path: string;
  plugins: PluginConfig[];
  check_interval: number;
  safety: SafetyConfig;
  monitoring: {
    log_level: string;
    check_interval: number;
    notify_channels: string[];
  };
}

// ==================== 错误处理类型 ====================

export enum ErrorType {
  NETWORK = 'network',
  API = 'api',
  SAFETY = 'safety',
  RULE = 'rule',
  PLUGIN = 'plugin',
  VALIDATION = 'validation',
}

export class TradingError extends Error {
  constructor(
    public type: ErrorType,
    public code: string,
    message: string,
    public details?: any,
    public recoverable: boolean = false
  ) {
    super(message);
    this.name = 'TradingError';
  }
}

// ==================== 配置类型 ====================

export interface GlobalConfig {
  log_level: string;
  check_interval: number;
  trade_time: {
    start: string;
    end: string;
  };
  allow_empty: boolean;
}

export interface RulesConfig {
  rules: RuleConfig[];
}

export interface PluginsConfig {
  plugins: PluginConfig[];
}

export interface MonitoringConfig {
  log_level: string;
  log_file: string;
  notifications: {
    enabled: boolean;
    channels: Array<{
      type: string;
      enabled: boolean;
      [key: string]: any;
    }>;
  };
}

// ==================== 交易结果类型 ====================

export interface TradeResult {
  success: boolean;
  htbh?: string;
  amount?: number;
  profit?: number;
  error?: string;
}

export interface PerformanceStats {
  total_trades: number;
  win_rate: number;
  total_profit: number;
  max_drawdown: number;
}

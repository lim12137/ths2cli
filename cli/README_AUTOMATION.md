# 同花顺自动化交易系统

基于规则引擎和插件系统的完全自动化交易解决方案。

## ✨ 特性

- 🎯 **规则引擎**: 基于 YAML 配置的交易规则，支持价格、时间、组合、外部信号等多种条件
- 🔌 **插件系统**: 支持 JavaScript 和 Python 插件，可扩展自定义策略
- 🛡️ **安全控制**: 资金保护、仓位限制、熔断机制
- 📊 **实时监控**: 日志记录、性能统计、多渠道通知
- 🔄 **热重载**: 配置文件修改后自动重载，无需重启

## 📁 项目结构

```
cli/
├── src/
│   ├── core/              # 核心组件
│   │   ├── Scheduler.ts        # 统一调度器
│   │   ├── RuleEngine.ts       # 规则引擎
│   │   ├── PluginManager.ts    # 插件管理器
│   │   ├── SafetyController.ts # 安全控制器
│   │   └── ConfigManager.ts    # 配置管理器
│   ├── plugins/          # 插件目录
│   ├── config/           # 配置文件
│   ├── logs/             # 日志文件
│   ├── types-auto.ts     # 类型定义
│   ├── automation.ts     # 主入口
│   ├── cli.ts            # CLI 工具入口
│   ├── commands.ts       # CLI 命令
│   └── utils.ts          # 工具函数
├── package.json
└── tsconfig.json
```

## 🚀 快速开始

### 1. 安装依赖

```bash
cd cli
npm install
```

### 2. 编译 TypeScript

```bash
npm run build
```

### 3. 配置规则

编辑 `config/rules.yaml`:

```yaml
rules:
  - id: 'rule_001'
    name: '价格买入'
    enabled: true
    condition:
      type: 'price'
      code: '600000'
      operator: '<'
      value: 9.80
    action:
      type: 'buy'
      amount_type: 'money'
      amount: 10000
```

### 4. 启动系统

```bash
node dist/automation.js start
```

## 📖 配置说明

### 规则配置 (rules.yaml)

```yaml
rules:
  - id: '规则ID'
    name: '规则名称'
    enabled: true
    priority: 1
    condition:
      type: 'price' | 'time' | 'composite' | 'external'
      operator: '<' | '>' | '<=' | '>=' | '=='
      value: 数值
    action:
      type: 'buy' | 'sell'
      amount_type: 'fixed' | 'ratio' | 'money'
      amount: 金额
    constraints:
      max_execution: 3
      cooldown_seconds: 300
```

### 插件配置 (plugins.yaml)

```yaml
plugins:
  - id: '插件ID'
    name: '插件名称'
    enabled: true
    file: 'plugin_file.js'
    type: 'javascript' | 'python'
    config:
      # 插件自定义配置
    schedule:
      check_interval: 60
```

### 安全配置

```yaml
safety:
  funds:
    max_single_trade: 50000      # 单笔交易最大金额
    max_daily_trade: 200000      # 单日交易最大金额
    min_reserve: 10000           # 最小保留资金
  position:
    max_single_stock: 0.3        # 单只股票最大仓位
    max_total_position: 0.8      # 总仓位上限
  circuit_breaker:
    enabled: true
    max_consecutive_losses: 3    # 最大连续亏损次数
    cooldown_minutes: 30         # 熔断冷却时间
```

## 🔌 插件开发

### JavaScript 插件模板

```javascript
class MyPlugin {
  async init(config) {
    // 初始化插件
  }

  async check(context) {
    // 检查交易条件
    return true; // 或 false
  }

  async execute(context) {
    // 执行交易
    await context.buy('600000', 10000);
  }

  async destroy() {
    // 清理资源
  }
}

module.exports = MyPlugin;
```

### 插件上下文 API

```javascript
{
  // 获取行情
  getQuote(code): Promise<QuoteData>

  // 获取K线
  getKline(code, period, length): Promise<KlineData>

  // 买入
  buy(code, amount, options): Promise<TradeResult>

  // 卖出
  sell(code, amount, options): Promise<TradeResult>

  // 获取持仓
  getPosition(): Promise<PositionData>

  // 获取资金
  getMoney(): Promise<MoneyData>

  // 发送通知
  notify(message, level): void
}
```

## 🎮 CLI 工具

除了自动化交易系统，还提供了 CLI 工具进行手动操作:

```bash
# 查询资金
node dist/cli.js query money

# 查询持仓
node dist/cli.js query position

# 查询委托
node dist/cli.js query orders

# 买入
node dist/cli.js trade buy 600000 10000

# 卖出
node dist/cli.js trade sell 600000 100

# 撤单
node dist/cli.js trade cancel <委托号>

# 查询行情
node dist/cli.js market quote 600000

# 查询K线
node dist/cli.js market kline 600000 1440 30
```

## 📊 监控和日志

### 日志文件

- `logs/trading.log` - 交易日志
- `logs/notifications.log` - 通知日志
- `logs/statistics.json` - 统计数据

### 实时监控

系统会输出实时日志:

```
🚀 启动自动化交易调度器...
✓ 配置加载完成
✓ 已加载 4 条交易规则
✓ 已加载 2 个插件
🔍 启动规则监控，检查间隔: 5秒
🔍 启动插件监控，检查间隔: 5秒
✓ 调度器启动成功！

📌 规则触发: 浦发银行价格买入 (rule_001)
💰 执行交易: BUY 600000 10000元
✅ 交易成功
```

## ⚠️ 风险提示

1. **自动化交易存在风险**: 本系统仅供学习研究使用，实盘交易需谨慎
2. **充分测试**: 在实盘使用前，务必在模拟环境中充分测试
3. **风险控制**: 建议设置合理的资金限制和仓位控制
4. **监控运行**: 定期检查系统运行状态和日志
5. **配置审查**: 仔细审查所有配置文件和插件代码

## 🛠️ 开发

### 编译

```bash
npm run build
```

### 监听模式（开发时使用）

```bash
npm run watch
```

### 类型检查

```bash
npm run type-check
```

## 📝 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

如有问题或建议，请提交 Issue。

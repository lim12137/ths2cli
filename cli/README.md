# 同花顺下单 CLI 工具

一个基于 Node.js 的命令行工具，提供对同花顺 xiadan.exe 的 CLI 接口，支持下单、查询、撤单等功能。

## 功能特性

- ✅ **买入/卖出**：支持多种价格类型（最新价、涨停价、跌停价、对手价等）
- ✅ **查询功能**：查询资金、持仓、委托信息
- ✅ **撤单操作**：支持按合同编号、股票代码、方向撤单，或全部撤单
- ✅ **行情查询**：查询实时行情和K线数据
- ✅ **美观输出**：使用表格展示数据，支持颜色高亮

## 安装

### 1. 安装依赖

```bash
cd cli
npm install
```

### 2. 编译 TypeScript

```bash
npm run build
```

### 3. 全局安装（可选）

```bash
npm link
```

## 使用方法

### 测试连接

首先确保同花顺客户端已启动，然后测试连接：

```bash
xiadan test
```

### 查询功能

#### 查询资金

```bash
xiadan query money
```

输出示例：
```
📊 账户资金信息

┌────────────────────┬────────────────────┐
│ 项目               │ 金额               │
├────────────────────┼────────────────────┤
│ 资金余额           │ 10,000.00          │
│ 可用金额           │ 9,500.00           │
│ 总资产             │ 100,000.00         │
│ 总市值             │ 90,000.00          │
└────────────────────┴────────────────────┘
```

#### 查询持仓

```bash
# 查询所有持仓
xiadan query position

# 查询特定股票持仓
xiadan query position -c 600000
```

#### 查询委托

```bash
# 查询可撤委托
xiadan query orders

# 查询全部委托（包括已成交）
xiadan query orders --all
```

### 交易功能

#### 买入股票

```bash
# 基本用法：按对手价买入100股
xiadan trade buy 600000 100

# 指定价格买入
xiadan trade buy 600000 100 --price 10.50

# 按金额买入（买入10000元）
xiadan trade buy 600000 0 --money 10000

# 买入到目标仓位（买入后持仓占总资产1/4）
xiadan trade buy 600000 0 --target 1/4

# 使用不同价格类型
xiadan trade buy 600000 100 --price zxjg  # 最新价
xiadan trade buy 600000 100 --price ztjg  # 涨停价
xiadan trade buy 600000 100 --price dtjg  # 跌停价
xiadan trade buy 600000 100 --price dsj1  # 对手价1
```

**价格类型说明：**
- `zxjg` - 最新价
- `ztjg` - 涨停价
- `dtjg` - 跌停价
- `mrj1~mrj5` - 买一价到买五价
- `mcj1~mcj5` - 卖一价到卖五价
- `dsj1~dsj5` - 对手价1到对手价5

#### 卖出股票

```bash
# 基本用法：按对手价卖出100股
xiadan trade sell 600000 100

# 指定价格卖出
xiadan trade sell 600000 100 --price 10.50

# 按金额卖出（卖出10000元）
xiadan trade sell 600000 0 --money 10000

# 卖出到目标仓位（卖出后持仓占总资产1/4）
xiadan trade sell 600000 0 --target 1/4
```

#### 撤单操作

```bash
# 按合同编号撤单
xiadan trade cancel 123456789

# 撤销某股票的所有委托
xiadan trade cancel --code 600000

# 撤销某股票的所有买单
xiadan trade cancel --code 600000 --direction buy

# 撤销某股票的所有卖单
xiadan trade cancel --code 600000 --direction sell

# 撤销最后一条委托
xiadan trade cancel --last

# 全部撤单
xiadan trade cancel-all

# 按代码撤单快捷方式
xiadan trade cancel-code 600000
```

### 行情查询

#### 查询实时行情

```bash
xiadan market quote 600000
```

输出示例：
```
📈 行情信息

┌────────────────────┬────────────────────┬────────────────────┬────────────────────┐
│ 项目               │ 值                 │ 项目               │ 值                 │
├────────────────────┼────────────────────┼────────────────────┼────────────────────┤
│ 股票代码           │ 600000             │ 股票名称           │ 浦发银行           │
│ 现价               │ 10.50              │ 昨收               │ 10.30              │
│ 涨跌               │ +0.20              │ 涨幅%              │ +1.94%             │
│ 开盘               │ 10.35              │ 最高               │ 10.55              │
│ 最低               │ 10.28              │ 涨停               │ 11.33              │
│ 跌停               │ 9.27               │ 成交量             │ 1,234,567          │
└────────────────────┴────────────────────┴────────────────────┴────────────────────┘
```

#### 查询K线数据

```bash
# 查询日线数据（默认5条）
xiadan market kline 600000

# 查询周线数据
xiadan market kline 600000 --period 7200

# 查询更多K线数据
xiadan market kline 600000 --length 20
```

**周期说明：**
- `1` - 1分钟
- `5` - 5分钟
- `30` - 30分钟
- `60` - 60分钟
- `1440` - 日线（默认）
- `7200` - 周线
- `86400` - 月线

### 启动桥接服务

如果需要手动启动 Python 桥接服务：

```bash
xiadan server --port 18888
```

## 项目结构

```
cli/
├── src/
│   ├── cli.ts           # 主程序入口
│   ├── commands.ts      # 命令实现
│   └── utils.ts         # 工具函数
├── bridge_server.py     # Python桥接服务
├── package.json
├── tsconfig.json
└── README.md
```

## 工作原理

1. **桥接服务**：Python HTTP 服务器运行在同花顺环境中
2. **CLI 工具**：Node.js 命令行工具通过 HTTP 与桥接服务通信
3. **API 调用**：桥接服务调用同花顺 Python API（xiadan.py）
4. **数据返回**：结果以 JSON 格式返回给 CLI 工具

## 配置

桥接服务配置（`src/utils.ts`）：

```typescript
export const BRIDGE_CONFIG = {
  host: '127.0.0.1',
  port: 18888,
  timeout: 30000,
};
```

## 注意事项

1. **同花顺客户端必须先启动**
2. **需要登录交易账户**才能进行交易操作
3. **建议在交易时间**使用，非交易时间可能无法获取实时数据
4. **使用模拟账户**测试，避免真实资金风险
5. **确认交易参数**后再执行，避免误操作

## 故障排查

### 无法连接到桥接服务

```
错误: 无法连接到桥接服务，请先运行: xiadan server
```

**解决方案：**
1. 确保同花顺客户端已启动
2. 手动启动 Python 桥接服务
3. 检查端口 18888 是否被占用

### 导入错误

```
Error: Cannot import ths_api
```

**解决方案：**
1. 确认同花顺安装路径正确
2. 检查 Python 环境配置
3. 确保 xiadan.py 文件存在

## 开发

### 修改代码后重新编译

```bash
npm run build
```

### 监听模式（自动编译）

```bash
npm run watch
```

### 直接运行 TypeScript

```bash
npm run dev buy 600000 100
```

## 安全提示

⚠️ **重要提示：**
1. 本工具仅用于学习和个人使用
2. 使用前请充分测试，建议先用模拟账户
3. 作者不对任何交易损失负责
4. 请遵守相关法律法规

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

# 同花顺 xiadan.exe CLI 工具开发总结

## 项目概述

本项目为同花顺交易客户端（xiadan.exe）创建了一个完整的命令行接口（CLI）工具，支持下单、查询、撤单等核心交易功能。

## 项目结构

```
D:\同花顺远航版\transaction\
├── cli/                              # CLI 工具目录
│   ├── src/                          # 源代码目录
│   │   ├── cli.ts                    # 主程序入口，定义命令结构
│   │   ├── commands.ts               # 命令实现（买入、卖出、撤单、查询等）
│   │   └── utils.ts                  # 工具函数（HTTP请求、数据格式化等）
│   ├── bridge_server.py              # Python HTTP 桥接服务器
│   ├── package.json                  # Node.js 项目配置
│   ├── tsconfig.json                 # TypeScript 配置
│   ├── README.md                     # 详细使用文档
│   ├── EXAMPLES.md                   # 使用示例
│   ├── install.bat                   # Windows 快速安装脚本
│   ├── install.sh                    # Linux/Mac 快速安装脚本
│   └── .gitignore                    # Git 忽略文件
│
├── python3.5.0_32/                   # 同花顺 Python 环境
│   └── Lib/
│       ├── xiadan.py                 # 同花顺交易 API
│       └── site-packages/ths_api/    # 同花顺 API 包
│
└── xiadan.exe                        # 同花顺交易客户端
```

## 核心功能

### 1. 查询功能

#### 查询资金
```bash
xiadan query money
```
显示账户资金余额、可用金额、总资产等信息。

#### 查询持仓
```bash
# 查询所有持仓
xiadan query position

# 查询特定股票
xiadan query position -c 600000
```
显示持仓股票、数量、成本价、盈亏等信息。

#### 查询委托
```bash
# 查询可撤委托
xiadan query orders

# 查询全部委托
xiadan query orders --all
```
显示未成交、部分成交的委托信息。

### 2. 交易功能

#### 买入股票
```bash
# 基本用法：按对手价买入
xiadan trade buy 600000 100

# 指定价格买入
xiadan trade buy 600000 100 --price 10.50

# 按金额买入
xiadan trade buy 600000 0 --money 10000

# 买入到目标仓位
xiadan trade buy 600000 0 --target 1/4
```

**支持的价格类型：**
- `zxjg` - 最新价
- `ztjg` - 涨停价
- `dtjg` - 跌停价
- `mrj1~mrj5` - 买一价到买五价
- `mcj1~mcj5` - 卖一价到卖五价
- `dsj1~dsj5` - 对手价1到对手价5

#### 卖出股票
```bash
# 基本用法：按对手价卖出
xiadan trade sell 600000 100

# 指定价格卖出
xiadan trade sell 600000 100 --price 10.50

# 按金额卖出
xiadan trade sell 600000 0 --money 10000

# 卖出到目标仓位
xiadan trade sell 600000 0 --target 1/4
```

### 3. 撤单功能

```bash
# 按合同编号撤单
xiadan trade cancel 123456789

# 撤销某股票的所有委托
xiadan trade cancel --code 600000

# 撤销某股票的买单
xiadan trade cancel --code 600000 --direction buy

# 撤销某股票的卖单
xiadan trade cancel --code 600000 --direction sell

# 全部撤单
xiadan trade cancel-all

# 按代码撤单快捷方式
xiadan trade cancel-code 600000
```

### 4. 行情查询

```bash
# 查询实时行情
xiadan market quote 600000

# 查询K线数据
xiadan market kline 600000 --period 1440 --length 10
```

**K线周期：**
- `1` - 1分钟
- `5` - 5分钟
- `30` - 30分钟
- `60` - 60分钟
- `1440` - 日线（默认）
- `7200` - 周线
- `86400` - 月线

## 技术架构

### 1. 架构设计

```
┌─────────────┐         HTTP          ┌──────────────┐
│   CLI 工具   │ ────────────────────▶│  桥接服务     │
│ (Node.js)   │                       │  (Python)     │
└─────────────┘                       └──────────────┘
                                               │
                                               ▼
                                        ┌──────────────┐
                                        │  同花顺 API   │
                                        │ (xiadan.py)  │
                                        └──────────────┘
```

### 2. 技术栈

- **前端 CLI**: Node.js + TypeScript
- **框架**: Commander.js（命令行框架）
- **UI 库**: Chalk（颜色）、cli-table3（表格）、Ora（加载动画）
- **桥接服务**: Python HTTP Server
- **API**: 同花顺 Python API (ths_api)

### 3. 数据流程

1. 用户输入命令 → CLI 工具解析
2. CLI 工具 → HTTP 请求 → 桥接服务
3. 桥接服务 → 调用同花顺 API
4. 同花顺 API → 返回数据 → 桥接服务
5. 桥接服务 → HTTP 响应 → CLI 工具
6. CLI 工具 → 格式化输出 → 用户

## 安装部署

### 方式一：快速安装（推荐）

**Windows:**
```bash
cd cli
install.bat
```

**Linux/Mac:**
```bash
cd cli
chmod +x install.sh
./install.sh
```

### 方式二：手动安装

```bash
# 1. 进入 CLI 目录
cd cli

# 2. 安装依赖
npm install

# 3. 编译 TypeScript
npm run build

# 4. 测试
node dist/cli.js test
```

## 使用示例

### 基本使用流程

```bash
# 1. 确保同花顺客户端已启动并登录

# 2. 测试连接
node dist/cli.js test

# 3. 查询账户信息
node dist/cli.js query money
node dist/cli.js query position

# 4. 执行交易
node dist/cli.js trade buy 600000 100

# 5. 查询委托
node dist/cli.js query orders

# 6. 如需撤单
node dist/cli.js trade cancel-all
```

### 批量交易示例

创建批处理脚本 `trade.bat`:

```batch
@echo off
echo 开始批量交易...

# 买入多只股票
node dist/cli.js trade buy 600000 100 --notip
timeout /t 2

node dist/cli.js trade buy 000001 200 --notip
timeout /t 2

# 查询持仓
node dist/cli.js query position

echo 批量交易完成！
```

## 安全提示

⚠️ **重要注意事项：**

1. **测试环境**：建议先用模拟账户测试，避免真实资金风险
2. **参数确认**：执行交易前仔细确认股票代码、价格、数量
3. **交易时间**：在交易时间使用，非交易时间可能无法获取实时数据
4. **网络稳定**：确保网络连接稳定，避免交易中断
5. **风险控制**：设置合理的交易金额和数量
6. **日志记录**：建议记录交易日志，便于后续查询

## 故障排查

### 常见问题

**1. 无法连接到桥接服务**
```
错误: 无法连接到桥接服务
```
解决方案：
- 确保同花顺客户端已启动
- 手动启动桥接服务：`python bridge_server.py 18888`
- 检查端口是否被占用

**2. 导入错误**
```
Error: Cannot import ths_api
```
解决方案：
- 确认同花顺安装路径正确
- 检查 Python 环境配置
- 确保 xiadan.py 文件存在

**3. 编译错误**
```
编译失败
```
解决方案：
```bash
rm -rf node_modules dist
npm install
npm run build
```

## 扩展开发

### 添加新命令

1. 在 `src/commands.ts` 中添加新函数
2. 在 `src/cli.ts` 中注册新命令
3. 重新编译：`npm run build`

示例：
```typescript
// commands.ts
export async function myNewCommand(options: any) {
  // 实现新功能
}

// cli.ts
program
  .command('mycommand <param>')
  .description('我的新命令')
  .action(commands.myNewCommand);
```

## 项目优势

1. **简单易用**：命令行界面，操作直观
2. **功能完整**：支持下单、查询、撤单等核心功能
3. **扩展性强**：易于添加新功能和自定义命令
4. **跨平台**：支持 Windows、Linux、Mac
5. **安全可靠**：直接调用同花顺 API，数据准确
6. **开源免费**：MIT 许可证，可自由使用和修改

## 后续优化方向

1. **交互模式**：添加交互式命令行界面
2. **条件单**：支持价格条件自动交易
3. **策略回测**：集成策略回测功能
4. **通知提醒**：交易成交后发送通知
5. **配置文件**：支持配置常用参数
6. **日志记录**：详细记录所有交易操作
7. **多账户**：支持多账户管理
8. **云同步**：支持配置和数据云同步

## 相关文档

- [README.md](./README.md) - 详细使用文档
- [EXAMPLES.md](./EXAMPLES.md) - 使用示例
- [同花顺 API 文档](../python3.5.0_32/Lib/xiadan.py) - API 接口说明

## 技术支持

如有问题或建议，欢迎反馈！

---

**免责声明**：本工具仅供学习和个人使用，使用者需自行承担交易风险，作者不对任何交易损失负责。请遵守相关法律法规，理性投资。

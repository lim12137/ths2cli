# 使用示例

## 快速开始

### 1. 安装依赖

```bash
cd cli
npm install
```

### 2. 编译项目

```bash
npm run build
```

### 3. 测试连接

确保同花顺客户端已启动，然后运行：

```bash
node dist/cli.js test
```

或者如果已全局安装：

```bash
xiadan test
```

## 常用命令示例

### 查询账户信息

```bash
# 查询资金
node dist/cli.js query money

# 查询持仓
node dist/cli.js query position

# 查询委托
node dist/cli.js query orders
```

### 交易操作

```bash
# 以对手价买入 100 股浦发银行（600000）
node dist/cli.js trade buy 600000 100

# 以最新价卖出 100 股
node dist/cli.js trade sell 600000 100 --price zxjg

# 按金额买入 10000 元
node dist/cli.js trade buy 600000 0 --money 10000

# 买入到目标仓位（总资产的1/4）
node dist/cli.js trade buy 600000 0 --target 1/4
```

### 撤单操作

```bash
# 撤销指定合同号的委托
node dist/cli.js trade cancel 123456789

# 撤销某股票的所有委托
node dist/cli.js trade cancel --code 600000

# 全部撤单
node dist/cli.js trade cancel-all
```

### 查询行情

```bash
# 查询实时行情
node dist/cli.js market quote 600000

# 查询K线数据
node dist/cli.js market kline 600000 --period 1440 --length 10
```

## 价格类型说明

在交易命令中，可以使用以下价格类型：

- `zxjg` - 最新价
- `ztjg` - 涨停价
- `dtjg` - 跌停价
- `mrj1` ~ `mrj5` - 买一价到买五价
- `mcj1` ~ `mcj5` - 卖一价到卖五价
- `dsj1` ~ `dsj5` - 对手价1到对手价5（默认）

示例：

```bash
# 以涨停价买入
node dist/cli.js trade buy 600000 100 --price ztjg

# 以跌停价卖出
node dist/cli.js trade sell 600000 100 --price dtjg

# 以买一价买入
node dist/cli.js trade buy 600000 100 --price mrj1
```

## K线周期说明

查询K线时可以指定不同的周期：

- `1` - 1分钟
- `5` - 5分钟
- `15` - 15分钟
- `30` - 30分钟
- `60` - 60分钟
- `1440` - 日线（默认）
- `7200` - 周线
- `86400` - 月线

示例：

```bash
# 查询5分钟K线
node dist/cli.js market kline 600000 --period 5 --length 20

# 查询周线
node dist/cli.js market kline 600000 --period 7200 --length 10
```

## 批量操作示例

创建一个批处理脚本 `batch_trade.bat`（Windows）或 `batch_trade.sh`（Linux/Mac）：

### Windows 批处理示例

```batch
@echo off
echo 开始批量交易...

买入股票1
node dist/cli.js trade buy 600000 100 --notip
timeout /t 2

买入股票2
node dist/cli.js trade buy 000001 200 --notip
timeout /t 2

查询持仓
node dist/cli.js query position

echo 批量交易完成！
pause
```

### Linux/Mac Shell 示例

```bash
#!/bin/bash
echo "开始批量交易..."

# 买入股票1
./dist/cli.js trade buy 600000 100 --notip
sleep 2

# 买入股票2
./dist/cli.js trade buy 000001 200 --notip
sleep 2

# 查询持仓
./dist/cli.js query position

echo "批量交易完成！"
```

## Python 脚本集成

也可以在 Python 脚本中调用：

```python
import subprocess
import json

def buy_stock(code, amount, price='dsj1'):
    """买入股票"""
    cmd = ['node', 'dist/cli.js', 'trade', 'buy', code, str(amount), '--price', price]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.stdout

def query_position():
    """查询持仓"""
    cmd = ['node', 'dist/cli.js', 'query', 'position']
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.stdout

# 使用示例
if __name__ == '__main__':
    # 买入股票
    print(buy_stock('600000', 100))

    # 查询持仓
    print(query_position())
```

## Node.js 脚本集成

在 Node.js 项目中直接使用模块：

```javascript
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function buyStock(code, amount, price = 'dsj1') {
    const cmd = `node dist/cli.js trade buy ${code} ${amount} --price ${price}`;
    const { stdout, stderr } = await execPromise(cmd);
    return stdout;
}

async function queryMoney() {
    const cmd = 'node dist/cli.js query money';
    const { stdout, stderr } = await execPromise(cmd);
    return stdout;
}

// 使用示例
(async () => {
    try {
        // 买入股票
        console.log(await buyStock('600000', 100));

        // 查询资金
        console.log(await queryMoney());
    } catch (error) {
        console.error('错误:', error);
    }
})();
```

## 注意事项

1. **测试环境**：建议先用模拟账户测试
2. **参数确认**：执行交易前仔细确认参数
3. **网络连接**：确保网络连接稳定
4. **交易时间**：在交易时间使用以获取实时数据
5. **错误处理**：注意查看错误提示信息

## 故障排查

### 问题：无法连接到桥接服务

```bash
# 启动桥接服务
python bridge_server.py 18888
```

### 问题：命令未找到

```bash
# 使用完整路径运行
node dist/cli.js test

# 或者添加到 PATH
export PATH="$PATH:$(pwd)"
```

### 问题：编译错误

```bash
# 清理并重新安装
rm -rf node_modules dist
npm install
npm run build
```

## 高级用法

### 监控模式

使用 `watch` 命令监控持仓变化：

```bash
# Linux/Mac
watch -n 5 "node dist/cli.js query position"

# Windows（PowerShell）
while($true) { node dist/cli.js query position; Start-Sleep -Seconds 5 }
```

### 条件单示例

创建简单的条件单脚本：

```javascript
// condition_trade.js
const axios = require('axios');

async function checkAndTrade(code, targetPrice) {
    // 查询行情
    const quote = await axios.get(`http://127.0.0.1:18888/quote?code=${code}`);
    const currentPrice = quote.data[code].price;

    console.log(`当前价格: ${currentPrice}, 目标价格: ${targetPrice}`);

    if (currentPrice <= targetPrice) {
        // 价格符合条件，执行买入
        const { exec } = require('child_process');
        exec(`node dist/cli.js trade buy ${code} 100 --notip`);
        console.log('已执行买入');
        return true;
    }

    return false;
}

// 每5秒检查一次
setInterval(() => {
    checkAndTrade('600000', 10.0);
}, 5000);
```

## 更多帮助

查看完整命令列表：

```bash
node dist/cli.js --help
```

查看特定命令的帮助：

```bash
node dist/cli.js trade --help
node dist/cli.js query --help
node dist/cli.js market --help
```

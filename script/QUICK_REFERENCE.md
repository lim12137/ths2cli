# 同花顺交易接口快速参考

## 💰 资金查询

```python
import xiadan as xd

# 获取资金信息
money = xd.g_money
print(f"总资产: {money['zzc']}")
print(f"可用资金: {money['kyje']}")
print(f"持仓市值: {money['zsz']}")
```

## 📊 持仓查询

```python
# 获取持仓
position = xd.g_position
for code, pos in position.items():
    print(f"{pos['zqmc']}: {pos['sjsl']}股")
    print(f"  成本: {pos['cbj']}")
    print(f"  盈亏: {pos['yk']}")
```

## 📝 委托查询

```python
# 获取委托
orders = xd.g_order
for code, order_list in orders.items():
    for order in order_list:
        print(f"{order['zqmc']} {order['cz']} {order['wtsl']}股")
        print(f"  状态: {order['bz']}")
        print(f"  合同号: {order['htbh']}")
```

## 🛒 买入命令

### 基础买入
```python
# 以最新价买入100股
xd.cmd('buy 600000 zxjg 100')

# 以涨停价买入
xd.cmd('buy 600000 ztjg 100')

# 以对手价买入（卖一价）
xd.cmd('buy 600000 dsj1 100')
```

### 按金额买入
```python
# 买入1万元
xd.cmd('buy 600000 zxjg -m 10000')
```

### 按仓位买入
```python
# 买入可用资金的1/3
xd.cmd('buy 600000 zxjg -cw 1/3')

# 买入到50%仓位
xd.cmd('buy 600000 zxjg -zcw 0.5')
```

### 不弹窗确认
```python
# 添加 -notip 参数
xd.cmd('buy 600000 zxjg 100 -notip')
```

## 🛕 卖出命令

### 基础卖出
```python
# 以最新价卖出100股
xd.cmd('sell 600000 zxjg 100')

# 以跌停价卖出
xd.cmd('sell 600000 dtjg 100')

# 以对手价卖出（买一价）
xd.cmd('sell 600000 dsj1 100')
```

### 按金额卖出
```python
# 卖出1万元
xd.cmd('sell 600000 zxjg -m 10000')
```

### 卖出到目标仓位
```python
# 卖出到持仓只剩25%
xd.cmd('sell 600000 zxjg -zcw 0.25')
```

## ❌ 撤单命令

```python
# 撤销指定合同号
xd.cmd('cancel -h 1234567890')

# 撤销某股票所有委托
xd.cmd('cancel 600000')

# 撤销某股票买单
xd.cmd('cancel 600000 buy')

# 撤销某股票卖单
xd.cmd('cancel 600000 sell')

# 全部撤单
xd.cmd('cancel all')
```

## 📈 价格类型说明

| 代码 | 说明 | 价格 |
|------|------|------|
| zxjg | 最新价 | 当前成交价 |
| ztjg | 涨停价 | 今日涨停价 |
| dtjg | 跌停价 | 今日跌停价 |
| mrj1 | 买一价 | 买一档价格 |
| mrj2 | 买二价 | 买二档价格 |
| mrj3 | 买三价 | 买三档价格 |
| mcj1 | 卖一价 | 卖一档价格 |
| mcj2 | 卖二价 | 卖二档价格 |
| mcj3 | 卖三价 | 卖三档价格 |
| dsj1 | 对手价1 | 卖一价 |
| dsj2 | 对手价2 | 卖二价 |
| dsj3 | 对手价3 | 卖三价 |

## ⚡ 快速示例

### 示例1：查看账户
```python
import xiadan as xd

# 一行代码查看总资产
print("总资产:", xd.g_money['zzc'])
```

### 示例2：快速买入
```python
# 以涨停价买入100股，不弹窗
xd.cmd('buy 600000 ztjg 100 -notip')
```

### 示例3：快速卖出
```python
# 以最新价卖出全部持仓
pos = xd.g_position
if '600000' in pos:
    amount = pos['600000']['kyye']
    xd.cmd(f'sell 600000 zxjg {amount} -notip')
```

### 示例4：全部撤单
```python
# 一行代码撤销所有委托
xd.cmd('cancel all')
```

## 🎯 常见场景

### 场景1：涨停买入
```python
# 监控涨停
api = hq.ths_hq_api()
quote = api.get_quote('600000')
price = quote['600000']['price']
limit_up = quote['600000']['zt_p']

if abs(price - limit_up) < 0.01:
    xd.cmd('buy 600000 ztjg 100 -notip')
```

### 场景2：破位止损
```python
# 跌破成本5%止损
code = '600000'
pos = xd.g_position

if code in pos:
    cost = pos[code]['cbj']
    api = hq.ths_hq_api()
    quote = api.get_quote(code)

    if quote[code]['price'] < cost * 0.95:
        amount = pos[code]['kyye']
        xd.cmd(f'sell {code} zxjg {amount} -notip')
```

### 场景3：盈利止盈
```python
# 盈利20%止盈
code = '600000'
pos = xd.g_position

if code in pos:
    cost = pos[code]['cbj']
    api = hq.ths_hq_api()
    quote = api.get_quote(code)

    if quote[code]['price'] > cost * 1.2:
        amount = pos[code]['kyye']
        xd.cmd(f'sell {code} zxjg {amount} -notip')
```

### 场景4：尾盘买入
```python
# 14:50买入
import datetime

now = datetime.datetime.now()
if now.strftime('%H:%M') >= '14:50':
    xd.cmd('buy 600000 zxjg 100 -notip')
```

## ⚠️ 安全提示

1. **测试时使用小金额**
2. **先在模拟账户测试**
3. **添加 -notip 前确认理解命令**
4. **设置好止损止盈**
5. **记录所有交易**

## 📝 命令格式总结

```
买入: buy [代码] [价格] [数量/金额/仓位] [参数]
卖出: sell [代码] [价格] [数量/金额/仓位] [参数]
撤单: cancel [合同号/代码/方向] [参数]

价格: zxjg/ztjg/dtjg/mcj1~mcj5/mrj1~mrj5/dsj1~dsj5/具体价格
数量: 固定数字
金额: -m 金额值
仓位: -cw 比例 (如 1/3)
目标仓位: -zcw 比例 (如 0.5)
参数: -notip (不弹窗)
```

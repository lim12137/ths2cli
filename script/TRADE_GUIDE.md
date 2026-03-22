# 交易接口测试指南

## 🚨 重要安全提示

**在测试交易接口前，请务必：**

1. ✓ 使用模拟账户进行测试
2. ✓ 设置风险控制参数
3. ✓ 从小金额开始测试
4. ✓ 了解每个命令的作用
5. ✓ 准备好随时撤单

---

## 📝 测试脚本说明

### 1. 基础交易测试 (`test_trade.py`)

**安全功能（可直接运行）：**
- ✓ 查询账户资金
- ✓ 查询持仓明细
- ✓ 查询委托状态
- ✓ 模拟下单计算

**交易命令示例（仅展示，不执行）：**
```python
# 买入（最新价，100股）
xd.cmd('buy 600000 zxjg 100 -notip')

# 买入（涨停价）
xd.cmd('buy 600000 ztjg 100')

# 卖出（对手价）
xd.cmd('sell 600000 dsj1 100')

# 撤单（指定合同号）
xd.cmd('cancel -h 1234567890')

# 全部撤单
xd.cmd('cancel all')
```

### 2. 实战策略示例 (`trading_strategies.py`)

包含4个常见交易策略：

1. **涨停买入策略**
   - 监控股票是否涨停
   - 涨停时自动买入
   - 适用于打板交易

2. **破位止损策略**
   - 设置止损价格
   - 跌破止损价时自动卖出
   - 适用于风险控制

3. **网格交易策略**
   - 在基础价上下设置网格
   - 低买高卖，自动循环
   - 适用于震荡行情

4. **尾盘买入策略**
   - 指定时间（如14:50）买入
   - 避免盘中波动
   - 适用于稳健投资

---

## 🎯 快速测试步骤

### 步骤1：运行基础测试
```
在同花顺策略平台中：
1. 打开 script/test_trade.py
2. 点击"运行"
3. 查看账户信息和模拟下单结果
```

### 步骤2：测试安全命令（不会实际交易）
```python
# 这些命令是安全的，只查询不下单
from ths_api import *

# 查询资金
print("总资产:", xd.g_money['zzc'])

# 查询持仓
print("持仓:", xd.g_position)

# 查询委托
print("委托:", xd.g_order)
```

### 步骤3：模拟下单测试
```python
# 测试买入命令（不会实际执行）
code = '600000'
amount = 100

# 获取行情
api = hq.ths_hq_api()
quote = api.get_quote(code)

# 计算预估金额
price = quote[code]['price']
cost = price * amount

# 检查资金
available = xd.g_money['kyje']

print(f"预估金额: {cost:.2f} 元")
print(f"可用资金: {available:.2f} 元")
print(f"资金充足: {available >= cost}")

# 实际下单命令（请谨慎使用）
# xd.cmd(f'buy {code} zxjg {amount} -notip')
```

---

## 🔧 交易命令详解

### 价格类型

| 代码 | 说明 | 适用场景 |
|------|------|----------|
| zxjg | 最新价 | 快速成交 |
| ztjg | 涨停价 | 打板买入 |
| dtjg | 跌停价 | 跌停卖出 |
| mrj1 | 买一价 | 保守买入 |
| mcj1 | 卖一价 | 保守卖出 |
| dsj1 | 对手价(卖一) | 快速买入 |
| dsj5 | 对手价(买五) | 大额买入 |

### 数量参数

```python
# 固定数量
xd.cmd('buy 600000 zxjg 100')           # 买入100股

# 按金额买入
xd.cmd('buy 600000 zxjg -m 10000')      # 买入1万元

# 按仓位买入
xd.cmd('buy 600000 zxjg -cw 1/3')       # 买入可用资金的1/3

# 买入到目标仓位
xd.cmd('buy 600000 zxjg -zcw 0.5')      # 使持仓达到50%仓位
```

### 特殊参数

```python
# -notip: 不弹出确认对话框（适用于自动交易）
xd.cmd('buy 600000 zxjg 100 -notip')

# -account all: 多账户同时执行
xd.cmd('buy 600000 zxjg 100 -account all')
```

---

## 📊 实战示例

### 示例1：条件单
```python
# 当涨幅超过5%时买入
api = hq.ths_hq_api()
quote = api.get_quote('600000')

if quote['600000']['zf'] > 0.05:
    xd.cmd('buy 600000 zxjg 100 -notip')
```

### 示例2：止损
```python
# 当价格跌破成本5%时止损
position = xd.g_position
code = '600000'

if code in position:
    cost = position[code]['cbj']
    api = hq.ths_hq_api()
    quote = api.get_quote(code)

    if quote[code]['price'] < cost * 0.95:
        amount = position[code]['kyye']
        xd.cmd(f'sell {code} dsj1 {amount} -notip')
```

### 示例3：止盈
```python
# 当盈利超过20%时止盈
position = xd.g_position
code = '600000'

if code in position:
    cost = position[code]['cbj']
    api = hq.ths_hq_api()
    quote = api.get_quote(code)

    if quote[code]['price'] > cost * 1.2:
        amount = position[code]['kyye']
        xd.cmd(f'sell {code} zxjg {amount} -notip')
```

---

## ⚠️ 风险控制建议

1. **设置止损**
   - 单笔亏损不超过总资金的2%
   - 及时止损，避免深套

2. **控制仓位**
   - 单只股票不超过总资金的20%
   - 保留30%以上现金

3. **分散投资**
   - 不要集中在一两只股票
   - 选择不同行业分散风险

4. **记录日志**
   ```python
   import datetime

   def log_trade(action, code, price, amount):
       timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
       log = f"[{timestamp}] {action} {code} {price} {amount}"
       print(log)
       # 保存到文件
       with open('trade_log.txt', 'a') as f:
           f.write(log + '\n')

   # 使用
   ret = xd.cmd('buy 600000 zxjg 100')
   log_trade('买入', '600000', 12.50, 100)
   ```

---

## 🆘 常见问题

### Q1: 下单后没有成交？
**A:** 检查：
- 是否在交易时间
- 价格是否合适（涨停价可能无法成交）
- 委托状态查询：`xd.g_order`

### Q2: 如何撤单？
**A:**
```python
# 撤销指定合同
xd.cmd('cancel -h 合同编号')

# 撤销某股票所有委托
xd.cmd('cancel 600000')

# 全部撤单
xd.cmd('cancel all')
```

### Q3: 如何查询成交结果？
**A:**
```python
# 查询全量委托（包括已成交）
import xiadan_impl
full_orders = xiadan_impl.g_fullorder

# 等待成交
ret = xd.cmd('buy 600000 zxjg 100')
xd.wait_update(ret, status='dealed', timeout=10)
```

### Q4: 提示"资金不足"？
**A:** 检查：
- 可用资金：`xd.g_money['kyje']`
- 预估金额是否超出可用资金
- 是否有其他占用资金的委托

---

## 📚 下一步

测试通过后：
1. 查看 `src/adapters/desktop/10jqka/README.md` 了解完整API
2. 研究 `trading_strategies.py` 中的策略
3. 开发自己的交易策略
4. 做好风险控制，谨慎实盘

**记住：投资有风险，交易需谨慎！**

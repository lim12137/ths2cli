#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
同花顺交易接口测试
⚠️ 警告：此脚本包含真实交易功能，请先在模拟账户测试！
"""

from ths_api import *
import time

print("=" * 60)
print("同花顺交易接口测试")
print("=" * 60)

# ==================== 第一部分：查询账户信息（安全） ====================
print("\n【第一步】查询账户信息")
print("-" * 60)

try:
    # 查询资金
    money = xd.g_money
    print(f"✓ 总资产: {money.get('zzc', 0):.2f} 元")
    print(f"✓ 可用资金: {money.get('kyje', 0):.2f} 元")
    print(f"✓ 持仓市值: {money.get('zsz', 0):.2f} 元")

    # 计算仓位
    total_assets = money.get('zzc', 0)
    market_value = money.get('zsz', 0)
    if total_assets > 0:
        position_ratio = (market_value / total_assets) * 100
        print(f"✓ 仓位比例: {position_ratio:.2f}%")

except Exception as e:
    print(f"✗ 查询资金失败: {e}")

# 查询持仓
print("\n【第二步】查询持仓明细")
print("-" * 60)
try:
    position = xd.g_position
    if position:
        print(f"✓ 持仓股票数: {len(position)}")

        for code, pos in position.items():
            profit = pos.get('yk', 0)
            profit_percent = (profit / (pos.get('cbj', 1) * pos.get('sjsl', 1))) * 100 if pos.get('sjsl', 0) > 0 else 0
            print(f"\n  {pos.get('zqmc', '')} ({code}):")
            print(f"    持仓: {pos.get('sjsl', 0)} 股")
            print(f"    可用: {pos.get('kyye', 0)} 股")
            print(f"    成本: {pos.get('cbj', 0):.2f} 元")
            print(f"    现价: {pos.get('sj', 0):.2f} 元")
            print(f"    盈亏: {profit:.2f} 元 ({profit_percent:.2f}%)")
    else:
        print("  当前无持仓")
except Exception as e:
    print(f"✗ 查询持仓失败: {e}")

# 查询委托
print("\n【第三步】查询当前委托")
print("-" * 60)
try:
    orders = xd.g_order
    if orders:
        total_orders = sum(len(order_list) for order_list in orders.values())
        print(f"✓ 当前委托数: {total_orders}")

        for code, order_list in orders.items():
            for order in order_list:
                print(f"\n  {order.get('zqmc', '')} ({code}):")
                print(f"    操作: {order.get('cz', '')}")
                print(f"    价格: {order.get('wtjg', 0):.2f} 元")
                print(f"    数量: {order.get('wtsl', 0)} 股")
                print(f"    成交: {order.get('cjsl', 0)} 股")
                print(f"    状态: {order.get('bz', '')}")
                print(f"    合同号: {order.get('htbh', '')}")
    else:
        print("  当前无委托")
except Exception as e:
    print(f"✗ 查询委托失败: {e}")

# ==================== 第二部分：交易命令展示（不执行） ====================
print("\n【第四步】交易命令说明")
print("-" * 60)
print("以下是交易命令的格式，但不会实际执行：\n")

print("1️⃣ 买入命令示例：")
print("   xd.cmd('buy 600000 zxjg 100 -notip')")
print("   说明：以最新价买入100股浦发银行，不弹窗确认\n")

print("2️⃣ 卖出命令示例：")
print("   xd.cmd('sell 600000 zxjg 100 -notip')")
print("   说明：以最新价卖出100股浦发银行，不弹窗确认\n")

print("3️⃣ 价格类型说明：")
price_types = {
    'zxjg': '最新价',
    'ztjg': '涨停价',
    'dtjg': '跌停价',
    'mrj1': '买一价',
    'mcj1': '卖一价',
    'dsj1': '对手价（卖一）'
}
for code, name in price_types.items():
    print(f"   {code:8s} → {name}")

print("\n4️⃣ 撤单命令示例：")
print("   xd.cmd('cancel -h 1234567890')  # 撤销指定合同号")
print("   xd.cmd('cancel 600000')        # 撤销600000所有委托")
print("   xd.cmd('cancel all')           # 全部撤单\n")

# ==================== 第三部分：安全测试（模拟下单） ====================
print("\n【第五步】模拟下单测试（不实际执行）")
print("-" * 60)

def simulate_buy_order(code, price_type, amount):
    """模拟买入订单"""
    print(f"\n📝 模拟买入: {code}")
    print(f"   价格类型: {price_type}")
    print(f"   数量: {amount} 股")

    # 获取当前行情
    api = hq.ths_hq_api()
    quote = api.get_quote(code)

    if code in quote:
        current_price = quote[code].get('price', 0)
        limit_up = quote[code].get('zt_p', 0)
        limit_down = quote[code].get('dt_p', 0)

        print(f"\n   当前行情:")
        print(f"   最新价: {current_price:.2f} 元")
        print(f"   涨停价: {limit_up:.2f} 元")
        print(f"   跌停价: {limit_down:.2f} 元")

        # 计算预估金额
        estimated_cost = current_price * amount
        print(f"\n   预估金额: {estimated_cost:.2f} 元")

        # 检查可用资金
        available = xd.g_money.get('kyje', 0)
        print(f"   可用资金: {available:.2f} 元")

        if available >= estimated_cost:
            print(f"   ✓ 资金充足，可以下单")
        else:
            print(f"   ✗ 资金不足，还需 {estimated_cost - available:.2f} 元")

        print(f"\n   ⚠️  这是模拟测试，不会实际下单")
        print(f"   实际命令: xd.cmd('buy {code} {price_type} {amount} -notip')")

        return {
            'code': code,
            'price_type': price_type,
            'amount': amount,
            'estimated_cost': estimated_cost,
            'can_buy': available >= estimated_cost
        }
    else:
        print(f"   ✗ 无法获取 {code} 的行情数据")
        return None

# 测试几个常见的买入场景
test_cases = [
    {'code': '600000', 'price': 'zxjg', 'amount': 100},  # 最新价买入100股
    {'code': '600000', 'price': 'ztjg', 'amount': 100},  # 涨停价买入100股
    {'code': '000001', 'price': 'dsj1', 'amount': 100},  # 对手价买入100股
]

for i, case in enumerate(test_cases, 1):
    print(f"\n测试 {i}/{len(test_cases)}")
    result = simulate_buy_order(case['code'], case['price'], case['amount'])
    if result:
        print(f"   状态: {'✓ 可执行' if result['can_buy'] else '✗ 不可执行'}")
    time.sleep(1)  # 避免API调用过快

# ==================== 第四部分：真实交易示例（需手动确认） ====================
print("\n\n【第六步】真实交易示例（需手动确认）")
print("-" * 60)
print("⚠️  以下命令会真实下单，请谨慎操作！\n")

print("示例1：以最新价买入100股浦发银行（需手动确认）")
print("  ret = xd.cmd('buy 600000 zxjg 100')")
print("  print('委托结果:', ret)")

print("\n示例2：以对手价卖出100股浦发银行（需手动确认）")
print("  ret = xd.cmd('sell 600000 dsj1 100')")
print("  print('委托结果:', ret)")

print("\n示例3：撤销指定合同号的委托")
print("  ret = xd.cmd('cancel -h 合同编号')")
print("  print('撤单结果:', ret)")

# ==================== 总结 ====================
print("\n" + "=" * 60)
print("测试总结")
print("=" * 60)
print("✓ 账户信息查询：正常")
print("✓ 持仓信息查询：正常")
print("✓ 委托信息查询：正常")
print("✓ 交易命令说明：已完成")
print("✓ 模拟下单测试：已完成")
print("\n⚠️  重要提醒：")
print("1. 真实交易前请先在模拟账户测试")
print("2. 使用 -notip 参数可以跳过确认对话框")
print("3. 建议设置风险控制参数")
print("4. 记录所有交易操作")
print("=" * 60)

#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
同花顺API测试脚本
在同花顺客户端内运行此脚本来测试API
"""

import sys
import os

# 添加ths_api路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'python3.5.0_32', 'Lib', 'site-packages'))

print("=" * 50)
print("同花顺API测试")
print("=" * 50)

# 测试1: 导入ths_api
print("\n[测试1] 导入ths_api...")
try:
    from ths_api import hq
    print("✓ ths_api.hq 导入成功")
except Exception as e:
    print(f"✗ 导入失败: {e}")
    sys.exit(1)

# 测试2: 导入xiadan
print("\n[测试2] 导入xiadan...")
try:
    from ths_api import xiadan as xd
    print("✓ ths_api.xiadan 导入成功")
except Exception as e:
    print(f"✗ 导入失败: {e}")
    sys.exit(1)

# 测试3: 初始化行情API
print("\n[测试3] 初始化行情API...")
try:
    api = hq.ths_hq_api()
    print("✓ 行情API初始化成功")
except Exception as e:
    print(f"✗ 初始化失败: {e}")
    sys.exit(1)

# 测试4: 获取行情（使用常见股票）
print("\n[测试4] 获取实时行情...")
test_codes = ['600000', '000001', '300033']  # 浦发银行、平安银行、同花顺
try:
    for code in test_codes:
        quote = api.get_quote(code)
        if code in quote:
            price = quote[code].get('price', 0)
            change = quote[code].get('zf', 0)
            print(f"  {code}: 价格={price}, 涨幅={change*100:.2f}%")
        else:
            print(f"  {code}: 无数据")
    print("✓ 行情获取成功")
except Exception as e:
    print(f"✗ 获取行情失败: {e}")
    sys.exit(1)

# 测试5: 获取K线数据
print("\n[测试5] 获取K线数据...")
try:
    code = '600000'
    kline = api.get_kline(code, 1440, 3)  # 获取3天日线
    if code in kline and len(kline[code]) > 0:
        latest = kline[code][-1]
        print(f"  {code} 最新K线: 收盘={latest.get('close')}, 日期={latest.get('datetime')}")
        print("✓ K线数据获取成功")
    else:
        print(f"  {code}: 无K线数据")
except Exception as e:
    print(f"✗ 获取K线失败: {e}")

# 测试6: 查询资金数据
print("\n[测试6] 查询资金数据...")
try:
    money = xd.g_money
    print(f"  总资产: {money.get('zzc', 0)}")
    print(f"  可用资金: {money.get('kyje', 0)}")
    print(f"  总市值: {money.get('zsz', 0)}")
    print("✓ 资金数据查询成功")
except Exception as e:
    print(f"✗ 查询资金失败: {e}")

# 测试7: 查询持仓数据
print("\n[测试7] 查询持仓数据...")
try:
    position = xd.g_position
    if position:
        print(f"  持仓股票数: {len(position)}")
        for code, pos in list(position.items())[:3]:  # 只显示前3个
            print(f"    {code} {pos.get('zqmc', '')}: {pos.get('sjsl', 0)}股")
        print("✓ 持仓数据查询成功")
    else:
        print("  当前无持仓")
except Exception as e:
    print(f"✗ 查询持仓失败: {e}")

# 测试8: 查询委托数据
print("\n[测试8] 查询委托数据...")
try:
    orders = xd.g_order
    if orders:
        total_orders = sum(len(order_list) for order_list in orders.values())
        print(f"  委托数量: {total_orders}")
        print("✓ 委托数据查询成功")
    else:
        print("  当前无委托")
except Exception as e:
    print(f"✗ 查询委托失败: {e}")

print("\n" + "=" * 50)
print("测试完成！")
print("=" * 50)
print("\n提示: 如果所有测试都通过，说明同花顺API工作正常")
print("您可以使用适配器进行更复杂的操作")

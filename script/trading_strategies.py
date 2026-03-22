#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
交易实战策略示例
⚠️  仅用于演示，实际使用请根据风险承受能力调整
"""

from ths_api import *
import time

print("=" * 60)
print("交易策略示例")
print("=" * 60)

# ==================== 策略1：条件买单 ====================
def strategy_limit_up_buy(code, amount=100):
    """
    策略：涨停买入
    逻辑：当股票涨停时，以涨停价买入
    用途：打板交易
    """
    print(f"\n策略1：涨停买入 {code}")
    print("-" * 40)

    api = hq.ths_hq_api()

    while True:
        try:
            quote = api.get_quote(code)

            if code in quote:
                price = quote[code].get('price', 0)
                limit_up = quote[code].get('zt_p', 0)
                is_limit_up = abs(price - limit_up) < 0.01

                if is_limit_up:
                    print(f"✓ {code} 已涨停，当前价 {price:.2f}")

                    # 检查是否已有委托
                    orders = xd.g_order
                    has_order = False
                    if code in orders:
                        for order in orders[code]:
                            if order.get('bz') in ['未成交', '部分成交']:
                                has_order = True
                                break

                    if not has_order:
                        print(f"  → 以涨停价买入 {amount} 股")
                        # 实际下单（取消注释即可执行）
                        # ret = xd.cmd(f'buy {code} ztjg {amount} -notip')
                        # print(f"  委托结果: {ret}")

                        # 模拟下单
                        print(f"  ⚠️  模拟下单: buy {code} ztjg {amount} -notip")
                        break
                    else:
                        print(f"  → 已有委托，不再重复下单")
                        break
                else:
                    zf = quote[code].get('zf', 0)
                    print(f"  当前涨幅: {zf*100:.2f}%, 未涨停")

            time.sleep(1)  # 每秒检查一次

        except Exception as e:
            print(f"错误: {e}")
            time.sleep(5)

# ==================== 策略2：破位止损 ====================
def strategy_stop_loss(code, stop_price, amount=None):
    """
    策略：破位止损
    逻辑：当价格跌破止损价时，立即卖出
    用途：风险控制
    """
    print(f"\n策略2：破位止损 {code}")
    print(f"止损价: {stop_price:.2f}")
    print("-" * 40)

    api = hq.ths_hq_api()

    # 获取可用持仓
    position = xd.g_position
    if code not in position:
        print(f"✗ 未持有 {code}，无需止损")
        return

    if amount is None:
        amount = position[code].get('kyye', 0)  # 默认卖出全部可用

    print(f"持仓数量: {amount} 股")

    while True:
        try:
            quote = api.get_quote(code)

            if code in quote:
                price = quote[code].get('price', 0)

                if price <= stop_price:
                    print(f"⚠️  触发止损！当前价 {price:.2f} ≤ 止损价 {stop_price:.2f}")

                    # 实际下单（取消注释即可执行）
                    # ret = xd.cmd(f'sell {code} dsj1 {amount} -notip')
                    # print(f"委托结果: {ret}")

                    # 模拟下单
                    print(f"⚠️  模拟下单: sell {code} dsj1 {amount} -notip")
                    break
                else:
                    diff = ((price - stop_price) / stop_price) * 100
                    print(f"  当前价 {price:.2f}, 距止损价 {diff:.2f}%")

            time.sleep(1)

        except Exception as e:
            print(f"错误: {e}")
            time.sleep(5)

# ==================== 策略3：网格交易 ====================
def strategy_grid_trade(code, base_price, grid_spacing=0.01, grid_size=5, amount=100):
    """
    策略：网格交易
    逻辑：在基础价格上下设置网格，自动低买高卖
    用途：震荡行情获利
    """
    print(f"\n策略3：网格交易 {code}")
    print(f"基础价格: {base_price:.2f}")
    print(f"网格间距: {grid_spacing*100:.2f}%")
    print(f"网格数量: {grid_size}")
    print("-" * 40)

    # 生成网格价位
    buy_levels = []
    sell_levels = []

    for i in range(1, grid_size + 1):
        buy_levels.append(base_price * (1 - grid_spacing * i))
        sell_levels.append(base_price * (1 + grid_spacing * i))

    print("买入档位:")
    for i, price in enumerate(buy_levels, 1):
        print(f"  买入{i}: {price:.2f} 元")

    print("\n卖出档位:")
    for i, price in enumerate(sell_levels, 1):
        print(f"  卖出{i}: {price:.2f} 元")

    api = hq.ths_hq_api()

    while True:
        try:
            quote = api.get_quote(code)

            if code in quote:
                price = quote[code].get('price', 0)

                # 检查买入档位
                for i, buy_price in enumerate(buy_levels):
                    if price <= buy_price:
                        print(f"✓ 触发买入档位{i} ({buy_price:.2f}元)")

                        # 实际下单
                        # ret = xd.cmd(f'buy {code} {buy_price:.2f} {amount} -notip')
                        print(f"⚠️  模拟下单: buy {code} {buy_price:.2f} {amount} -notip")

                        # 移除已触发档位
                        buy_levels.pop(i)
                        break

                # 检查卖出档位
                for i, sell_price in enumerate(sell_levels):
                    if price >= sell_price:
                        print(f"✓ 触发卖出档位{i} ({sell_price:.2f}元)")

                        # 检查持仓
                        position = xd.g_position
                        available = position.get(code, {}).get('kyye', 0)

                        if available >= amount:
                            # 实际下单
                            # ret = xd.cmd(f'sell {code} {sell_price:.2f} {amount} -notip')
                            print(f"⚠️  模拟下单: sell {code} {sell_price:.2f} {amount} -notip")

                            # 移除已触发档位
                            sell_levels.pop(i)
                            break
                        else:
                            print(f"  持仓不足，无法卖出")

                # 检查是否还有网格
                if not buy_levels and not sell_levels:
                    print("\n所有网格档位已触发，策略结束")
                    break

            time.sleep(1)

        except Exception as e:
            print(f"错误: {e}")
            time.sleep(5)

# ==================== 策略4：尾盘买入 ====================
def strategy_afternoon_buy(code, buy_time='14:50', amount=100):
    """
    策略：尾盘买入
    逻辑：在指定时间（如14:50）以最新价买入
    用途：避免盘中波动，尾盘确定性高
    """
    print(f"\n策略4：尾盘买入 {code}")
    print(f"买入时间: {buy_time}")
    print("-" * 40)

    import datetime

    while True:
        now = datetime.datetime.now()
        current_time = now.strftime('%H:%M')

        if current_time >= buy_time:
            print(f"✓ 到达买入时间 {buy_time}")

            api = hq.ths_hq_api()
            quote = api.get_quote(code)

            if code in quote:
                price = quote[code].get('price', 0)
                print(f"  当前价: {price:.2f}")

                # 实际下单
                # ret = xd.cmd(f'buy {code} zxjg {amount} -notip')
                print(f"⚠️  模拟下单: buy {code} zxjg {amount} -notip")
                break
        else:
            print(f"  等待中... 当前时间 {current_time}")

        time.sleep(60)  # 每分钟检查一次

# ==================== 主程序 ====================
if __name__ == '__main__':
    print("\n可用策略：")
    print("1. 涨停买入策略")
    print("2. 破位止损策略")
    print("3. 网格交易策略")
    print("4. 尾盘买入策略")
    print("\n⚠️  所有策略默认为模拟模式")
    print("    要启用真实交易，请取消相关代码的注释\n")

    # 示例：运行破位止损策略
    # strategy_stop_loss('600000', stop_price=11.50)

    # 示例：运行网格交易策略
    # strategy_grid_trade('600000', base_price=12.00, grid_spacing=0.01, grid_size=3)

    print("\n请选择要运行的策略，取消注释相应代码即可")

#!/usr/bin/env python
# -*- coding: utf-8 -*-

'''
@brief MACD条件：
    一次金叉/死叉：当程序启动后，出现新的金叉/死叉，条件触发，执行设置的委托。
    二次金叉/死叉：设置某个时间长度，持续监控最近期的该时间窗口，当程序启动后，出现新的金叉/死叉，且在窗口中以前出现过至少一次金叉/死叉时，条件触发，执行设置的委托。
    底背离/顶背离：设置某个时间长度，持续监控最近期的该时间窗口，当程序启动后，股价出现新低/新高（该新低/新高比窗口中的低点/高点更低/更高），但此时DIF未创新低/新高，条件触发，执行设置的委托。
    下述例子为：以15分钟为K线周期，取最近期的50个周期为监测的时间窗口，当在该窗口中出现二次死叉，以最新价格卖出000001 500股
'''

from ths_api import *


def order(code, amount):
    mmlb = 'sell'
    zqdm = code
    wtjg = 'zxjg'
    wtsl = amount
    cmdstr = '%s %s %s %s -notip' % (mmlb, zqdm, wtjg, wtsl)
    xd.cmd(cmdstr)


def main():
    code = '000001'
    period_macd = 15  # 1,5,15,30,60=>1,5,15,30,60分钟线；24*60=>日线
    period_inspect = 50  # 检查的周期数，例如，检查当前往前的50个周期，是否有出现二次金叉（顶背离等）
    form_macd = 's'  # 'j':金叉；'s':死叉
    form_macd_count = 2  # 1,2=>1次，2次(金叉或死叉）；3=>顶或底背离
    amount = '500'
    api = hq.ths_hq_api()
    quote = api.reg_quote(code)

    while True:
        api.wait_update()
        kline_highhis = []  # K线最高价列表
        kline_lowhis = []  # K线最低价列表
        MACD_his = []  # MACD柱状图值列表
        dif_his = []  # dif值列表
        cross_j = []  # 出现金叉次数
        cross_s = []  # 出现死叉次数
        kline = api.get_kline(code, period_macd, period_inspect + 100)
        valuelist_MACD = api.MACD(kline, code, 12, 26, 9)
        tmp = kline[code][-period_inspect:]
        for i in tmp:
            kline_highhis.append(i['high'])
            kline_lowhis.append(i['low'])

        for i in range(-period_inspect - 1, -1):
            MACD_his.append(valuelist_MACD.iloc[i, 2])
            dif_his.append(valuelist_MACD.iloc[i, 0])

        for i in range(1, len(MACD_his) - 1):
            if MACD_his[i - 1] < 0 and MACD_his[i] > 0:
                cross_j.append(1)  # 金叉
            elif MACD_his[i - 1] > 0 and MACD_his[i] < 0:
                cross_s.append(1)  # 死叉
            else:
                pass


        if form_macd == 'j' and form_macd_count == 1 and valuelist_MACD.iloc[-2, 2] < 0 and valuelist_MACD.iloc[
            -1, 2] > 0:  # 一次金叉
            order(code, amount)
        elif form_macd == 's' and form_macd_count == 1 and valuelist_MACD.iloc[-2, 2] > 0 and valuelist_MACD.iloc[
            -1, 2] < 0:  # 一次死叉
            order(code, amount)
        else:
            pass

        if form_macd == 'j' and form_macd_count == 2 and len(cross_j) >= 1 and valuelist_MACD.iloc[-2, 2] < 0 and \
                        valuelist_MACD.iloc[-1, 2] > 0:  # 二次金叉
            order(code, amount)
        elif form_macd == 's' and form_macd_count == 2 and len(cross_s) >= 1 and valuelist_MACD.iloc[-2, 2] > 0 and \
                        valuelist_MACD.iloc[-1, 2] < 0:  # 二次死叉
            order(code, amount)
        else:
            pass

        if max(kline_highhis[1:-2]) >= kline_highhis[-2] and max(kline_highhis[1:-2]) >= kline_highhis[0] and max(dif_his[1:-2]) >= dif_his[-2] and max(dif_his[1:-2]) >= dif_his[0] and form_macd == 's' and form_macd_count == 3:
            if max(kline_highhis[:-1]) <= kline_highhis[-1]:  # 股价创新高
                if max(dif_his[:-1]) > dif_his[-1]:  # DIF未创新高
                    order(code, amount)  # 顶背离
        if min(kline_lowhis[1:-2]) <= kline_lowhis[-2] and min(kline_lowhis[1:-2]) <= kline_lowhis[0] and min(dif_his[1:-2]) <= dif_his[-2] and min(dif_his[1:-2]) <= dif_his[0] and form_macd == 'j' and form_macd_count == 3:
            if min(kline_lowhis[:-1]) >= kline_lowhis[-1]:  # 股价创新低
                if min(dif_his[:-1]) < dif_his[-1]:  # DIF未创新低
                    order(code, amount)  # 底背离


if __name__ == '__main__':
    main()
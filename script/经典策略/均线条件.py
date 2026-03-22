#!/usr/bin/env python
# -*- coding: utf-8 -*-

'''
@brief 股价条件-参照均线：当股价达到某一周期的均线位置时触发
       设置触发条件为：股价上涨或下跌到某一周期（5日、10日、20日等）均线，持续监控股票价格和均线，达到条件则触发相应操作（一般是委托）
       下述例子为：股价下跌到20日均线，以最新价格卖出000001 500股
'''

from ths_api import *


def order(code):
    mmlb = 'sell'
    zqdm = code
    wtjg = 'zxjg'
    wtsl = '500'
    cmdstr = '%s %s %s %s' % (mmlb, zqdm, wtjg, wtsl)
    xd.cmd(cmdstr)


def main():
    code = '000001'
    ma_lenth = 20
    direction_klinetoma = 'down'
    api = hq.ths_hq_api()
    quote = api.reg_quote(code)

    while True:
        api.wait_update()
        price = quote[code]['price']
        kline = api.get_kline(code, 24 * 60, ma_lenth)
        valuelist_ma = api.MA(kline, code, ma_lenth, m=0)
        valuetoday_ma = valuelist_ma.iloc[-1, 0]
        print(valuelist_ma)

        if price <= valuetoday_ma and direction_klinetoma == 'down':
            order(code)
            print('股价：', price)
            print('均线价格：', valuetoday_ma)
            break
        elif price > valuetoday_ma and direction_klinetoma == 'up':
            order(code)
            print('股价：', price)
            print('均线价格：', valuetoday_ma)
            break
        else:
            pass


if __name__ == '__main__':
    main()
#!/usr/bin/env python
# -*- coding: utf-8 -*-

'''
@brief 反弹买入
       下述例子：600000相对现价下跌3%，从最低点反弹5%后买入1手
'''

from ths_api import *

def order(price):
    mmlb = 'buy'
    zqdm = '600000'
    wtsl = 100
    cmd = '%s %s %.3f %d -notip' % (mmlb, zqdm, float(price), wtsl)
    xd.cmd(cmd)

def xd_condition(price_before, price_now):
    if (price_before - price_now) / price_before >= 0.03:
        return True
    return False

def ft_condition(price_before, price_now):
    if (price_now - price_before) / price_before >= 0.05:
        return True
    return False

def main():
    code = '600000'
    api = hq.ths_hq_api()
    quote = api.reg_quote(code)
    api.wait_update()
    price_base = float(quote[code]['price'])  # 现价
    price_xd = 0.00

    while True:
        api.wait_update()
        price = float(quote[code]['price'])
        print(price)
        if price_xd == 0.00 and xd_condition(price_base, price) == True:
            price_xd = price
        elif price_xd > 0.00 and ft_condition(price_xd, price) == True:
            order(price)
            break

if __name__ == '__main__':
    main()


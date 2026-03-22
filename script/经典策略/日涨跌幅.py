#!/usr/bin/env python
# -*- coding: utf-8 -*-

'''
@brief 日涨跌幅：盘中股价相对于昨收价的涨跌幅超过设定阈值
       下述例子为：股票涨了8%，以涨停价格买300033 至50%仓位
'''

from ths_api import *

def order():
    mmlb = 'buy'
    zqdm = '300033'
    wtjg = 'ztjg'
    cmd = '%s %s %s -zcw 1/2 -notip' % (mmlb, zqdm, wtjg)
    xd.cmd(cmd)

def price_increase(price_before, price_after):
    inc = (price_after - price_before) / price_before
    if inc >= 0.08:
        return True
    return False

def main():
    code = '300033'
    api = hq.ths_hq_api()
    quote = api.reg_quote(code)
    while True:
        api.wait_update()
        price_pre = quote[code]['pre_close']
        price = quote[code]['price']
        if price_increase(float(price_pre), float(price)) == True:
            order()
            break

if __name__ == '__main__':
    main()
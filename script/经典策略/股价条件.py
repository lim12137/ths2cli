#!/usr/bin/env python
# -*- coding: utf-8 -*-

'''
@brief 股价条件-参照价格：设定一个触发价格，当股价上涨或下跌到此价格时触发
       下面例子为：股价达到15.67，以最新价格卖掉000001 500股
'''

from ths_api import *


def order(codelist, trade_direction, amount):
    mmlb = trade_direction
    zqdm = codelist
    wtjg = 'zxjg'
    wtsl = amount
    cmdstr = '%s %s %s %s -notip' % (mmlb, zqdm, wtjg, wtsl)
    xd.cmd(cmdstr)


def main():
    codelist = '000001'
    threshold = 15.67
    trade_direction = 'sell'
    amount = '500'
    api = hq.ths_hq_api()
    quote = api.reg_quote(codelist)
    api.wait_update()
    price = quote[codelist]['price']
    if price >= threshold:
        direction = 'down'
    else:
        direction = 'up'

    while True:
        api.wait_update()
        price = quote[codelist]['price']

        if price <= threshold and direction == 'down':
            order(codelist, trade_direction, amount)
            break
        elif price >= threshold and direction == 'up':
            order(codelist, trade_direction, amount)
            break
        else:
            pass


if __name__ == '__main__':
    main()
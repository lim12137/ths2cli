#!/usr/bin/env python
# -*- coding: utf-8 -*-

'''
@brief 5分钟涨跌幅：现在和5分钟之前的价格比较
       持续监控最近5分钟股票涨跌幅，若5分钟股票涨跌幅超过设定阈值则触发相应操作（一般是委托）
       下述例子为：5分钟股票跌了5%，以跌停价格卖掉000001 1/2仓位
'''

import time
from ths_api import *

def order():
    mmlb = 'sell'
    zqdm = '000001'
    wtjg = 'dtjg'
    cmd = '%s %s %s -cw 1/2 -notip' % (mmlb, zqdm, wtjg)
    xd.cmd(cmd)

def price_decrease(price_before, price_after):
    dec = (price_after - price_before) / price_before
    if dec <= -0.05:
        return True
    return False


def main():
    codelist = '000001'
    api = hq.ths_hq_api()
    quote = api.reg_quote(codelist)
    api.wait_update()
    price_before = quote['000001']['price']

    while True:
        time.sleep(300) # 300s == 5分钟
        api.wait_update()

        price = quote['000001']['price']
        print(price)
        if price_decrease(float(price_before), float(price)) == True:
            order()
            break
        else:
            price_before = price

if __name__ == '__main__':
    main()
        
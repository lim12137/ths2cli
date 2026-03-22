#!/usr/bin/env python
# -*- coding: utf-8 -*-

'''
@brief 止盈止损
       1、设定1个触发价格，当股价上涨或下跌到此价格时触发
       2、当股价到某一周期（5日、10日、20日等）的均线位置触发

       下述例子：监控000725，价格上涨10%则清仓，价格触发5日均线则买入100手
'''

from ths_api import *

def buy(code, price, amount):
    mmlb = 'buy'
    zqdm = code
    wtjg = float(price)
    wtsl = int(amount)
    cmd = '%s %s %.3f %d -notip' % (mmlb, zqdm, wtjg, wtsl)
    xd.cmd(cmd)

def sell(code):
    mmlb = 'sell'
    zqdm = code
    wtjg = 'ztjg'
    cmd = '%s %s %s -zcw 0 -notip' % (mmlb, zqdm, wtjg)
    xd.cmd(cmd)

def get_average_price(kline, code, lenth):
    df = api.MA(kline, code, lenth)
    today_ma = df.iloc[-1,0]
    return today_ma
    

def main():
    code = '000725'
    api = hq.ths_hq_api()
    quote = api.reg_quote(code)
    kline = api.reg_kline(code, '1440', 5)
    while True:
        api.wait_update()
        zf = float(quote[code]['zf'])
        if zf >= 0.1:
            sell(code)
        
        price = float(quote[code]['price'])
        price_aver = get_average_price(kline, code, 5)
        if  price == price_aver:
            buy(code, price, 100)


if __name__ == '__main__':
    main()

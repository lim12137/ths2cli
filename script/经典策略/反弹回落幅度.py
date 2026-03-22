#!/usr/bin/env python
# -*- coding: utf-8 -*-

'''
@brief 反弹回落幅度：
       持续监控最近time_second的时间段内，股票的反弹回落幅度（当前的最新价和时间段内的最低价、最高价比较），若该幅度超过设定阈值则触发相应操作（一般是委托）
       下述例子为：60分钟股票最新价较该时段内的最低价上涨了2%，以最新价格卖掉000001 500股
'''

import time
from ths_api import *


def order(code, trade_direction, amount):
    mmlb = trade_direction
    zqdm = code
    wtjg = 'zxjg'
    wtsl = amount
    cmdstr = '%s %s %s %s' % (mmlb, zqdm, wtjg, wtsl)
    xd.cmd(cmdstr)


def price_range(price_before, price_after, threshold):
    dec = (price_after - price_before) / price_before
    if threshold <= 0 and dec <= threshold:
        return True
    elif threshold > 0 and dec >= threshold:
        return True
    else:
        return False


def main():
    code = '000001'
    threshold = 0.02  # 涨跌幅阈值，跌为负，涨为正；跌幅小于负的阈值或涨幅大于正的阈值，条件触发；阈值不为百分数，是实际值，如上涨2%为0.02
    trade_direction = 'sell'
    amount = '500'
    time_second = 60 * 60  # 监控的时间段长度，单位：秒; 可输入范围：0到24*60*60
    api = hq.ths_hq_api()
    quote = api.reg_quote(code)
    api.wait_update()
    price_before = quote[code]['price']
    localtime = time.localtime(time.time())
    localtime_cal = localtime.tm_hour * 60 * 60 + localtime.tm_min * 60 + localtime.tm_sec
    localtime_cal0 = localtime_cal
    today0 = localtime.tm_mday
    print(localtime_cal0)
    price_his = []
    time_his = []

    while True:
        api.wait_update()
        price = quote[code]['price']
        print(price)
        localtime = time.localtime(time.time())
        localtime_cal = localtime.tm_hour * 60 * 60 + localtime.tm_min * 60 + localtime.tm_sec
        today = localtime.tm_mday
        if today != today0:
            price_his = []
            today0 = today
        if localtime_cal >= 13 * 60 * 60 and localtime_cal <= 13 * 60 * 60 + time_second and localtime_cal0 <= 11.5 * 60 * 60:
            localtime_cal0 = localtime_cal0 + 1.5 * 60 * 60

        if localtime_cal - localtime_cal0 > time_second:
            price_his.append(price)
            time_his.append(localtime_cal)
            price_his.remove(price_his[0])
            time_his.remove(time_his[0])
            localtime_cal0 = time_his[0]
        else:
            price_his.append(price)
            time_his.append(localtime_cal)
            localtime_cal0 = time_his[0]

        if threshold <= 0:
            price_before = max(price_his)
        else:
            price_before = min(price_his)

        if price_range(float(price_before), float(price), threshold) == True:
            order(code, trade_direction, amount)
            break


if __name__ == '__main__':
    main()
#!/usr/bin/env python
# -*- coding: utf-8 -*-

'''
@brief 定时买卖股票策略
       下述例子：到了14:30的时候，以最新价格买入100手000725
'''

import time
from ths_api import *

dict_params = {
	"code" : "161815",
	"price" : "zxjg",
	"amount" : "200"
}

dict_descs={
    "code":{
        "desc":"证券代码",
        "type":"combo",
        "values":"300033,600000,161815"
    },
    "price":{
        "desc":"委托价格",
        "type":"edit"
    },
    "amount":{
        "desc":"委托数量"
    }
}


def order():
    mmlb = 'buy'
    zqdm = dict_params['code']
    wtjg = dict_params['price']
    wtsl = int(dict_params['amount'])
    cmd = '%s %s %s %d' % (mmlb, zqdm, wtjg, wtsl)
    xd.cmd(cmd)

def now():
    curtime = time.strftime('%H:%M:%S', time.localtime())
    return curtime

def main():
    while True:
        curtime = now()
        if int(curtime.replace(':', '')) >= int('14:30:00'.replace(':', '')):
            order()
            break

if __name__ == '__main__':
    main()

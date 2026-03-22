#!/usr/bin/env python
# -*- coding: utf-8 -*-

'''
当用户的持仓股票中有股票涨停，当封单金额小于1000万时，预判股票会打开涨停板，此时系统预判委托卖出一定比例的该股票
'''

from ths_api import *


positionlist = []

dict_params = {
	"keep" : "10000000",
	"rate" : "0.50"
}            

dict_descs={
    "keep":{
        "desc":"封单金额",
        "type":"edit"
    },
    "rate":{
        "desc":"减仓比例",
        "type":"edit"
    }
}        

def order(code):    
    mmlb = 'sell'
    zqdm = code
    wtsl = dict_params['rate']
    cmd = '{} {} zxjg -cw {} -notip'.format(mmlb, zqdm, wtsl)
    xd.cmd(cmd)

def positionList():
    global positionlist
    positionlist = list(xd.g_position.keys())

def main():
    positionList()
    api = hq.ths_hq_api()
    quote = api.reg_quote(positionlist)
    
    while True:
        api.wait_update()
        for code in positionlist:
            price_zt = quote[code]['zt_p']
            price = quote[code]['price']
            kyye = xd.g_position[code]['kyye']
            
            #当持仓股当前价等于涨停价，并且可用余额大于0时，执行代码         
            if price == price_zt and int(kyye > 0):
                zwtje = int(quote[code]['b1_p']) * int(quote[code]['b1_v'])
                keep = int(dict_params['keep'])
                #当封板的金额小于设定的阀值时，执行代码
                if zwtje < keep:
                    order(code)
                    api.unreg_quote(code)
                    positionlist.remove(code)

if __name__ == '__main__':
    main()
    
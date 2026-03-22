#!/usr/bin/env python
# -*- coding: utf-8 -*-

'''
当用户的委托买入的股票中有涨停的股票，当封单金额小于1000万时，预判股票会打开涨停板，失去用户期望的强势标准，系统进行自动撤单。
'''

from ths_api import *

orderlist = []

dict_params = {
	"keep" : "30000000"
}            

dict_descs={
    "keep":{
        "desc":"封单金额",
        "type":"edit"
    }
}        

def order(code):    
    mmlb = 'cancel'
    zqdm = code
    cmd = '%s %s' % (mmlb, zqdm)
    xd.cmd(cmd)

def orderList():
    global orderlist
    orderlist = list(xd.g_order.keys())

def main():
    orderList()
    
    api = hq.ths_hq_api()
    quote = api.reg_quote(orderlist)
    while True:
        api.wait_update()

        # 委托单撤完则不再监控
        if len(orderlist) == 0:
            break

        for code in orderlist:
            price_zt = quote[code]['zt_p']
            price = quote[code]['price']

            print('code =', code, '最新价 =', price, '涨停价 =', price_zt)
            
            # 当委托序列中的股票的委托价格等于涨停的时候，执行代码
            if price == price_zt:
                zwtje = int(quote[code]['b1_p']) * int(quote[code]['b1_v'])
                keep = int(dict_params['keep'])
                
                print('zwtje =', zwtje, 'keep =', keep)
                
                # 当封板金额小于阀值的时候，执行操作
                if zwtje < keep:
                    order(code)
                    api.unreg_quote(code)
                    orderlist.remove(code)

if __name__ == '__main__':
    main()
    
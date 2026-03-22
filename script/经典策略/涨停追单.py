#!/usr/bin/env python
# -*- coding: utf-8 -*-

'''
在股票池中谁先涨停先买谁，直到买完股票池
提供的范例，股票池gpc中有10只股票，买入的数量top为3只，每只股票买入1000股。
'''

from ths_api import *

codeList = ['600000','000001','300001','300033','601038','002161','002725','603789','603890','300526']

dict_params = {
	"count" : "3",
	"price" : "zxjg",
	"amount" : "1000"
}    

dict_descs={
    "count":{
        "desc":"打板只数",
        "type":"edit"
    },
    "price":{
	    "desc":"委托价格",
        "type":"edit"
    },
    "amount":{
        "desc":"委托数量"
    }
}    

def order(code):    
    mmlb = 'buy'
    zqdm = code
    wtjg = dict_params['price']
    wtsl = int(dict_params['amount'])
    cmd = '%s %s %s %d -notip' % (mmlb, zqdm, wtjg, wtsl)
    xd.cmd(cmd)


def main():
    codelist = codeList
    api = hq.ths_hq_api()
    quote = api.reg_quote(codelist)
    print("begin run")
    
    #当股票池中涨停的数量小于设定的数量的时候，持续监控
    count = 0
    while True:
        codeupdate = api.wait_update()
        for code in codeupdate:
            price_zt = quote[code]['zt_p']
            price = quote[code]['price']
            if price_zt == price:
                order(code)
                api.unreg_quote(code)
                
                #每涨停一只，挂单成功后计数+1
                count = count + 1
                if count >= int(dict_params['count']):
                    return

if __name__ == '__main__':
    main()
#!/usr/bin/env python
#  -*- coding: utf-8 -*-

'''
@brief 用户自定义指标
'''

from collections import OrderedDict

'''
1、defines的作用
defines里面的自定义函数、定义注册到全局变量中，可以显示到UI，函数也可以在任何策略脚本直接使用

2、如何自定义指标
# 默认规则，不可更改，不可设置为变量名：
#   api 行情接口对象
#   quote 实时数据对象
#   kline 历史数据对象
#   code 当前行情数据更新的证券代码
# 自定义：
#   name 描述改变量的业务/作用
#   value python实际执行的逻辑
#   param 如果value中需要入参，即{1}、{2} ... 这种形式，需要描述param
#   ret value执行返回的结果，比如bool
# 执行说明：
#   自定义的函数都已注册到全局变量，可以直接在python脚本内使用，比如：
#   from ths_api import *
#   code = '600000'
#   api = hq.ths_hq_api()
#   quote = api.reg_quote(code)
#   while True:
#       api.wait_update()
#       if f_sell1fdje(quote, code, 100000000):
#           print('已触发')

3、样例
① 赋值样例
defines = OrderedDict([
	(
		"buy1fdje" , 	# 脚本里执行的变量名
		{
			# 变量名的描述
			"name" : "买一封单金额",
			# 脚本生成该变量名的方式，即脚本在行情数据更新的时候会执行一条这样的语句buy1fdje = quote[code]['b1_p']*quote[code]['b1_v']
			"value" : "quote[code]['b1_p']*quote[code]['b1_v']"
		}
	)
])

② 函数样例
建议函数名都以f_开头，相比于上述赋值样例，函数一般是直接用value执行，因为函数有返回值True or False
defines = OrderedDict([
	(
		"sell1fdje" ,
		{
			"name" : "卖一盘口总金额是否大于上限",
			"value" : "f_sell1fdje(quote, code, {1})",
			"param" : "上限金额",	# 参数描述，即value中{1}的描述
			"ret" : "bool"			# 函数返回值
		}
	)
])
'''

g = OrderedDict([
	(
		"buy1fdje" , {
			"name" : "买一封单金额",
			"value" : "quote[code]['b1_p']*quote[code]['b1_v']"
		}
	),
	(
		"p_sell1fdje" , {
			"name" : "卖一盘口总金额是否大于上限",
			"value" : "f_sell1fdje(quote, code, {1})",
			"param" : "上限金额",
			"ret" : "bool"
		}
	)
])

def f_sell1fdje(quote, code, max_je):
	'''
	@brief 卖一盘口总金额 < max
	@param quote: 实时行情数据
	@param code: 当前时刻行情数据更新的证券代码
	@param max_je: 盘口金额比较的最大值
	@return: True or False
	'''
	sell1fdje = quote[code]['a1_p'] * quote[code]['a1_v']
	return sell1fdje < max_je

if __name__ == '__main__':
	from ths_api import *
	global g
	update_user_defs(g)

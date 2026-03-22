'''
@brief  交易接口使用文档
'''

import xiadan_impl
import json
import pandas as pd
import traceback
import threading
import copy
import time
from enum import Enum

'''
全局资金表dict
数据格式
{
	"hbdw" : "0",				#货币单位
	"zjye" : 11379.38,		    #资金余额
	"djje" : 90.820000,			#冻结金额
	"kyje" : 11288.560000,		#可用金额
	"kqje" : 0.000000,			#可取金额
	"zsz" : 214516.0000,		#总市值
	"zzc" : 225895.380000,		#总资产
	"sz" : 214516.000000,		#市值
	"jjzje" : 11288.560000,		#基金总金额
	"zt" : "00"					#主题
}
'''
global g_money

'''
全局持仓表dict
数据格式
{
	'600638': 						#key----证券代码
	{						
		'hbdw': '0',				#货币单位
		'yk': -4184.070000,			#盈亏
		'jysc': '上海Ａ股',			#交易市场
		'kyye': 1120,				#可用余额
		'gdzh': 'A472108742',		#股东账号
		'sjsl': 1120,				#实际数量
		'sj': 8.300000,				#市价（暂时不支持实时行情）
		'djsl': 0,			    	#冻结数量
		'sz': 9296.000000,			#市值
		'zqmc': '新黄浦',			#证券名称
		'jksz': '',					#接口设置
		'zqdm': '600638',			#证券代码
		'gpye': 1120,				#股票余额
		'cbj': 12.036000,			#成本价
	}
}
'''
global g_position

'''
全局可撤委托表dict：以证券代码为键
数据格式
{
	"161815" : [					#key----证券代码
		{
			"zqdm" : "161815",		#证券代码
			"zqmc" : "银华通胀",	#证券名称
			"bz" : "未成交",		#备注
			"wtsl" : 100,   		#委托数量
			"cjsl" : 0,				#成交数量
			"wtjg" : 0.454000,		#委托价格
			"cjjj" : 0.000000,		#成交均价
			"cz" : "买入",			#操作
			"wtsj" : "14:27:16",	#委托时间
			"wtrq" : "20190615",	#委托日期
			"htbh" : "1118302825",	#合同编号
			"jysc" : "深圳Ａ股",	#交易市场
			"gdzh" : "0096388619",	#股东代码
			"cxsl" : 0  			#撤销数量
		}
	]
}
'''
global g_order

'''
全局可撤委托表dict：以合同编号为键
数据格式：
{
    '1262365187': {
        'zqdm': '000005',
        'cxsl': 0,
        'jysc': '深圳Ａ股',
        'htbh': '1262365187',
        'wtrq': '20191109',
        'wtsl': 100,
        'cz': '卖出',
        'cjsl': 0,
        'gdzh': '0071966057',
        'bz': '未成交',
        'wtjg': 3.04,
        'wtsj': '19: 34: 41',
        'cjjj': 0.0,
     }
}
'''
global g_htbh_order

'''
全局全量委托表dict
数据格式和g_order一致，请参考g_order数据格式
'''
global g_fullorder

'''
全局全量委托表dict：以合同编号为键
数据格式：
{
    '1262365187': {
        'zqdm': '000005',
        'cxsl': 0,
        'jysc': '深圳Ａ股',
        'htbh': '1262365187',
        'wtrq': '20191109',
        'wtsl': 100,
        'cz': '卖出',
        'cjsl': 0,
        'gdzh': '0071966057',
        'bz': '未成交',
        'wtjg': 3.04,
        'wtsj': '19: 34: 41',
        'cjjj': 0.0,
     }
}
'''
global g_htbh_fullorder

'''
全局委托汇总表dict
数据格式
{
	'000001':                       #key----证券代码
	{
	    'jmcwtsl': 400,             #当日卖出委托数量
	    'jmrcjjj': 16.434000,       #当日买入成交均价
	    'jmrcjsl': 600,             #当日买入成交数量 
	    'jmccjsl': 200,             #当日卖出成交数量
	    'jmccjjj': 16.217000,       #当日卖出成交均价
	    'jmrcxsl': 0,               #当日买入撤销数量
	    'jmrwtsl': 600,             #当日买入委托数量
	    'jmccxsl': 0                #当日卖出撤销数量
	}
}

'''
global g_ordersum

'''
用户数据，支持多账户
数据格式
{
    'user1':
    {
        'money': g_money,
        'position': g_position,
        'order': g_order,
        'fullorder': g_fullorder
    },
    'usern':
    {
        'money': g_money,
        'position': g_position,
        'order': g_order,
        'fullorder': g_fullorder
    }
}
'''
global g_userdata

class OrderStatus(Enum):
    error = 'error'	 # 委托前失败（命令本地失败）
    fail = 'fail'    # 委托后失败（报给券商后失败）
    submitted = 'submitted'  # 委托成功（买卖撤）
    dealing = 'dealing' # 部分成交
    dealed = 'dealed'  # 全部成交
    cancel = 'cancel'  # 撤单已报但还没撤单成交
    canceled = 'canceled' # 已撤
    inactive = 'inactive' # 废单

def cmd(strCmd):
    '''
    函数名 cmd
    函数功能：交易接口，支持买入、卖出、撤单。
    参数：
    strCmd：命令行参数
    返回值：
        {
            'retcode':'0',  # 0-成功，其他失败
            'retmsg':'',
            'no':'1',   # 命令编号
            'stockcode':'300033',   # 命令代码
            'user' : '**'   # 加密数据，与用户相关
        }
    委托：
    	完整命令：操作动作+证券代码+价格+数量（金额/仓位）+辅助参数（可有可无）
    	操作动作：buy（买入），sell（卖出）
    	证券代码：600000（举例），fsdm（当前行情分时代码）
    	价格：固定价格、zxjg（最新价）、ztjg（涨停价）、dtjg（跌停价）、mrj1~mrj5（买入价1~5）、mcj1~mcj5（卖出价1~5）、dsj1~dsj5（对手价1~5）
    	数量：固定值
    	金额：-m 金额值
    	可用仓位：-cw 参数值
    	目标仓位：-zcw 参数值
    	多账户执行同一命令：-account all
        条件触发时没有委托确认提示，实现全自动条件单：-notip
    举例：
    	cmd('buy 300059 dsj1 100') （按照当前对手价——卖一价买入100股300059）
    	cmd('buy 300059 dsj1 100 -notip') （按照当前买一价买入100股300059，委托前不弹框提醒）
    	cmd('sell 300059 dsj5 -m 100000') （按照当前对手价——买五价卖出300059十万元）
    	cmd('buy 300059 zxjg -cw 1/2') （按照当前可买数量以最新价买入半仓的300059）
    	cmd('sell 300059 dtjg -zcw 0.25') （按照跌停价格卖出300059到总仓位为1/4）
    撤单：
    	完整命令：操作动作+参数值
    	操作动作：cancel(撤单)
    	参数值：-h 合同编号、方向（buy/sell）、代码、代码+方向（buy/sell）、全撤/撤最后（all/last）
    举例：
    	cmd('cancel -h 123456') （撤掉htbh为123456的委托单）
    	cmd('cancel buy') （撤掉所有买单）
    	cmd('cancel fsdm') （撤掉当前行情分时代码的所有委托单）
    	cmd('cancel fsdm sell') （撤掉当前行情分时代码的所有卖单）
    	cmd('cancel all') （撤掉所有可撤委托单）
    '''
    pass

def wait_update(cmdret, status=None, timeout=3):
    '''
    @brief 等待订单状态更新
    @param rets 需要监控的订单列表,值为单笔订单：xd.cmd的返回值或多笔订单：list(xd.cmd的返回值)
    @param status 需要监控的状态，默认全状态更新，可以指定单个状态：str或OrderStatus或者多个状态：list(str或OrderStatus)
    @param timeout 最多监控时间，默认3s
    '''
    pass

def tip(strTip):
    '''
    函数名 tip
    函数功能：弹框提示
    参数：
    strTip：提示内容
    '''
    pass

def get_order_from_htbh(htbh):
    '''
    函数名 get_order_from_htbh
    函数功能：按照合同编号查全量委托，可用来判断该委托单是否成交、撤单等
    参数：
    htbh：合同编号
    '''
    pass

def get_order_from_cmd(cmd):
    '''
    @brief 获取委托命令cmd对应的委托数据
    '''
    pass

def position_to_dataframe(postion):
    '''
    @brief 持仓数据转成pandas.DataFrame数据结构
    @param postion 持仓数据
    @return  pandas.DataFrame格式的持仓列表
    '''
    pass

def order_to_dataframe(order):
    '''
    @brief 可撤委托数据转成pandas.DataFrame数据结构
    @param order(dict) 可撤委托数据
    @return  pandas.DataFrame格式的委托列表
    '''
    pass

def fullorder_to_dataframe(fullorder):
    '''
    @brief 全量委托数据转成pandas.DataFrame数据结构
    @param fullorder(dict) 全量委托数据
    @return  pandas.DataFrame格式的委托列表
    '''
    pass
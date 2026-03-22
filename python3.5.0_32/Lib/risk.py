'''
@brief 委托风控机制
'''
import sys
import json
import time
import csv
import os
from xiadan import *

g_dict_risk = {
	"stockpos" : {
		"state" : "close",
		"pos" : "0.05",
		"type" : "popup"
	},
	"blacklist" : {
		"state" : "close",
		"lists" : [
			"black.csv"
		],
		"type" : "forbid"
	},
	"priceoffset" : {
		"state" : "close",
		"offset1" : "0.019",
		"offset2" : "0.029",
		"type" : "popup"
	},
	"totalwt" : {
		"state" : "close",
		"wtje" : "10000",
		"wtsl" : "1000000",
		"type" : "popup"
	}
}

# 账户相关数据
# 更新场景：
# 1、用户点击工具栏的python入口
# 2、切换用户
# 3、新增用户
g_ordersum = {}      # 根据账户数据计算的其他数据
g_quotes = {}     # 股票行情数据

# 风控相关变量
g_black_list = []                 # 股票黑名单

g_white_list = []                 # 股票白名单

g_priceoffset_list = []             # 低价格偏离列表

def is_Int(s):
    try:
        int(s)
        return True
    except Exception as e:
        pass
    return False

def UpdateQuotes(zqdm, data):
    global g_quotes
    if data == '':
        g_quotes = {}
        return

    try:
        lenth = len(data)
    except:
        g_quotes = {}
        return
    
    try:
        quote = {}
        for k, v in data.items():
            quote[k] = v
        g_quotes[zqdm] = quote
    except:
        pass

def Updateordersum():
    # 待补充
    pass

def UpdateBlackList():
    global g_dict_risk
    global g_black_list
    for x in g_dict_risk["blacklist"]["lists"]:
        if x.find(".csv") != -1:
            try:
                with open(os.getcwd() + "\\script\\我的策略\\配置文件\\" + x, encoding='utf8') as f:
                    reader = csv.reader(f)
                    for row in reader:
                        if is_Int(row[0]):
                            g_black_list.append(row[0])
            except UnicodeDecodeError:
                with open(os.getcwd() + "\\script\\我的策略\\配置文件\\" + x, encoding='unicode_escape') as f:
                    reader = csv.reader(f)
                    for row in reader:
                        if is_Int(row[0]):
                            g_black_list.append(row[0])
            except:
                import traceback
                traceback.print_exc()

def UpdateWhiteList():
    global g_white_list
    try:
        with open(os.getcwd() + "\\script\\我的策略\\配置文件\\white.csv", encoding='utf8') as f:
            reader = csv.reader(f)
            for row in reader:
                print('white,', type(row[0]), row[0])
                if is_Int(row[0]):
                    g_white_list.append(row[0])
    except UnicodeDecodeError:
        with open(os.getcwd() + "\\script\\我的策略\\配置文件\\white.csv", encoding='unicode_escape') as f:
            reader = csv.reader(f)
            for row in reader:
                if is_Int(row[0]):
                    g_white_list.append(row[0])
    except:
        import traceback
        traceback.print_exc()

def UpdatePriceOffsetList():
    with open(os.getcwd() + "\\script\\我的策略\\配置文件\\上证50.csv", encoding='utf8') as f:
        reader = csv.reader(f)
        for row in reader:
            if is_Int(row[0]):
                g_priceoffset_list.append(row[0])
        

# 风控机制
# 原理：根据上述数据截面，执行相应风控逻辑
# 场景：用户委托时调用 main 接口，该接口调用相应风控接口
# 错误码：
# 0     未触发任何风控
# 1     中断式风控
# 2     提醒式风控
#
# < 0   风控执行失败
# -1    参数为空
# -2    参数格式异常
# -3    参数字段缺失
# -4    找不到风控模块


def main(param):
    # 新版策略上线后，该功能不再使用
    return 
    #print('=============数据截面===============')
    if param == '':
        return -1, '委托参数为空'
    try:
        jsondata = json.loads(param)
    except:
        return -2, '委托参数json格式异常'
    else:
        begin = time.clock()

        ret = weituo_risk(jsondata)

        cost = '风控执行耗时 %.6f s'% (time.clock()-begin)
        print(cost, flush=True)
        return ret

def weituo_risk(param):

#    mmlb    买卖类别
#    zqdm    证券代码
#    zqmc    证券名称
#    wtjg    委托价格
#    wtsl    委托数量

    try:
        mmlb = param['mmlb']
        zqdm = param['zqdm']
        zqmc = param['zqmc']
        wtjg = float(param['wtjg'])
        wtsl = float(param['wtsl'])
    except:
        return -3, '委托参数缺失'

    log = '[开始风控] %s %s %s %s' % (mmlb, zqdm, str(wtjg), str(wtsl))
    print(log, flush=True)

    UpdateQuotes(zqdm, param['quote'])
    #print('行情数据: ', quotes)
    update_total_wtje()
    update_stock_wtje()

    retArr = []
    global g_dict_risk

    if g_dict_risk["blacklist"]["state"] == "open":
        if risk_BlackList(zqdm, zqmc, mmlb) == True:
            if g_dict_risk["blacklist"]["type"] == "popup":
                retArr.append((2, '买入黑名单股票'))
            elif g_dict_risk["blacklist"]["type"] == "forbid":
                retArr = []
                retArr.append((1, '买入黑名单股票，中断买入'))
                return retArr

        if risk_WhiteList(zqdm, zqmc, mmlb) == False:
            retArr = []
            retArr.append((1, '买入不在白名单股票，中断买入'))
            return retArr

    if g_dict_risk["stockpos"]["state"] == "open":
        if risk_StockPosition(zqdm, wtjg, wtsl, mmlb) == True:
            if g_dict_risk["stockpos"]["type"] == "popup":
                retArr.append((2, '个股仓位超过' + str(float(g_dict_risk["stockpos"]["pos"])*100) + '%'))
            elif g_dict_risk["stockpos"]["type"] == "forbid":
                retArr = []
                retArr.append((1, '个股仓位超过' + str(float(g_dict_risk["stockpos"]["pos"])*100) + '%，无法继续'))
                return retArr

    if g_dict_risk["priceoffset"]["state"] == "open":
        ret = risk_PriceOffset(zqdm, wtjg)
        fOffset1 = float(g_dict_risk["priceoffset"]["offset1"])
        fOffset1 = fOffset1 * 1000000 / 10000
        fOffset2 = float(g_dict_risk["priceoffset"]["offset2"])
        fOffset2 = fOffset2 * 1000000 / 10000
        if ret == 1:
            if g_dict_risk["priceoffset"]["type"] == "popup":
                retArr.append((2, '价格偏离最新价的' + str(fOffset1) + '%，是否继续？'))
            elif g_dict_risk["priceoffset"]["type"] == "forbid":
                retArr = []
                retArr.append((1, '价格偏离最新价的' + str(fOffset1) + '%，委托中断'))
                return retArr
        elif ret == 2:
            if g_dict_risk["priceoffset"]["type"] == "popup":
                retArr.append((2, '价格偏离最新价的' + str(fOffset2) + '%，是否继续？'))
            elif g_dict_risk["priceoffset"]["type"] == "forbid":
                retArr = []
                retArr.append((1, '价格偏离最新价的' + str(fOffset2) + '%，委托中断'))
                return retArr

    if g_dict_risk["totalwt"]["state"] == "open":
        ret = risk_TotalWtje(zqdm, wtjg, wtsl)
        if ret == 1:
            if g_dict_risk["totalwt"]["type"] == "popup":
                retArr.append((2, '委托金额超过 %d 万元，是否继续？' % (int(g_dict_risk["totalwt"]["wtje"]) / 10000)))
            elif g_dict_risk["totalwt"]["type"] == "forbid":
                retArr = []
                retArr.append((1, '委托金额超过 %d 万元，委托中断' % (int(g_dict_risk["totalwt"]["wtje"]) / 10000)))
                return retArr
        elif ret == 2:
            if g_dict_risk["totalwt"]["type"] == "popup":
                retArr.append((2, '委托数量超过 %d 手，是否继续？' % (int(g_dict_risk["totalwt"]["wtsl"]) / 100)))
            elif g_dict_risk["totalwt"]["type"] == "forbid":
                retArr = []
                retArr.append((1, '委托数量超过 %d 手，委托中断' % (int(g_dict_risk["totalwt"]["wtsl"]) / 100)))
                return retArr
    print(retArr)
    if len(retArr) > 0:
        return retArr
    else:
        return [(0, '未触发任何风控')]

# 1、黑名单风控：ST禁止买入
def risk_BlackList(zqdm, zqmc, mmlb):
    if 'buy' not in mmlb:
        return False

    if g_black_list.count(zqdm) > 0:
        return True
    
    if zqmc.find('ST') != -1:
        return True
    
    return False

# 1、黑名单风控：ST禁止买入
def risk_WhiteList(zqdm, zqmc, mmlb):
    if 'buy' not in mmlb:
        return False

    if g_white_list.count(zqdm) > 0:
        return True
    
    return False

# 3、个股仓位风控
def risk_StockPosition(zqdm, wtjg, wtsl, mmlb):
    if 'buy' not in mmlb:
        return False
    global g_position
    global g_ordersum
    wtje = wtjg * wtsl

    print("stock position risk step1", flush=True)
    
    if zqdm not in g_position:
        gpsz = 0.0
    else:
        stock = g_position[zqdm]
        if 'sz' in stock:
            gpsz = float(stock['sz'])
        elif 'sjsl' in stock and 'sj' in stock:
            gpsz = float(stock['sjsl']) * float(stock['sj'])
        else:
            gpsz = 0.0
        log = '[取持仓表市值]zqdm=%s, gpsz=%f' % (zqdm, gpsz)
        print(log, flush=True)

    if zqdm in g_ordersum.keys():
        wtje_stock = g_ordersum[zqdm]['stock_wtje']
    else:
        wtje_stock = 0.00
    global g_money
    if 'zzc' in g_money:
        zzc = float(g_money['zzc'])
    else:
        zzc = 0.0
    global g_dict_risk
    if (wtje + gpsz + wtje_stock) > (zzc * (float)(g_dict_risk["stockpos"]["pos"])):
        return True
    else:
        return False

# 4、个股价格偏离风控
def risk_PriceOffset(zqdm, wtjg):
    global g_dict_risk
    global g_quotes
    stocktype = g_priceoffset_list.count(zqdm)
    if stocktype > 0:
        percent = (float)(g_dict_risk["priceoffset"]["offset1"])
    else:
        percent = (float)(g_dict_risk["priceoffset"]["offset2"])

    zxjg = float(g_quotes[zqdm]['zxjg'])
    if wtjg > (zxjg + zxjg * percent) or wtjg < (zxjg - zxjg * percent):
        if stocktype > 0:
            return 1
        else:
            return 2
    else:
        return 0

# 5、累计委托金额或委托数量风控
def risk_TotalWtje(zqdm, wtjg, wtsl):
    global g_dict_risk
    global g_ordersum
    if zqdm not in g_ordersum.keys():
        if float(wtjg) * int(wtsl) > int(g_dict_risk["totalwt"]["wtje"]):
            return 1
        elif int(wtsl) > int(g_dict_risk["totalwt"]["wtsl"]):
            return 2
        else:
            return 0

    total = g_ordersum[zqdm]
    if not isinstance(total, dict):
        return 0

    wtje = float(wtjg) * int(wtsl)
    for k,v in total.items():
        if wtje > int(g_dict_risk["totalwt"]["wtje"]):
            return 1
        elif wtsl > int(g_dict_risk["totalwt"]["wtsl"]):
            return 2
        elif 'total_wtje' in k and  (float(v) + wtje) > int(g_dict_risk["totalwt"]["wtje"]):
            return 1
        elif 'total_wtsl' in k and (int(v) + int(wtsl)) > int(g_dict_risk["totalwt"]["wtsl"]):
            return 2
    return 0


def update_total_wtje():
    global g_fullorder
    for k, v in g_fullorder.items():
        update_item_wtje(k, v)

def update_item_wtje(zqdm, data):
    global g_ordersum
    if not isinstance(data, list):
        return

    total_wtje = 0.00
    total_wtsl = 0
    for item in data:
        if not isinstance(item, dict):
            return

        itemwtsl = 0
        itemwtjg = 0.000
        findwtje = False
    
        for k, v in item.items():
            if 'wtje' in k:
                total_wtje += float(v)
                findwtje = True
            elif 'wtsl' in k:
                total_wtsl += int(v)
                itemwtsl = int(v)
            elif 'wtjg' in k:
                itemwtjg = float(v)

        if findwtje == False:
            total_wtje += itemwtsl * itemwtjg

    if zqdm in g_ordersum.keys():
        value = g_ordersum[zqdm]
        if not isinstance(value, dict):
            return

        value['total_wtje'] = total_wtje
        value['total_wtsl'] = total_wtsl
    else:
        param = {}
        param['total_wtje'] = total_wtje
        param['total_wtsl'] = total_wtsl
        g_ordersum[zqdm] = param

    log = '[更新订单汇总] zqdm=%s, 总委托金额=%s, 总委托数量=%s' % (zqdm, str(total_wtje), str(total_wtsl))
    print(log, flush=True)
        
def clear_total_wtje():
    for k, v in g_ordersum.items():
        v['total_wtje'] = 0.00
        v['total_wtsl'] = 0.00
        log = '[更新订单汇总] zqdm=%s, 总委托金额=0.00, 总委托数量=0.00' % k
        print(log, flush=True)

def update_stock_wtje():
    global g_order
    global g_ordersum

    dellist = []
    for zqdm, val in g_order.items():
        order = g_order[zqdm]
        if not isinstance(order, list):
            return

        wtje_sum = 0.00
        for item in order:
            if not isinstance(item, dict):
                return

            wtsl = 0
            cjsl = 0
            wtjg = 0.00

            for k, v in item.items():
                if 'cz' in k and v.find('买') == -1:
                    break

                if 'wtsl' in k:
                    wtsl = int(v)
                elif 'wtjg' in k:
                    wtjg = float(v)
                elif 'cjsl' in k:
                    cjsl = int(v)

            wtje_sum += (wtsl - cjsl) * wtjg

        if zqdm in g_ordersum.keys():
            value = g_ordersum[zqdm]
            if not isinstance(value, dict):
                return

            value['stock_wtje'] = wtje_sum
        else:
            param = {}
            param['stock_wtje'] = wtje_sum
            g_ordersum[zqdm] = param

        log = '[更新订单汇总] zqdm=%s, 仓位总委托金额=%s' % (zqdm, str(wtje_sum))
        print(log, flush=True)
        
        dellist.append(zqdm)

    for k, v in g_ordersum.items():
        if k in dellist:
            continue
        v['stock_wtje'] = 0.00
        log = '[更新订单汇总] zqdm=%s, 仓位总委托金额=0.00' % k
        print(log, flush=True)

def clear_stock_wtje():
    for k, v in g_ordersum.items():
        v['stock_wtje'] = 0.00
        log = '[更新订单汇总] zqdm=%s, 仓位总委托金额=0.00' % k
        print(log, flush=True)

def Init():
    UpdateBlackList()
    UpdateWhiteList()

# 脚本风控不再使用
#Init()

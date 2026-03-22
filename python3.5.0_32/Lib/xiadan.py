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
        'htbh_fullorder':g_htbh_fullorder
    },
    'usern':
    {
        'money': g_money,
        'position': g_position,
        'order': g_order,
        'fullorder': g_fullorder
        'htbh_order':g_htbh_order
        'htbh_fullorder':g_htbh_fullorder
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
    # timeout = 'timeout'  # 超时，配合xd.wait_update使用

    @staticmethod
    def from_str(status):
        try:
            ret = OrderStatus(status)
        except ValueError:
            ret = None
        return ret

class OrderTask:
    '''
    @brief 单个委托命令对应逻辑处理
    @note
        1、委托命令对应单/多用户单笔/批量委托状态格式如下:
        {
            user1:
            {
                'htbh1':OrderStatus.submitted,
                'htbh2':OrderStatus.submitted
            },
            user2:
            {
                'other':OrderStatus.error # 命令错误
            },
            user3:
            {
                'other':OrderStatus.fail # 该命令对应所有委托都失败才有这个状态，有她就没htbh
            }
        }

        2、因为理想情况下，给用户的应该是状态更新的数据，所以返回合同编号列表。
        如果命令失败或者错误，应该返回None（缺陷是用户得自行判断返回值）
        [htbh1, htbh2] = xd.wait_update()
    '''
    class UserStatus:
        def __init__(self):
            self.user_status = dict()
            self.limit_status = list()

        def set_status_limit(self, limit):
            self.limit_status = limit

        def is_available_status(self, status):
            if len(self.limit_status) <= 0:
                return True
            return status in self.limit_status

        def update(self, user, status):
            update_dict = dict()
            if user not in self.user_status.keys():
                self.user_status[user] = dict()

            if isinstance(status, OrderStatus):
                # 命令错误或者订单失败
                old = self.user_status[user]['other'] if 'other' in self.user_status[user].keys() else None
                if status != old:
                    self.user_status[user]['other'] = status
                    if self.is_available_status(status):
                        update_dict['other'] = status
            elif isinstance(status, dict):
                for htbh, onestatus in status.items():
                    old = self.user_status[user][htbh] if htbh in self.user_status[user].keys() else None
                    if onestatus != old:
                        self.user_status[user][htbh] = onestatus
                        if self.is_available_status(onestatus):
                            update_dict[htbh] = onestatus
            return update_dict

    def __init__(self, cmd):
        self.cmd = cmd
        self.no = cmd['no']
        self.userlist = cmd['user'].split(',')
        self.code = cmd['stockcode']
        self.cmderror = True if int(cmd['retCode']) == 1 else False
        self.jugde_cmderror = False
        self.monitored = False
        self.status_impl = OrderTask.UserStatus()

    def mark(self, nos, statuslist):
        # 没有user作为参数是因为Task和线程ID绑定的，而单线程内，命令no不可能一致
        if self.no not in nos:
            self.monitored = False
            return None

        self.monitored = True
        self.status_impl.set_status_limit(statuslist)
        
        updated = False
        if self.cmderror and not self.jugde_cmderror:
            self.jugde_cmderror = True
            for user in self.userlist:
                ret = self.update(self.no, user, None)
                if ret is not None:
                    updated = True
        return self.cmd if updated else None

    def update(self, no, user, order):
        if no != self.no or user not in self.userlist:
            # print('委托命令差异', no, self.no, user, self.userlist)
            return None

        # print(time.time(), '开始更新{}, tid={}, type(order)={}'.format(id(self), threading.get_ident(), type(order)))

        # 订单状态更新、订单数据更新
        ret = dict()
        if order is None:  # 命令错误
            ret = self.status_impl.update(user, OrderStatus.error)
        elif isinstance(order, str):  # c++更新通知
            status = OrderStatus.from_str(order)
            if status is not None:
                ret = self.status_impl.update(user, status)
        elif isinstance(order, OrderStatus):  # c++更新通知
            ret = self.status_impl.update(user, order)
        elif isinstance(order, dict):  # python委托数据更新后更新状态
            ret = self.status_impl.update(user, order)

        # print(time.time(), '更新结束{}, tid={}, ret={}'.format(id(self), threading.get_ident(), ret))
        
        if not self.monitored:
            # print('不在监控中')
            return None

        return self.cmd if len(ret) > 0 else None

global g_orderManager
class OrderManager:
    '''
    @brief
        1、各种脚本调用该接口有无问题，所以一个线程对应一个OrderManager
        2、支持：单账户单/批量委托、多账户单/批量委托
    '''
    mutex = threading.RLock()

    def __init__(self):
        self.tasks = list()
        self.condition = threading.Condition()
        self.result = list()  # 更新的委托命令

    def add(self, task):
        self.tasks.append(task)

    def mark_monitor(self, nos, statuslist):
        # 标记需要监控的命令任务且处理命令错误的情况
        for task in self.tasks:
            cmd = task.mark(nos, statuslist)
            # print(time.time(), '标记监控, cmd={}, task={}'.format(cmd, task))
            if cmd is not None:
                self.result.append(cmd)

    def update(self, no, user, order):
        for task in self.tasks:
            cmd = task.update(no, user, order)
            # print(time.time(), '更新任务, cmd={}, task={}'.format(cmd, task))
            if cmd is not None:
                self.result.append(cmd)

        if len(self.result) > 0:
            # print('通知, tid={}, result={}'.format(threading.get_ident(), self.result))
            with self.condition:
                self.condition.notify_all()

    def run(self, timeout):
        # print(time.time(), '开始等待订单更新, tid={}, timeout={}'.format(threading.get_ident(), timeout))
        if len(self.result) > 0:
            ret = copy.deepcopy(self.result)
            self.result.clear()
            return ret

        with self.condition:
            self.condition.wait_for(self.an_order_changed, timeout=timeout)
        
        # print(time.time(), '等待结束, tid={}, result={}'.format(threading.get_ident(), self.result))
        ret = copy.deepcopy(self.result)
        self.result.clear()
        return ret

    def an_order_changed(self):
        # print('订单更新, result={}'.format(self.result))
        return len(self.result) > 0

def wait_update(cmdret, status=None, timeout=3):
    '''
    @brief 等待订单状态更新
    @param rets 需要监控的订单列表,值为单笔订单：xd.cmd的返回值或多笔订单：list(xd.cmd的返回值)
    @param status 需要监控的状态，默认全状态更新，可以指定单个状态：str或OrderStatus或者多个状态：list(str或OrderStatus)
    @param timeout 最多监控时间
    '''
    global g_orderManager
    tid = threading.get_ident()
    if tid not in g_orderManager.keys():
        print('请先委托下单后在调用该接口监控订单状态')
        return None

    orderlist = list()
    if isinstance(cmdret, dict):
        orderlist.append(cmdret)
    elif isinstance(cmdret, list):
        orderlist.extend(cmdret)
    else:
        print('需要监控的订单格式非法，请改成xd.cmd的返回值')
        return None

    statuslist = set()
    if isinstance(status, str):
        ret = OrderStatus.from_str(status)
        if ret is not None:
            statuslist.add(ret)
    elif isinstance(status, OrderStatus):
        statuslist.add(status)
    elif isinstance(status, list):
        for item in status:
            if isinstance(item, str):
                ret = OrderStatus.from_str(item)
                if ret is not None:
                    statuslist.add(ret)
            elif isinstance(item, OrderStatus):
                statuslist.add(item)

    nos = [x['no'] if 'no' in x else None for x in orderlist]
    g_orderManager[tid].mark_monitor(nos, statuslist)
    return g_orderManager[tid].run(timeout=timeout)

def updatefromxiadan(data):
    '''
    @brief c++通知python订单委托成功/失败
    '''
    try:
        if isinstance(data, str):
            data = json.loads(data)
        no = data['no']
        user = data['user']
        status = data['status']
        status = OrderStatus.from_str(status)
    except KeyError:
        return

    if status is None:
        return

    # c++通知线程不属于用户脚本任何线程，所以只能遍历
    # 除非g_orderManager改成{no:{tid:ordermanager}}格式
    global g_orderManager
    with OrderManager.mutex:
        for tid, obj in g_orderManager.items():
            # print(time.time(), 'c++委托更新，更新订单缓存. no={}, user={}, status={}'.format(no, user, status))
            if g_orderManager[tid].update(no, user, status):
                break

def updatefromtable(order):
    '''
    @brief c++通知python委托数据更新，委托数据更新后更新委托状态
    @param 更新的订单状态，数据格式为：
        {
            user:
            {
                no:{htbh:status},
                no:{htbh:status}
            }
        }
    '''
    global g_orderManager
    for user, v in order.items():
        for no, status in v.items():
            with OrderManager.mutex:
                for tid, obj in g_orderManager.items():
                    # print(time.time(), '委托表更新，更新订单缓存. no={}, user={}, status={}'.format(no, user, status))
                    if g_orderManager[tid].update(no, user, status):
                        break

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
    if strCmd.find('-id') == -1:
        from ths_api.utils import get_strategyid_from_path
        sgyid = get_strategyid_from_path()
        if sgyid is not None:
            strCmd += ' -id %s' % sgyid

    if strCmd.find('timetest') == -1:
        tt = time.time()
        if tt is not None:
            tt = int(round(tt*1000))
            strCmd += ' -timetest %s' % tt

    ret = xiadan_impl.cmd(strCmd)
    try:
        ret = eval(ret)
        cache_order(ret)
    except (TypeError, ValueError, KeyError):
        pass
    return ret

def cache_order(cmdret):
    global g_orderManager
    tid = threading.get_ident()
    with OrderManager.mutex:
        if tid not in g_orderManager.keys():
            g_orderManager[tid] = OrderManager()
        task = OrderTask(cmdret)
        # print(time.time(), '[委托任务添加到缓存]tid={}, cmd={}, task={}'.format(tid, cmdret, task))
        g_orderManager[tid].add(task)

def tip(strTip):
    '''
    函数名 tip
    函数功能：弹框提示
    参数：
    strTip：提示内容
    '''
    return xiadan_impl.MessageBox(strTip)

def get_order_from_htbh(htbh):
    '''
    函数名 get_order_from_htbh
    函数功能：按照合同编号查全量委托，可用来判断该委托单是否成交、撤单等
    参数：
    htbh：合同编号
    '''
    global g_htbh_fullorder
    if str(htbh) in g_htbh_fullorder.keys():
        return g_htbh_fullorder[str(htbh)]
    else:
        return {}

def get_order_from_cmd(cmd):
    '''
    @brief 获取委托命令cmd对应的委托数据
    '''
    result = list()
    try:
        no = cmd['no']
        userlist = cmd['user'].split(',')
        code = cmd['stockcode']
    except KeyError:
        return result
    
    for user in userlist:
        try:
            fullorder = g_userdata[user]['fullorder']
        except KeyError:
            continue

        if code not in fullorder.keys():
            continue

        for item in fullorder[code]:
            itemno = item['no'] if 'no' in item.keys() else None
            if itemno != no:
                continue
            result.append(item)
    
    return result

def get_position_from_key(code, key, user=None):
    if user is not None and user in g_userdata.keys():
        position = g_userdata[user]['position']
    else:
        position = g_position

    item = position.get(code)
    if item is not None:
        return item.get(key)
    print('position=', position)
    return None

def position_to_dataframe(postion, blacklist=None):
    '''
    @brief 持仓数据转成pandas.DataFrame数据结构
    @param postion 持仓数据
    @return  pandas.DataFrame格式的持仓列表
    '''
    if blacklist is None:
        blacklist = ['no']
    dictdata = __specialdict_to_list(postion, blacklist)
    df = pd.DataFrame(dictdata, dtype=str)
    format_datafrmae_type(df)
    return df

def order_to_dataframe(order, blacklist=None):
    '''
    @brief 可撤委托数据转成pandas.DataFrame数据结构
    @param order(dict) 可撤委托数据
    @return  pandas.DataFrame格式的委托列表
    '''
    if blacklist is None:
        blacklist = ['no']
    dictdata = __specialdict_to_list(order, blacklist)
    df = pd.DataFrame(dictdata, dtype=str)
    format_datafrmae_type(df)
    return df

def fullorder_to_dataframe(fullorder, blacklist=None):
    '''
    @brief 全量委托数据转成pandas.DataFrame数据结构
    @param fullorder(dict) 全量委托数据
    @return  pandas.DataFrame格式的委托列表
    '''
    if blacklist is None:
        blacklist = ['no']
    dictdata = __specialdict_to_list(fullorder, blacklist)
    df = pd.DataFrame(dictdata, dtype=str)
    format_datafrmae_type(df)
    return df

def get_strategy_id():
    '''
    @brief 获取策略ID
    @return：str格式的策略ID
    '''
    return xiadan_impl.GetStrategyID()

def pretty_print_dict(obj, indent=' '):
    def _pretty(obj, indent):
        for i, tup in enumerate(obj.items()):
            k, v = tup
            # 如果是字符串则拼上""
            if isinstance(k, str):
                k = '"%s"' % k
            if isinstance(v, str):
                v = '"%s"' % v
            # 如果是字典则递归
            if isinstance(v, dict):
                v = ''.join(_pretty(v, indent + ' ' * len(str(k) + ': {')))  # 计算下一层的indent
            # case,根据(k,v)对在哪个位置确定拼接什么
            if i == 0:  # 开头,拼左花括号
                if len(obj) == 1:
                    yield '{%s: %s}' % (k, v)
                else:
                    yield '{%s: %s,\n' % (k, v)
            elif i == len(obj) - 1:  # 结尾,拼右花括号
                yield '%s%s: %s}' % (indent, k, v)
            else:  # 中间
                yield '%s%s: %s,\n' % (indent, k, v)

    print(''.join(_pretty(obj, indent)))

# ##################################以下接口为系统调用，非用户接口##################################
'''
python模块初始化时c++层主动调用该接口，用来初始化全局变量
'''
def init_global(data):
    global g_money
    global g_position
    global g_order 
    global g_fullorder
    global g_ordersum
    global g_htbh_order
    global g_htbh_fullorder
    global g_userdata
    global g_orderManager
    g_money = {}
    g_position = {}
    g_order = {}
    g_fullorder = {}
    g_ordersum = {}
    g_htbh_order = {}
    g_htbh_fullorder = {}
    g_userdata = dict()
    g_orderManager = dict()
init_global('')

def CombinePositionData(newposition, oldposition):
    for newcode, newitem in newposition.items():
        if newcode not in oldposition.keys():
            oldposition[newcode] = newitem
        else:
            olditem = oldposition[newcode]
            olditem.update(newitem)


def CombineOrderData(neworder, oldorder):
    for newcode, newitem in neworder.items():
        if newcode not in oldorder.keys():
            oldorder[newcode] = newitem
        else:
            olditem = oldorder[newcode]
            for newlineitem in newitem:
                newhtbh = newlineitem.get('htbh')
                updated = False
                for oldlineitem in olditem:
                    oldhtbh = oldlineitem.get('htbh')
                    if newhtbh != oldhtbh:
                        continue
                    updated = True
                    oldlineitem.update(newlineitem)
                
                if updated is False:
                    # 增量数据未发生更新，则增量数据直接插入旧数据
                    olditem.append(newlineitem)

'''
当下单中数据更新时，c++层会主动调用Update*****接口来更新交易数据
'''
g_floatfields = ['zjye', 'djje', 'kyje', 'kqje', 'zsz', 'zzc', 'jjzje', 'yk', 'sj', 'sz', 'cbj', 'wtjg', 'cjjj', 'jmrjj', 'jmcjj']
g_intfields = ['kyye', 'sjsl', 'djsl', 'gpye', 'wtsl', 'cjsl', 'cxsl', 'jmrsl', 'jmcsl']
def UpdateUserData(data):
    '''
    @param data 用户资金、持仓、委托、全量委托等，举例
    {
        'user1':
        {
            'cur':"1",  # 1-当前账户,0-非当前账户
            'money':{***},  # 参考g_money格式，当c++更新资金时带该值
            'position':{***},   # 参考g_position格式，当c++更新持仓时带该值
            'order':{***},   # 参考g_order格式，当c++更新可撤委托时带该值
            'fullorder':{***}   # 参考g_fullorder格式，当c++更新全量委托时带该值
        },
        'user2':{***},
        'usern':{***}
    }
    '''
    try:
        global g_userdata
        global g_money
        global g_position
        global g_order 
        global g_fullorder
        userdata = json.loads(data)
        del data
        for user, v in userdata.items():
            if user not in g_userdata.keys():
                g_userdata[user] = dict()

            cur = int(v['cur'])
            if 'money' in v.keys():
                money = UpdateMoney(v['money'])
                g_userdata[user]['money'] = money
                if cur:
                    g_money = money
            if 'position' in v.keys():
                newposition = UpdatePosition(v['position'])
                if 'position' not in g_userdata[user].keys():
                    g_userdata[user]['position'] = newposition
                else:
                    CombinePositionData(newposition, g_userdata[user]['position'])
                if cur:
                    g_position = g_userdata[user]['position']
            if 'order' in v.keys():
                order = UpdateOrder(v['order'])
                g_userdata[user]['order'] = order
                g_userdata[user]['htbh_order'] = gethtbhorder(order)  # 更新合同编号为键的数据到全局用户变量中
                if cur:
                    g_order = order
                    if len(g_order) > 0:
                        UpdateHtbhOrder()
            if 'fullorder' in v.keys():
                '''
                {
                    htbh:{'no':*, 'status':*},
                    htbh2:{'no':*, 'status':*}
                }
                '''
                old_statusdict = dict()
                if 'pre_status' in g_userdata[user].keys():
                    old_statusdict = g_userdata[user]['pre_status']
                neworder, status_update_dict, new_status_dict = UpdateFullOrder(v['fullorder'], old_statusdict)
                updatedstatusdict = dict()
                updatedstatusdict[user] = status_update_dict
                updatefromtable(updatedstatusdict)
                g_userdata[user]['pre_status'] = new_status_dict

                if 'fullorder' not in g_userdata[user].keys():
                    g_userdata[user]['fullorder'] = neworder
                else:
                    CombineOrderData(neworder, g_userdata[user]['fullorder'])

                g_userdata[user]['htbh_fullorder'] = gethtbhfullorder(g_userdata[user]['fullorder'])  # 更新合同编号为键的数据到全局用户变量中
                if cur:
                    g_fullorder = g_userdata[user]['fullorder']
                    if len(g_fullorder) > 0:
                        # order_summary()
                        UpdateHtbhFullOrder()
    except:
        # print('更新用户交易数据失败, data=', data)
        # print('更新用户交易数据失败')
        # traceback.print_exc()
        return
    '''
    print('用户数据更新后=', g_userdata)
    print('当前资金=', g_money)
    print('当前持仓=', g_position)
    print('当前可撤=', g_order)
    print('当前全量委托=', g_fullorder)
    print('当前可撤，以合同编号为键值=', g_htbh_order)
    print('当前全量委托，以合同编号为键值=', g_htbh_fullorder)
    print('当前委托汇总=', g_ordersum)
    '''

def UpdateMoney(money):
    # 转换数据格式：金额（float）、数量（int）
    for key in list(money.keys()):
        if key in g_floatfields:
            try:
                value = float(money[key])
            except ValueError:
                value = 0.0
            money[key] = value
        elif key in g_intfields:
            value = float(money[key])
            value = int(value)
            money[key] = value
    return money

def UpdatePosition(position):
    # 转换数据格式：金额（float）、数量（int）
    for code in position.keys():
        for key in position[code].keys():
            if key in g_floatfields:
                try:
                    value = float(position[code][key])
                except ValueError:
                    value = 0.0
                position[code][key] = value
            elif key in g_intfields:
                value = float(position[code][key])
                value = int(value)
                position[code][key] = value
    return position

def UpdateOrder(order):
    # 转换数据格式：金额（float）、数量（int）
    for code in order.keys():
        for item in order[code]:
            for key in item.keys():
                if key in g_floatfields:
                    try:
                        value = float(item[key])
                    except ValueError:
                        value = 0.0
                    item[key] = value
                elif key in g_intfields:
                    value = float(item[key])
                    value = int(value)
                    item[key] = value
    return order

def UpdateFullOrder(fullorder, old_statusdict):
    # 转换数据格式：金额（float）、数量（int）
    status_update_dict = dict()
    new_status_dict = dict()
    for code in fullorder.keys():
        for item in fullorder[code]:
            for key in item.keys():
                if key in g_floatfields:
                    value = float(item[key])
                    item[key] = value
                elif key in g_intfields:
                    value = float(item[key])
                    value = int(value)
                    item[key] = value

            if 'htbh' in item.keys():
                htbh = item['htbh']
                no = item['no'] if 'no' in item.keys() else None
                status = item['status'] if 'status' in item.keys() else None
                status = OrderStatus.from_str(status)
                if no is None or status is None:
                    continue

                # 新状态
                new_status_dict[htbh] = dict()
                new_status_dict[htbh]['no'] = no
                new_status_dict[htbh]['status'] = status

                # 更新的状态
                updated = False
                if htbh in old_statusdict.keys():
                    old_no = old_statusdict[htbh]['no']
                    old_status = old_statusdict[htbh]['status']
                    if old_no == no and status != old_status:
                        updated = True
                else:
                    updated = True
                if updated:
                    if no not in status_update_dict.keys():
                        status_update_dict[no] = dict()
                    status_update_dict[no][htbh] = status
    return fullorder, status_update_dict, new_status_dict

def order_summary():
    '''
    @brief 通过全量委托表过滤当日买入成交数量、买入委托数据、买入撤单数量、买入成交均价、卖出成交数量、卖出委托数量、卖出撤单数量、卖出成交均价至委托汇总表
    '''
    global g_ordersum
    global g_fullorder
    buycjamountkey = 'jmrcjsl'  # 今买入成交数量
    buycjpricetkey = 'jmrcjjj'  # 今买入成交均价
    sellcjamountkey = 'jmccjsl'  # 今卖出成交数量
    sellcjpricekey = 'jmccjjj'  # 今卖出成交均价
    buywtamountkey = 'jmrwtsl'  # 今买入委托数量
    sellwtamountkey = 'jmcwtsl'  # 今卖出委托数量
    buycxamountkey = 'jmrcxsl'  # 今买入撤销数量
    sellcxamountkey = 'jmccxsl'  # 今卖出撤销数量

    df = fullorder_to_dataframe(g_fullorder)

    g_ordersum = {}
    for code in g_fullorder:
        if code not in g_ordersum.keys():
            g_ordersum[code] = {}

            if buycjamountkey not in g_ordersum[code].keys():
                g_ordersum[code][buycjamountkey] = 0
            if buycjpricetkey not in g_ordersum[code].keys():
                g_ordersum[code][buycjpricetkey] = 0.0
            if sellcjamountkey not in g_ordersum[code].keys():
                g_ordersum[code][sellcjamountkey] = 0
            if sellcjpricekey not in g_ordersum[code].keys():
                g_ordersum[code][sellcjpricekey] = 0.0
            if buywtamountkey not in g_ordersum[code].keys():
                g_ordersum[code][buywtamountkey] = 0
            if sellwtamountkey not in g_ordersum[code].keys():
                g_ordersum[code][sellwtamountkey] = 0
            if buycxamountkey not in g_ordersum[code].keys():
                g_ordersum[code][buycxamountkey] = 0
            if sellcxamountkey not in g_ordersum[code].keys():
                g_ordersum[code][sellcxamountkey] = 0

        try:
            codedf = df[df['zqdm'].astype(str) == str(code)]
            # print('过滤代码', code, type(codedf), codedf)

            buydf = codedf[codedf['cz'].astype(str).str.find('买') != -1]
            # print('过滤买入', buydf)
            selldf = codedf[codedf['cz'].astype(str).str.find('卖') != -1]

            buycjamount = sum(buydf['cjsl'].astype(int)) if 'cjsl' in buydf.columns else 0
            if 'cjsl' in buydf.columns and 'cjjj' in buydf.columns:
                buycjmoney = sum(buydf['cjsl'].astype(int) * buydf['cjjj'].astype(float))
            else:
                buycjmoney = 0
            buywtamount = sum(buydf['wtsl'].astype(int)) if 'wtsl' in buydf.columns else 0
            buycxamount = sum(buydf['cxsl'].astype(int)) if 'cxsl' in buydf.columns else 0

            buycjprice = buycjmoney / buycjamount if buycjamount > 0 else 0.0
            # print('买入汇总, 今买数量=%d, 今买金额=%f, 买入均价=%f' % (buyamount, buymoney, buyprice))

            sellcjamount = sum(selldf['cjsl'].astype(int)) if 'cjsl' in selldf.columns else 0
            if 'cjsl' in selldf.columns and 'cjjj' in selldf.columns:
                sellcjmoney = sum(selldf['cjsl'].astype(int) * selldf['cjjj'].astype(float))
            else:
                sellcjmoney = 0
            sellwtamount = sum(selldf['wtsl'].astype(int)) if 'wtsl' in selldf.columns else 0
            sellcxamount = sum(selldf['cxsl'].astype(int)) if 'cxsl' in selldf.columns else 0

            sellcjprice = sellcjmoney / sellcjamount if sellcjamount > 0 else 0.0
            # print('卖出汇总, 今卖数量=%d, 今卖金额=%f, 卖出均价=%f' % (sellamount, sellmoney, sellprice))
            g_ordersum[code][buycjamountkey] = buycjamount
            g_ordersum[code][buycjpricetkey] = buycjprice
            g_ordersum[code][sellcjamountkey] = sellcjamount
            g_ordersum[code][sellcjpricekey] = sellcjprice
            g_ordersum[code][buywtamountkey] = buywtamount
            g_ordersum[code][sellwtamountkey] = sellwtamount
            g_ordersum[code][buycxamountkey] = buycxamount
            g_ordersum[code][sellcxamountkey] = sellcxamount
        except:
            #print('更新汇总数据项异常', g_ordersum)
            # print('更新汇总数据项异常')
            pass

    #print('委托汇总表', g_ordersum)

def gethtbhorder(order):
    df = order_to_dataframe(order)
    if df.empty:
        return dict()
    df.index = df['htbh']
    format_datafrmae_type(df)
    return df.to_dict(orient='index')

def UpdateHtbhOrder():
    global g_htbh_order
    global g_order
    g_htbh_order = gethtbhorder(g_order)

def gethtbhfullorder(fullorder):
    df = fullorder_to_dataframe(fullorder)
    if df.empty:
        return dict()
    df.index = df['htbh']
    format_datafrmae_type(df)
    return df.to_dict(orient='index')

def UpdateHtbhFullOrder():
    global g_htbh_fullorder
    global g_fullorder
    g_htbh_fullorder = gethtbhfullorder(g_fullorder)

def __specialdict_to_list(src, blacklist=None):
    dictdata = {}
    for code, value in src.items():
        if isinstance(value, list):
            for item in value:
                for k, v in item.items():
                    if blacklist is not None and k in blacklist:
                        continue
                    if k not in dictdata.keys():
                        dictdata[k] = []
                    dictdata[k].append(v)
        elif isinstance(value, dict):
            for k, v in value.items():
                if blacklist is not None and k in blacklist:
                    continue
                if k not in dictdata.keys():
                    dictdata[k] = []
                dictdata[k].append(v)
    return dictdata

def format_datafrmae_type(df):
    '''
    @brief  转换df的数据类型
    @param df: pandas.DataFrame 格式数据
    @return: 转换格式后的df
    '''
    global g_floatfields
    global g_intfields
    colunms = df.columns.values
    for item in colunms:
        if item in g_floatfields:
            df[item] = df[item].astype(float)
        elif item in g_intfields:
            df[item] = df[item].astype(int)

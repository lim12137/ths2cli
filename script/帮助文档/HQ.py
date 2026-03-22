#!/usr/bin/env python
# -*- coding: utf-8 -*-

'''
@brief 行情接口使用文档
'''

import pandas as pd
from . import ths_hq_api as hq
from . import ta

def select_stock(query, type='stock', market=False):
    '''
    @brief 选股接口，取财务数据接口等等
           这是一个神奇的接口，可以取到各种你想要的数据
    @param query 问句
    @param type 品种，股票-stock，可转债-conbond，基金-fund，指数-zhishu，债券-bond
    @param market 返回的代码里面是否包含市场，如False-600000，True-600000.SH
    @return pandas.DataFrame格式
    @example
        from ths_api import *
        datalist = hq.select_stock('当日涨幅在8%以上的股票且价格小于4元')
        print(datalist)
    输出如下：
                收盘价:不复权    涨跌幅:前复权 股票代码  股票简称
        0              2.21           0.09950  300090  盛运环保
        1              2.68           0.09836  000587  金洲慈航
        2              2.78           0.09881  300111   向日葵
        3              1.76           0.010000  300116  坚瑞沃能
        4              2.27           0.010194  601388  怡球资源
        5              2.97           0.010000  300156  神雾环保
    '''

    return hq.SelectStock(query, type=type, market=market)

def select_stock_and_datatype(stocklist, datatypelist, type='stock', market=False):
    '''
    @brief 从问财获取指定代码列表的指定数据项目
    @param stocklist(list of str) 指定代码列表
    @param datatypelist(list of str) 指定数据项目
    @param type 品种，股票-stock，可转债-conbond，基金-fund，指数-zhishu，债券-bond
    @param market 返回的代码是否包含市场，如False-600000，True-600000.SH
    @return pandas.DataFrame格式
    @example
        from ths_api import *
        stocklist = ['600000', '300033', '000001']
        datatype = ['市盈率', '总股本', '最高价', '最低价']
        df = hq.select_stock_and_datatype(stocklist, datatype)
        print(df)
    输出如下：
           市盈率(pe) 总股本 最低价:不复权  最新价 最新涨跌幅 最高价:不复权  股票代码  股票简称
        0    7.806  17170411366.00   13.53  13.54  -0.0148   13.78  000001  平安银行
        1    5.083  29352080397.00   11.34  11.40   0.00441   11.46  600000  浦发银行
        2  120.624    537600000.00   89.61  90.10   0.00356   92.38  300033   同花顺
    '''
    query = '%s %s' % (",".join(stocklist), ",".join(datatypelist))
    df = select_stock(query, type=type, market=market)
    return df

def select_stocklist(query, type='stock', market=False):
    '''
    @brief 纯粹的选股接口
    @param query 问句
    @param type 品种，股票-stock，可转债-conbond，基金-fund，指数-zhishu，债券-bond
    @param market 返回的代码是否包含市场，如False-600000，True-600000.SH
    @return list，证券代码列表
    @example
        from ths_api import *
        codelist = hq.select_stocklist('当日涨幅在8%以上的股票且价格小于4元')
        print(codelist)
    输出如下：
        ['300090', '000587', '300111']
    '''
    df = select_stock(query, type=type, market=market)
    return wencai_to_stocklist(df)

def get_block(blockname=''):
    '''
    @brief 获取自选股、自定义板块成分股(需在同花顺行情客户端下使用)
    @param blockname(str) 板块名称，比如 自选股、板块1等，默认为空，返回自选股
    @return dict，包含2列，zqdm(证券代码)、zqmc(证券名称)
    @example
        from ths_api import *
        selfblock = hq.get_block('自选股')
        print(selfblock)

        block1 = hq.get_block('板块1')
        print(block1)
    输出如下:
    {'zqdm': ['002751', '002717', '603922', '603728', '603986'], 'zqmc': ['易尚展示', '岭南股份', '金鸿顺', '鸣志电器', '兆易创新']}
    {'zqdm': ['1A0001', '399001', '399006', '000509', '000425', '600019', '601066', '002719', '601878', '600999', '002864', '600020', '002368', '002369', '002370', '002371'], 'zqmc': []}
    '''
    if blockname == '自选股' or blockname is '':
        return hq.get_self_stock()
    else:
        return hq.get_self_block(blockname)

def get_block_stocklist(blockname=''):
    '''
        @brief 获取自选股、自定义板块成分股列表(需在同花顺行情客户端下使用)
        @param blockname(str) 板块名称，比如 自选股、板块1等，默认为空，返回自选股
        @return list，证券代码列表
        @example
            from ths_api import *
            selfblock = hq.get_block_stocklist('自选股')
            print(selfblock)

            block1 = hq.get_block_stocklist('板块1')
            print(block1)
        输出如下:
        ['002751', '002717', '603922', '603728', '603986']
        ['1A0001', '399001', '399006', '000509', '000425', '600019', '601066', '002719', '601878', '600999', '002864', '600020', '002368', '002369', '002370', '002371']
        '''
    try:
        block = get_block(blockname)
        stocklist = block_to_stocklist(block)
        return stocklist
    except:
        return []

def kline_to_dataframe(kline):
    '''
    @brief 周期数据转成pandas.DataFrame数据结构
    @param kline(dict) get_kline/reg_kline返回的周期数据
    @return pandas.DataFrame格式的周期数据
    '''
    dictdata = __specialdict_to_list(kline)
    df = pd.DataFrame(dictdata, dtype=str)
    if 'Index' in df.columns:
        df.pop('Index')
    hq.THSAPI.format_kline_dtypes(df)
    return df

def klinecode_to_dataframe(kline, code):
    '''
    @brief 指定代码的周期数据转成pandas.DataFrame数据结构
    @param kline(dict) 周期数据
    @param code(str) 股票代码
    @return pandas.DataFrame格式的周期数据
    '''
    if code not in kline.keys():
        log = '%s不在周期数据内' % (str(code))
        raise Exception(log)

    src = kline[code]
    #pd.set_option('display.width', None)  # 以便print不打印出列省略号
    df = pd.DataFrame(src, dtype=str)
    if 'Index' in df.columns:
        df.pop('Index')
    return df


class ths_hq_api():
    def __init__(self):
        '''
        @brief 连接行情服务器，初始化环境
        @return 如果连接成功，会输出日志：登录成功
                        失败，会输出日志：无法连接行情服务器，请检查网络状态后重试
        @example
            from ths_api import *
            api = hq.ths_hq_api()
        '''
        self.api = hq.THSAPI()

    def get_quote(self, StockCode):
        '''
        @brief 获取一次指定代码列表的最新实时行情数据，2s内只能执行1次
        @param StockCode 证券代码列表，支持str、list、set格式，一次最多500个代码
        @return 实时行情数据结构dict
        @example
            from ths_api import *
            api = hq.ths_hq_api()
            quote = api.get_quote('300033')
            #quote = api.get_quote('300033, 600000')
            #quote = api.get_quote(['300033', '600000', '000001'])
            #quote = api.get_quote(('300033', '600000', '000001', '000725'))
            print(quote)
            #print(quote['300033']['price'])    # 打印现价
        输出如下:
            {
                '300033': {
                    'StockCode': '300033',              # 股票代码
                    'MarketId': '33',                   # 市场ID
                    'open': 86.38,                      # 今日开盘价
                    'high': 87.58,                      # 今日最高价
                    'low': 83.3,                        # 今日最低价
                    'pre_close': 86.59,                 # 昨日收盘价
                    'price': 83.43,                     # 现价
                    'b1_p': 83.42,                      # 买一价
                    'b1_v': 25100.0,                    # 买一量
                    'b2_p': 83.41,                      # 买二价
                    'b2_v': 5000.0,                     # 买二量
                    'b3_p': 83.4,                       # 买三价
                    'b3_v': 13800.0,                    # 买三量
                    'b4_p': 83.39,                      # 买四价
                    'b4_v': 7600.0,                     # 买四量
                    'b5_p': 83.38,                      # 买五价
                    'b5_v': 10450.0,                    # 买五量
                    'a1_p': 83.43,                      # 卖一价
                    'a1_v': 8700.0,                     # 卖一量
                    'a2_p': 83.44,                      # 卖二价
                    'a2_v': 2300.0,                     # 卖二量
                    'a3_v': 2188.0,                     # 卖三量
                    'a3_p': 83.45,                      # 卖三价
                    'a4_p': 83.46,                      # 卖四价
                    'a4_v': 7300.0,                     # 卖四量
                    'a5_p': 83.47,                      # 卖五价
                    'a5_v': 100.0,                      # 卖五量
                    'zt_p': 95.25,                      # 涨停价
                    'dt_p': 77.93,                      # 跌停价
                    'ask': 83.42,                       # 买一价
                    'bid': 83.43,                       # 卖一价
                    'zf': -0.036494,                    # 涨幅
                    'zs': 0.0,                          # 涨速（5min涨跌幅）
                    'zd': -0.0316,                      # 涨跌
                    'zsz': 44851968000.0,               # 总市值
                    'zgb': 537600000.0,                 # 总股本
                    'syl_j': 70.7518,                   # 市盈率-静
                    'syl_d': 111.6941                   # 市盈率-动
                    'ltz': 22050745000.0,               # 流通值
                    'ltg': 264302350.0,                 # 流通股
                    'amount': 721906670.0               # 成交金额
                    'amount_count': 25527.0,            # 成交次数
                    'volume': 8486188.0,                # 成交量
                    'wpcjl': 3649478.0,                 # 外盘成交量
                    'npcjl': 4265493.0,                 # 内盘成交量
                    'np': 4836710.0,                    # 内盘
                    'lb': 0.74,                         # 量比
                    'hs': 0.032108,                    # 换手
                    'DDE': -0.2533,                     # 大单净量
                    'WAITBUYCOUNT2': 919656.0,          # 被动买入大单量
                    'BIGSELLMONEY3': 150231130.0,       # 主动卖出中单金额
                    'WAITBUYMONEY3': 134996420.0,       # 被动买入中单金额
                    'WAITBUYMONEY2': 78239066.0,        # 被动买入大单金额
                    'WAITSELLMONEY2': 62990306.0,       # 被动卖出大单金额
                    'WAITBUYCOUNT3': 1587830.0,         # 被动买入中单量
                    'BIGBUYCOUNT1': 503507.0,           # 主动买入特大单量
                    'BIGBUYMONEY2': 49370877.0,         # 主动买入大单金额
                    'BIGBUYMONEY1': 42944626.0,         # 主动买入特大单金额
                    'WAITBUYCOUNT1': 897308.0,          # 被动买入特大单量
                    'BIGSELLMONEY4': 91823222.0,        # 主动卖出小单金额
                    'WAITSELLCOUNT2': 741336.0,         # 被动卖出大单量
                    'BIGBUYCOUNT2': 579857.0,           # 主动买入大单量
                    'WAITBUYMONEY1': 76418034.0,        # 被动买入特大单金额
                    'BIGBUYMONEY3': 101441444.0,        # 主动买入中单金额
                    'BIGBUYCOUNT4': 1224179.0,          # 主动买入小单量
                    'BIGSELLCOUNT3': 1764849.0,         # 主动卖出中单量
                    'BIGSELLMONEY1': 94519539.0,        # 主动卖出特大单金额
                    'BIGBUYMONEY4': 104114862.0,        # 主动买入小单金额
                    'WAITSELLMONEY1': 58133983.0,       # 被动卖出特大单金额
                    'BIGSELLCOUNT2': 1028392.0,         # 主动卖出大单量
                    'WAITSELLCOUNT3': 1237623.0,        # 被动卖出中单量
                    'BIGSELLCOUNT4': 1077249.0,         # 主动卖出小单量
                    'WAITSELLCOUNT1': 684108.0,         # 被动卖出特大单量
                    'BIGSELLCOUNT1': 1116038.0,         # 主动卖出特大单量
                    'WAITSELLMONEY3': 105412918.0,      # 被动卖出中单金额
                    'BIGSELLMONEY2': 87460998.0,        # 主动卖出大单金额
                    'BIGBUYCOUNT3': 1192117.0,          # 主动买入中单量
                    'bdzs': 'E0      ',                 # 标的指数或股票代码
                }
            }
        '''

        return self.api.get_quote(StockCode)

    def reg_quote(self, StockCode):
        '''
        @brief 订阅指定代码列表的实时行情数据
        @param StockCode 证券代码列表，支持str、list、set格式，最多订阅500个
        @return 返回实时行情数据结构引用，是个dict，格式参考get_quote的返回，其内容在wait_update后更新
        @example
            from ths_api import *
            api = hq.ths_hq_api()
            quote = api.reg_quote('300033')
            while True：
                api.wait_update()
                print(quote['300033']['price'])
        '''

        return self.api.reg_quote(StockCode)

    def unreg_quote(self, StockCode):
        '''
        @brief 取消实时行情数据订阅，取消reg_quote订阅的实时行情数据
        @param StockCode 证券代码列表，支持str、list、set格式
        @return 无
        '''

        self.api.unreg_quote(StockCode)

    def get_kline(self, StockCode, duration_minute, length, fuquan=0):
        '''
        @brief 获取一次指定代码列表的周期行情数据，包括分钟线（1、5、15、30、60）、日线、周线、月线、季度线、年线，2s内只能执行1次
        @param StockCode 证券代码列表，支持str、list、set格式，一次最多取500个
        @param duration_minute 周期，以分钟为步长，支持int，入参为
               1=》1分钟线、5、15、30、60、1440=》日线（24*60）、10080=》周线（7*24*60）、43200=》月线、129600=》季度线、525600=》年线
        @param length 数据条数，最大1w条，比如 duration_minute=1 length=5表示从当前开始取一分钟线，取5条数据
        @param fuquan 0-除权，1-前复权，2-后复权
        @return 周期行情数据结构dict
        @example
            from ths_api import *
            api = hq.ths_hq_api()
            kline = api.get_kline('300033', 60*24, 5)
            print(kline)
        输出如下:
            {
                '300033': [{
                    'Index': 0,                     # 第几条周期数据
                    'volume': 12588330.0,           # 成交量
                    'amount': 1022889550.0,         # 成交金额
                    'MarketId': '33',               # 市场ID
                    'low': 77.77,                   # 最低价
                    'close': 80.08,                 # 收盘价
                    'datetime': 20190610,           # 日期
                    'high': 86.43,                  # 最高价
                    'StockCode': '300033',          # 股票代码
                    'open': 85.5                    # 开盘价
                }, {
                    'Index': 1,
                    'volume': 15001259.0,
                    'amount': 1275691220.0,
                    'MarketId': '33',
                    'low': 79.6,
                    'close': 88.09,
                    'datetime': 20190611,
                    'high': 88.09,
                    'StockCode': '300033',
                    'open': 79.98
                }, {
                    'Index': 2,
                    'volume': 12018505.0,
                    'amount': 1051643450.0,
                    'MarketId': '33',
                    'low': 86.5,
                    'close': 86.85,
                    'datetime': 20190612,
                    'high': 88.89,
                    'StockCode': '300033',
                    'open': 88.1
                }, {
                    'Index': 3,
                    'volume': 9170416.0,
                    'amount': 796497910.0,
                    'MarketId': '33',
                    'low': 85.7,
                    'close': 86.59,
                    'datetime': 20190613,
                    'high': 87.87,
                    'StockCode': '300033',
                    'open': 86.5
                }, {
                    'Index': 4,
                    'volume': 8486188.0,
                    'amount': 721906670.0,
                    'MarketId': '33',
                    'low': 83.3,
                    'close': 83.43,
                    'datetime': 20190614,
                    'high': 87.58,
                    'StockCode': '300033',
                    'open': 86.38
                }]
            }
        '''

        return self.api.get_kline(StockCode, duration_minute, length, fuquan)

    def reg_kline(self, StockCode, duration_minute, length, fuquan=0):
        '''
        @breif 订阅指定代码列表的周期数据
        @param StockCode 证券代码列表，支持str、list、set格式，一次最多取500个
        @param duration_minute 周期，以分钟为步长，支持int，入参为
               1=》1分钟线、5、15、30、60、1440=》日线（24*60）、10080=》周线（7*24*60）、43200=》月线、129600=》季度线、525600=》年线
        @param length 时长，对应需要多少条数据，比如 duration_minute=1 length=5表示从当前开始取一分钟线，取5条数据
        @param fuquan 0-除权，1-前复权，2-后复权
        @return 返回实时行情数据结构引用，是个dict，格式参考get_kline的返回，其内容在wait_update后更新
        @example
            from ths_api import *
            api = hq.ths_hq_api()
            kline = api.reg_kline('300033', 60*24, 5)
            while True:
                api.wait_update()
                print(kline['300033'][-1]['close'])     # 打印最近一个交易日的收盘价
        '''

        return self.api.reg_kline(StockCode, duration_minute, length, fuquan)

    def unreg_kline(self, StockCode):
        '''
        @brief 取消周期行情数据订阅，取消reg_kline订阅的周期行情数据
        @param StockCode 证券代码列表，支持str、list、set格式
        @return 无
        '''

        self.api.unreg_kline(StockCode)

    def wait_update(self):
        '''
        @brief 等待订阅的行情数据更新
               调用此接口将阻塞当前线程，等待订阅的行情数据推送更新才返回
        @return 行情数据变化的代码列表，数据结构为list
        @example
            from ths_api import *
            api = hq.ths_hq_api()
            kline = api.get_kline('300033', 60*24, 5)
            code_update = api.wait_update()
            print(code_update)
        输出如下:
            ['300033']
        '''

        return self.api.wait_update()

    def get_quote_update_codelist(self):
        '''
        @breif 配合wait_update的返回值使用，表示实时行情数据更新的代码列表
        @return list
        '''
        return self.api.get_quote_update_codelist()

    def get_kline_update_codelist(self):
        '''
        @brief 配合wait_update的返回值使用，表示周期行情数据更新的代码列表
        @return list
        '''

        return self.api.get_kline_update_codelist()

    def is_changing(self, obj, key=None):
        '''
        @brief 判断obj最近是否有数据更新
        @param obj reg_quote、reg_kline返回的数据对象
        @param key [可选] 需要判断的字段，默认不指定，格式为str或list of str
        @return 如果本次业务数据更新包含了待判定的字段，则返回True，否则返回False
        '''

        return self.api.is_changing(obj, key)

    def is_code_changing(self, obj, code, key=None):
        '''
        @brief 判断code的obj是否有数据更新
        @param obj reg_quote、reg_kline返回的数据对象
        @param code 股票代码，格式为str
        @param key [可选] 需要判断的字段，默认不指定，格式为str或list of str
        @return 如果本次业务数据更新包含指定代码的待判断字段，则返回True，否则返回False
        '''

        return self.api.is_code_changing(obj, code, key)

    def is_quote_changing(self):
        '''
        @brief 配合wait_update的返回值使用，表示实时行情数据是否更新
        @return 如果本次业务数据更新包含了实时行情数据，返回True，否则返回False
        '''

        return self.api.is_quote_update()

    def is_kline_changing(self):
        '''
        @brief 配合wait_update的返回值使用，表示周期行情数据是否更新
        @return 如果本次业务数据更新包含了周期行情数据，返回True，否则返回False
        '''
        return self.api.is_kline_update()

    def to_dataframe(self, kline, code):
        '''
        @brief 指定代码的周期数据转成pandas.DataFrame数据结构
        @param kline 周期数据
        @param code 股票代码
        @return pandas.DataFrame数据结构
        @example
            from ths_api import *
            api = hq.ths_hq_api()
            kline = api.get_kline('600000, 300033', 60*24, 5)
            df = api.to_dataframe(kline, '600000')
            print(df)
        输出如下:
    MarketId StockCode    amount  close  datetime   high    low   open      volume
0       17    600000  341904860.0  11.82  20190618   11.9  11.72  11.82  28965124.0
1       17    600000  537339850.0  11.88  20190619  12.07  11.81  12.04  44927745.0
2       17    600000  869024540.0   12.2  20190620  12.32  11.85  11.95  71647496.0
3       17    600000  670759370.0  12.09  20190621   12.3  12.03  12.18  55381180.0
4       17    600000  411172370.0  12.03  20190624  12.13  11.96  12.09  34195336.0
        '''

        return self.api.to_dataframe(kline, code)

    def enable_log(self, enable):
        '''
        @brief 屏蔽底层部分日志
		@param enable True or False
        '''
        self.api.enable_log(enable)


    def AD(self, kline, code):
        '''
        @brief 累积/派发线
        @param kline get_kline/reg_kline返回的周期数据
        @param code 股票代码
        @return pandas.DataFrame，包含1列
                ad
        '''
        df = self.to_dataframe(kline, code)
        return ta.AD(df)

    def ADOSC(self, kline, code, fastperiod=3, slowperiod=10):
        '''
        @brief Chaikin震荡指标
        @param kline get_kline/reg_kline返回的周期数据
        @param code 股票代码
        @param fastperiod
        @param slowperiod
        @return pandas.DataFrame，包含1列
                adosc
        '''
        df = self.to_dataframe(kline, code)
        return ta.ADOSC(df, fastperiod=fastperiod, slowperiod=slowperiod)

    def ATR(self, kline, code, n=14):
        '''
        @brief 平均真实波幅
               取一定时间周期内的股价波动幅度的移动平均值
        @param kline get_kline/reg_kline返回的周期数据
        @param code 股票代码
        @param n(int) 平均真实波幅的周期
        @return pandas.DataFrame，包含1列
                atr 平均真实波幅
        '''
        df = self.to_dataframe(kline, code)
        return ta.ATR(df, n=n)

    def APO(self, kline, code, fastperiod=12, slowperiod=26, matype=0):
        '''
        @brief 绝对价格振荡器
        @param kline get_kline/reg_kline返回的周期数据
        @param code 股票代码
        @param fastperiod
        @param slowperiod
        @param matype
        @return pandas.DataFrame，包含1列
                apo
        '''
        df = self.to_dataframe(kline, code)
        return ta.APO(df, fastperiod=fastperiod, slowperiod=slowperiod, matype=matype)

    def BOLL(self, kline, code, n=5, up=2, dn=2, m=0):
        '''
        @brief 布林线
        @param kline get_kline/reg_kline返回的周期数据
        @param code 股票代码
        @param n(int) 周期
        @param up 上轨线
        @param dn 下轨线
        @param m talib.MA_Type 不一样的加权方式计算移动平均
        @return pandas.DataFrame，包含3列，
                upperband   上轨线
                middleband  中轨线
                lowerband   下轨线
        '''
        df = self.to_dataframe(kline, code)
        return ta.BOLL(df, n=n, up=up, dn=dn, m=m)

    def CDL2CROWS(self, kline, code):
        '''
        @brief 两只乌鸦
        @param kline get_kline/reg_kline返回的周期数据
        @param code 股票代码
        @return pandas.DataFrame，包含1列，
                cdl2crows 值为-100, 0 or 100
        @note 三日K线模式，第一天长阳，第二天高开收阴，第三天再次高开继续收阴，收盘比前一日收盘价低，预示股价下跌
        '''
        df = self.to_dataframe(kline, code)
        return ta.CDL2CROWS(df)

    def CDL3BLACKCROWS(self, kline, code):
        '''
        @brief 三只乌鸦
        @param kline get_kline/reg_kline返回的周期数据
        @param code 股票代码
        @return pandas.DataFrame，包含1列，
                cdl3blackcrows 值为-100, 0 or 100
        @note 三日K线模式，连续三根阴线，每日收盘价都下跌且接近最低价，每日开盘价都在上根K线实体内，预示股价下跌。
        '''
        df = self.to_dataframe(kline, code)
        return ta.CDL3BLACKCROWS(df)

    def CMO(self, kline, code, n=14):
        '''
        @brief 钱德动量摆动指标
        @param kline get_kline/reg_kline返回的周期数据
        @param code 股票代码
        @param n(int) 周期
        @return pandas.DataFrame，包含3列，
                cmo
        '''
        df = self.to_dataframe(kline, code)
        return ta.CMO(df, n=n)

    def DEMA(self, kline, code, n):
        '''
        @brief 双指数加权移动平均线
        @param kline get_kline/reg_kline返回的周期数据
        @param code 股票代码
        @param n(int) 周期
        @return pandas.DataFrame，包含1列，
                dema 均线
        '''
        df = self.to_dataframe(kline, code)
        return ta.DEMA(df, n=n)

    def EMA(self, kline, code, n):
        '''
        @brief 指数加权移动平均线
        @param kline get_kline/reg_kline返回的周期数据
        @param code 股票代码
        @return pandas.DataFrame，包含1列，
                ema 均线
        '''
        df = self.to_dataframe(kline, code)
        return ta.EMA(df, n=n)

    def HT_TRENDLINE(self, kline, code):
        '''
        @brief 希尔伯特瞬时变换
        @param kline get_kline/reg_kline返回的周期数据
        @param code 股票代码
        @return pandas.DataFrame，包含1列，
                ht
        '''
        df = self.to_dataframe(kline, code)
        return ta.HT_TRENDLINE(df)

    def KAMA(self, kline, code, n=30):
        '''
        @brief 考夫曼的自适应移动平均线
        @param kline get_kline/reg_kline返回的周期数据
        @param code 股票代码
        @param n(int) 周期
        @return pandas.DataFrame，包含1列，
                kama
        '''
        df = self.to_dataframe(kline, code)
        return ta.KAMA(df, n=n)

    def KDJ(self, kline, code, fastk_period=5, slowk_period=3, slowk_matype=0, slowd_period=3, slowd_matype=0):
        '''
        @brief 随机指标
        @param kline get_kline/reg_kline返回的周期数据
        @param code 股票代码
        @param fastk_period:
        @param slowk_period:
        @param slowk_matype:
        @param slowd_period:
        @param slowd_matype:
        @return pandas.DataFrame，包含3列，
                k、d、j
        '''
        df = self.to_dataframe(kline, code)
        return ta.KDJ(df, fastk_period=fastk_period, slowk_period=slowk_period, slowk_matype=slowd_matype, slowd_period=slowd_period, slowd_matype=slowd_matype)

    def MA(self, kline, code, n, m=0):
        '''
        @brief 均线(移动平均线)
        @param kline get_kline/reg_kline返回的周期数据
        @param code 股票代码
        @param n(int) 周期
        @param m(int) 0-8 加权, 0=SMA, 1=EMA, 2=WMA, 3=DEMA, 4=TEMA, 5=TRIMA, 6=KAMA, 7=MAMA, 8=T3 (Default=SMA)
        @return pandas.DataFrame，包含1列，
                ma 均线
        @example:
            # 取'000001'平安银行的5日均线的当天均线值
            from ths_api import *
            code = '000001'
            api = hq.ths_hq_api()
            kline = api.get_kline(code, 24*60, 5)   # 取'000001'的日线数据从当天往前5条，即取最近5日的日K线数据，其中，第三个参数应大于等于下一行均线的周期数。
            df = api.MA( kline, code, 5)            # 获取最近5日的均线数据
            print(df)
            today_ma = df.iloc[-1,0]                # 取当日均线数据
        输出：
                   ma
            0     NaN
            1     NaN
            2     NaN
            3     NaN
            4  15.626
        '''
        df = self.to_dataframe(kline, code)
        return ta.MA(df, n=n, m=m)

    def MACD(self, kline, code, short=12, long=26, m=9):
        '''
        @brief 指数平滑异同平均线，根据短期、长期移动平均线的差离情况预判买卖股票时机
               DIFF = 12日EMA - 26日EMA
               DEA = DIFF的9日EMA
               hist = 2*(DIFF - DEA)
        @param kline get_kline/reg_kline返回的周期数据
        @param code 股票代码
        @param short(int)：短周期
        @param long(int)：长周期
        @param m(int)：移动平均线的周期
        @return pandas.DataFrame，包含3列，
                dif  差离值
                dea  指数加权移动平均线
                hist  macd的柱状线
        '''
        df = self.to_dataframe(kline, code)
        return ta.MACD(df, short=short, long=long, m=m)

    def MAMA(self, kline, code, fastlimit=0.5, slowlimit=0.05):
        '''
        @brief MESA自适应移动平均
        @param kline get_kline/reg_kline返回的周期数据
        @param code 股票代码
        @param fastlimit
        @param slowlimit
        @return pandas.DataFrame，包含2列，
                mama
                fama
        '''
        df = self.to_dataframe(kline, code)
        return ta.MAMA(df, fastlimit=fastlimit, slowlimit=slowlimit)

    def MAVP(self, kline, code, periods, minperiod=2, maxperiod=30, matype=0):
        '''
        @brief 可变周期的移动平均线
        @param kline get_kline/reg_kline返回的周期数据
        @param code 股票代码
        @param periods(ndarray)
        @param minperiod
        @param maxperiod
        @param matype
        @return pandas.DataFrame，包含1列，
                mavp
        '''
        df = self.to_dataframe(kline, code)
        return ta.MAVP(df, periods=periods, minperiod=minperiod, maxperiod=maxperiod, matype=matype)

    def MOM(self, kline, code, n=10):
        '''
        @brief 动量
        @param kline get_kline/reg_kline返回的周期数据
        @param code 股票代码
        @param n(int) 周期
        @return pandas.DataFrame，包含1列，
                mom
        '''
        df = self.to_dataframe(kline, code)
        return ta.MOM(df, n=n)

    def OBV(self, kline, code):
        '''
        @brief 能量潮
        @param kline get_kline/reg_kline返回的周期数据
        @param code 股票代码
        @return pandas.DataFrame，包含1列，
                obv
        '''
        df = self.to_dataframe(kline, code)
        return ta.OBV(df)

    def PPO(self, kline, code, fastperiod=12, slowperiod=26, matype=0):
        '''
        @brief 比例价格振荡器
        @param kline get_kline/reg_kline返回的周期数据
        @param code 股票代码
        @param fastperiod 短期指数平滑移动均线周期
        @param slowperiod 长期指数平滑移动均线周期
        @param matype 权重
        @return pandas.DataFrame，包含1列，
                ppo
        '''
        df = self.to_dataframe(kline, code)
        return ta.PPO(df, fastperiod=fastperiod, slowperiod=slowperiod, matype=matype)

    def ROC(self, kline, code, n=10):
        '''
        @brief 变化率
        @param kline get_kline/reg_kline返回的周期数据
        @param code 股票代码
        @param n(int) 周期
        @return pandas.DataFrame，包含1列，
                roc
        '''
        df = self.to_dataframe(kline, code)
        return ta.ROC(df, n=n)

    def ROCP(self, kline, code, n=10):
        '''
        @brief 变化率百分比
        @param kline get_kline/reg_kline返回的周期数据
        @param code 股票代码
        @param n(int) 周期
        @return pandas.DataFrame，包含1列，
                rocp
        '''
        df = self.to_dataframe(kline, code)
        return ta.ROCP(df, n=n)

    def ROCR(self, kline, code, n=10):
        '''
        @brief 变化率的比率
        @param kline get_kline/reg_kline返回的周期数据
        @param code 股票代码
        @param n(int) 周期
        @return pandas.DataFrame，包含1列，
                rocr
        '''
        df = self.to_dataframe(kline, code)
        return ta.ROCR(df, n=n)

    def ROCR100(self, kline, code, n=10):
        '''
        @brief 变化率的比率100倍
        @param kline get_kline/reg_kline返回的周期数据
        @param code 股票代码
        @param n(int) 周期
        @return pandas.DataFrame，包含1列，
                rocr100
        '''
        df = self.to_dataframe(kline, code)
        return ta.ROCR100(df, n=n)

    def RSI(self, kline, code, n=14):
        '''
        @brief 相对强弱指数
        @param kline get_kline/reg_kline返回的周期数据
        @param code 股票代码
        @param n(int) 周期
        @return pandas.DataFrame，包含1列，
                rsi
        '''
        df = self.to_dataframe(kline, code)
        return ta.RSI(df, n=n)

    def SMA(self, kline, code, n):
        '''
        @brief 简单移动平均线
        @param kline get_kline/reg_kline返回的周期数据
        @param code 股票代码
        @param n(int) 周期
        @return pandas.DataFrame，包含1列，
                sma
        '''
        df = self.to_dataframe(kline, code)
        return ta.SMA(df, n=n)

    def STOCHRSI(self, kline, code, timeperiod=14, fastk_period=5, fastd_period=3, fastd_matype=0):
        '''
        @brief 随机相对强弱指标
        @param kline get_kline/reg_kline返回的周期数据
        @param code 股票代码
        @param fastk_period:
        @param fastd_period:
        @param fastd_matype:
        @return pandas.DataFrame，包含2列，
                k、d
        '''
        df = self.to_dataframe(kline, code)
        return ta.STOCHRSI(df, timeperiod=timeperiod, fastk_period=fastk_period, fastd_period=fastd_period, fastd_matype=fastd_matype)

    def T3(self, kline, code, n=5, vfactor=0):
        '''
        @brief 三指数移动平均线(T3)
        @param kline get_kline/reg_kline返回的周期数据
        @param code 股票代码
        @param n(int) 周期
        @param vfactor
        @return pandas.DataFrame，包含1列，
                t3
        '''
        df = self.to_dataframe(kline, code)
        return ta.T3(df, n=n, vfactor=vfactor)

    def TEMA(self, kline, code, n):
        '''
        @brief 三指数移动平均线
        @param kline get_kline/reg_kline返回的周期数据
        @param code 股票代码
        @param n(int) 周期
        @return pandas.DataFrame，包含1列，
                tema
        '''
        df = self.to_dataframe(kline, code)
        return ta.TEMA(df, n=n)

    def TRIX(self, kline, code, n=30):
        '''
        @brief 三重光滑EMA的日变化率
        @param kline get_kline/reg_kline返回的周期数据
        @param code 股票代码
        @param n(int) 周期
        @return pandas.DataFrame，包含1列，
                trix
        '''
        df = self.to_dataframe(kline, code)
        return ta.TRIX(df, n=n)

    def WMA(self, kline, code, n):
        '''
        @brief 加权移动平均数
        @param kline get_kline/reg_kline返回的周期数据
        @param code 股票代码
        @param n(int) 周期
        @return pandas.DataFrame，包含1列，
                wma
        '''
        df = self.to_dataframe(kline, code)
        return ta.WMA(df, n=n)

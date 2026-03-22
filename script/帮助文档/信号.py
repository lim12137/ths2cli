'''
@brief  信号策略帮助文档
'''

'''
1、什么是信号策略？
    信号是最常用的一些预警条件，为了让您可以直接订阅信号，而不用自己订阅行情、自己处理。
    如果信号策略不满足您的需求，您可以自行订阅行情、自行判断、或者和信号联合判断。
    我们也会根据您的需求，不断完善信号策略。

2、信号策略怎么使用？
    使用前请熟悉 帮助文档/HQ.py，熟悉行情数据的字段定义，比如get_quote、get_kline的样例
    使用前请熟悉 帮助文档/xiadan.py, 熟悉其中cmd函数
    使用样例参照：信号策略/my_signals.py，也可以在my_signals.py目录新建自己的信号策略.py，运行自己的信号策略
    具体接口介绍：

    def run(codelist, condition, action, predefine=None, period=None, lenth=None, interval=None):
    @brief 运行信号策略
    @param codelist: 支持str of list，str，用于注册实时or历史数据，包含一些关键字：
                        纯数字：用户自定义代码列表（包括1A0001）
                        position：持仓表
                        order：可撤委托表
                        fullorder：全量委托表
                        自选股：自选股列表
                        其他问句：先取自定义板块，取不到则问财选股
    @param condition: str，直接被执行的str，包含一些关键字：
                        quote：监控代码的分时
                        quote2：辅助代码的分时
                        kline：监控代码的K线，kline[code][period][lenth]方式可以指定周期和条数，否则默认取30条日线
                                默认周期和条数可以通过set_kline_param设置
                        kline2：辅助代码的K线
                        code：行情数据更新的代码
    @param action: str，信号触发后行为
    @param predefine（可选参数）: 支持str of list，str，数据项定义语句，信号触发前执行
    @param period（可选参数）: int，用户设置的历史数据的周期
    @param lenth（可选参数）: int，用户设置的历史数据的条数
    @param interval（可选参数）: int，用户设置的定时信号周期
    @return: 信号策略ID
    @example:
        #① 当600000的股票价格大于10元时，以最新价买入该股100股。
        run('600000', "quote[code]['price'] > 10.00", "xd.cmd('buy %s %s 100' % (code, 'zxjg'))")  
        
        #② 当监控代码：600000的股票当日涨幅超过2%，且辅助代码：上证指数涨幅超过1%时，以最新价买入该股100股。        
        run('600000', "quote[code]['zf'] > 0.02 and quote2['1A0001']['zf'] > 0.01", "xd.cmd('buy {0} {1} 100'.format(code, quote[code]['price']))")    
            
        #③ 当600000、000001中任一股票当日涨幅超过1%，以对手价——卖一价，买入该股100股，并继续监控未触发的股票，直至条件触发，以同样的委托方式进行委托。
        run('600000，000001', "quote[code]['zf'] > 0.01", "xd.cmd('buy %s %s 100' % (code, 'dsj1'))")
 
        #④ 炸板预卖：持仓股中有股票出现涨停，后封板金额小于阈值100万元，不弹窗确认委托，直接自动清仓该股票。
        run('position', "f_dkztb(quote, code, 1000000)", "xd.cmd('sell {0} {1} -cw 1/1 -notip'.format(code, quote[code]['price']))")
        
        #⑤ 当上证指数跌幅超过2%，撤销所有可撤委托表中的买单。
        run('order', "quote2['1A0001']['zf'] < -0.02", "xd.cmd('cancel buy')")
        
        #⑥ 当自选股中的股票价格在60日均线上方，以最新价买入该股100股。
        #计算当日的60日均线值需要最近的60条日线，信号中kline默认取30条日线数据，因此需要设置lenth
        run('自选股', "quote[code]['price'] > api.MA( kline, code, 60, m=0).iloc[-1,0]",  "xd.cmd('buy {0} {1} 100'.format(code, quote[code]['price']))", lenth=60)
        
        #⑦ 取i问财中查询的出现'macd底背离'的股票列表，当仓位：可用金额/总资产>80%，以最新价依次买入列表中的股票500股，直到仓位不满足条件为止。
        run('macd底背离前10', "xd.g_money['kyje']/xd.g_money['zzc']>0.8", "xd.cmd('buy {0} zxjg 500'.format(code))")

        #⑧ 数据预定义
        # 最新价大于5日均线
        pre = ["quote[code]['ma5'] = api.MA(kline, code, 5).iloc[:,0].tolist()"]
        run('600000, 000001', "quote[code]['price'] > quote[code]['ma5'][-1]", "xd.cmd('buy {0} {1} 100 -notip'.format(code, quote[code]['price']))", predefine=pre)

    def pause(signal_id):
    @brief 暂停信号运行
    @param run接口返回的signal_id
    @return 无

    def resume(signal_id):
    @brief 恢复信号运行
    @param run接口返回的signal_id
    @return 无

    def delete(signal_id):
    @brief 删除信号
    @param run接口返回的signal_id
    @return 无


3、已内置哪些信号？
    def f_cghl(quote, code, P, R):
    @brief 冲高P元回落R% (最高价高于P，当前价格再比最高价回落R%)
    @param quote: 实时行情数据
    @param code: 指定代码
    @param P: 冲高比较价格
    @param R: 回落比较比例
    @return: True   code满足冲高P元回落R%的条件
             False  code不满足冲高P元回落R%的条件

    def f_dkztb(quote, code, wtje):
    @brief 打开涨停板：当封板的金额小于设定的阀值时触发
    @param quote: 实时行情数据
    @param code: 指定代码
    @param wtje: 封板金额阈值
    @return: True or False

    def f_fzt(quote, code, up_b1_je = None, down_b1_je = None):
    @brief 封涨停，排除持续涨停的情况，涨停后在判断封单金额的上下限
    @param quote: 实时行情数据
    @param code: 指定代码
    @param up_b1_je: 封单金额上限
    @param down_b1_je: 封单金额下限
    @return: True or False

    def f_sj(T):
    @brief 时间信号，系统时间>=T触发
    @param T: int，比如9:30，T应该设置为093000
    @return: True or False

    def f_fthlfd(quote, code, threshold, time_second):
    @brief 反弹回落幅度：持续监控最近time_second的时间段内，股票的反弹回落幅度（当前的最新价和时间段内的最低价、最高价比较），若该幅度超过设定阈值则触发相应操作（一般是委托）
    @param quote: 实时行情数据
    @param code: 指定代码
    @param threshold: 涨跌幅阈值，跌为负，涨为正；跌幅小于负的阈值或涨幅大于正的阈值，条件触发；阈值不为百分数，是实际值，如上涨2%为0.02
    @param time_second: 监控的时间段长度，单位：秒; 可输入范围：0到24*60*60
    @return: True or False


    def f_MACD(api, code, period_macd, form_macd, form_macd_count, period_inspect=100):
    @brief MACD条件：
        一次金叉/死叉：当程序启动后，出现新的金叉/死叉，条件触发，执行设置的委托。
        二次金叉/死叉：设置某个时间长度，持续监控最近期的该时间窗口，当程序启动后，出现新的金叉/死叉，且在窗口中以前出现过至少一次金叉/死叉时，条件触发，执行设置的委托。
        底背离/顶背离：设置某个时间长度，持续监控最近期的该时间窗口，当程序启动后，股价出现新低/新高（该新低/新高比窗口中的低点/高点更低/更高），但此时DIF未创新低/新高，条件触发，执行设置的委托。
    @param api: 导入hq.ths_hq_api，用于修改kline的周期
    @param code: 指定代码
    @param period_macd: 取哪个周期的MACD作为条件
    @param form_macd: 'j'金叉/底背离；'s'死叉/顶背离
    @param form_macd_count: 1,2=>1次，2次(金叉或死叉）；3=>顶或底背离。配合form_macd，例如form_macd='j',form_macd_count=3，表示底背离。
    @param period_inspect=100: 监控的时间窗口长度
    @return: True or False


4、如何添加自定义信号？
    打开xiadan.exe同目录的script\信号策略\my_defines.py
    仿照内置的信号添加自定义信号，改完后执行或者退出下单进程并重新启动

    写函数前需要了解的已有的定义：
    api：ths_hq_api的实例
    quote：实时数据
    quote2：辅助代码实时数据
    kline：周期数据
    kline2：辅助周期数据
    code：当前更新数据的代码
    上述6个变量可以直接在函数内使用，而无需定义。需要使用上述变量的时候，以传参形式传给自定义函数。

5、如何预处理数据？
    # example
    pre = "quote[code]['ma5'] = api.MA(kline, code, 5).iloc[:,0].tolist()"
    run('600000, 000001', "quote[code]['price'] > quote[code]['ma5'][-1]", "xd.cmd('buy {0} {1} 100 -notip'.format(code, quote[code]['price']))", predefine=pre)

    ①首先定义想要的预定义，如pre，也可以定义多条，如：
    pre = [
       "quote[code]['b1_fdl'] = float(quote[code]['b1_p']) * float(quote[code]['b1_v'])",
       "quote[code]['ma5'] = api.MA(kline, code, 5).iloc[:,0].tolist()"
    ]
    ②然后调用run的时候，指定预定义的语句至predefine
    run(codelist, condition, action, predefine=pre)

    ③推荐这些定义的变量都存到quote[code]里面，如果是单独定义，如：
    "ma5 = api.MA(kline, code, 5).iloc[:,0].tolist()"
    虽然可以定义出这个变量，但因为python作用域的问题，无法在接下来条件的判断中使用ma5

6、周期数据说明？
    目前支持3种格式
    ①kline[code][period][lenth][第几行数据][具体数据项]：可以解析出指定的period、lenth
    ②kline[code][第几行数据][具体数据项]：默认30条日线数据
    ③api.MA(kline, code, 5)：默认取30条日线数据计算均线

    如用②、③情况下，也可以通过下述接口改变想要的周期和条数
    run(codelist, condition, action, period=None, lenth=None):
    @example：
        # 表示要取60条1分钟线
        run('600000', "kline[code][-1]['high'] > 12.45", "xd.cmd('buy {0} {1} 100'.format(code, quote[code]['price']))", period=1, lenth=60)

7、定时信号说明
    有一种信号，完全不需要行情数据，比如定时信号。
    系统已实现每3s判断一次该类条件。
    如果用户觉得长了或者断了，可以指定时间间隔：
    run(codelist, condition, action, interval=None):
    @example：
        # 设置定时周期为5，即5s判断一次条件
        run('600000', "f_sj(140000)", "xd.cmd('buy {0} zxjg 100'.format(code))", interval=5)
       
    需要注意的一点是，条件出发后的动作里面也不要有行情相关的数据
        
'''
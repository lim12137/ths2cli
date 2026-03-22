$(document.body).append('<script type="text/javascript" src=js/calendar.js></scripts>');
// 返回的json串去掉回车
function ReplaceString(str)
{
	var strdes = str;
	strdes = strdes.replace(/\n/g,' ');
	strdes = strdes.replace(/\r/g,' ');
	strdes = strdes.replace(/\/n/g,' ');
	strdes = strdes.replace(/\/r/g,' ');
	return strdes;
}

//对行情数据做格式化处理
function ReplaceHqData(str)
{
	var strdes = str;
	strdes = ReplaceString(strdes);
	strdes = strdes.replace(/\t/g,' ');
	strdes = strdes.replace(/\"/g,' ');
	return strdes;
}

//悬浮框内容设置
function GetSection(strData)
{
	return '<td class="' + (parseFloat(strData) < 0 ? 'fall' : (parseFloat(strData) > 0 ? 'rise' : '')) + '">' + strData + '</td>';
}

//取用户资金数据值，曲线图 悬浮框设置
function GetUserTotalValue(dataIndex)
{
	var strDateSection = GetCurDateSection();
	var arrUserProfit = g_jsonIndexFromXcs[strDateSection]['userProfit'];
	return GetTotalValue(strDateSection, arrUserProfit, dataIndex);
}

//取曲线数据，曲线图 悬浮框设置
function GetIndexSection(dataIndex)
{
	var strDateSection = GetCurDateSection();
	if(strDateSection == 'today')//当日数据不展示曲线数据
	{
		return '<td></td>'
	}
	else
	{
		var strIndexSection = GetCurIndexSection();
		var arrIndexData = g_jsonIndexFromXcs[strDateSection][strIndexSection];
		return GetTotalValue(strDateSection, arrIndexData, dataIndex);
	}
}
//确定按钮
function OnCustomizeQueryZjqx()
{
	if(!$('#selectDateDetermin').hasClass('selectDateDeterminOn') && $('#selectDateDetermin').hasClass('selectDateDeterminOff'))//开关打开才发查询请求
	{
		return '';
	}
	var strIndexSection = GetCurIndexSection();//获取当前指数选项
	SendCBASEx('custom.submit');//自定义确认
	
	var strStartDate = $('#form_datetime1 input').val().replace(/[^0-9]/g, '');
	var strEndDate = $('#form_datetime2 input').val().replace(/[^0-9]/g, '');
	strIndexSection = TranslateIndex(strIndexSection);
	SendCBASEx('custom.from'+'_'+strStartDate+'_to'+'_'+strEndDate+'.'+strIndexSection);
	var jsonParam = {};
	jsonParam['startDate'] = strStartDate;
	jsonParam['endDate'] = strEndDate;
	jsonParam['dateSection'] = 'customize';
	fnQueryIndexDataFromXcs(jsonParam)
}
//设置当日金额
function GetTotalValue(strDateSection, arrData, dataIndex)
{
	var value = 0.0;
	if(strDateSection == 'today')
	{
		if(arrData.length==(dataIndex + 1))
		{
			value = g_fxuanfu;
		}
		else
		{
			value = parseFloat(g_fAssetPre) / 100 * parseFloat(arrData[dataIndex]);
		}
		value = value.toFixed(2);
		return GetSection(value);
	}
	else
	{
		value = parseFloat(arrData[dataIndex][1]).toFixed(2) + '%';
		return GetSection(value);
	}
}
/*********************************************************************
 * creator      : @zhengtuo
 * date         : 2020-04-29
 * function     : 获取几个月，几天前的数据               
 * parameter    : nBeforeMonth 几个月前，nBeforeDay 几天前
 * return       : 当前日期
 *********************************************************************/
function fn_getMonthsDate(nBeforeMonth, nBeforeDay)
{
	var myData = new Date();
	var tempBeforeMonth = nBeforeMonth || 0;
	var tempBeforeDay = nBeforeDay || 0;
	myData.setDate(myData.getDate() - tempBeforeDay);
	myData.setMonth(myData.getMonth() - tempBeforeMonth);
	
	var strDate = myData.getFullYear().toString();
	
	var month = myData.getMonth() + 1;
	if (month >= 1 && month <= 9) 
	{
		month = "0" + month;
	}
	
	strDate += month;
	var date = myData.getDate();
	if (date >= 0 && date <= 9) 
	{
		date = "0" + date;
	}
	
	strDate += date;
	
	return strDate;
}
/*********************************************************************
 * creator      : @zhengtuo
 * date         : 2020-04-29
 * function     : 是否超出年份             
 * parameter    : strStartDate 起始日期 strEndDate 结束日期 nYear 年份
 * return       : true 超出年份; false 未超出年份
 *********************************************************************/
function IsGreateYears(strStartDate, strEndDate, nYear)
{
	var diffYearDate = new Date(parseInt(strEndDate.substring(0, 4), 10) - nYear, parseInt(strEndDate.substring(4, 6), 10) -  1, parseInt(strEndDate.substring(6, 8), 10)).format('yyyyMMdd');
	
	return (diffYearDate > strStartDate ? true : false);
}
/*********************************************************************
 * creator      : @zhengtuo
 * date         : 2020-04-29
 * function     : 隐藏小财神未开通页面
 *                
 * parameter    : 
 * return       : 
 *********************************************************************/
function hideXcsStatusPage()
{
	$('#NotOpenTipsPage').hide();
	$('#today').click();
}

/*********************************************************************
 * creator      : @zhengtuo
 * date         : 2020-04-29
 * function     : 时间控件变化触发事件             
 * parameter    : 
 * return       : 
 *********************************************************************/
function OnTimerChangeControl()
{
	var strStartDate = $('#form_datetime1 input').val().replace(/[^0-9]/g, '');
	var strEndDate = $('#form_datetime2 input').val().replace(/[^0-9]/g, '');
	var bGreateTwoYears = IsGreateYears(strStartDate, strEndDate, 2);
	g_strcustomizeEndDate = strEndDate;
	if(strStartDate > strEndDate)//起始日期大于结束日期
	{
		$('#selectDateDetermin').addClass('selectDateDeterminOff').removeClass('selectDateDeterminOn');
		$('#dateSelectTips').show();
		$('#dateSelectTips').text('起始日期不能大于终止日期');
	}
	else
	{		
		$('#selectDateDetermin').addClass('selectDateDeterminOn').removeClass('selectDateDeterminOff');
		$('#dateSelectTips').hide();
	}
}
/*********************************************************************
 * creator      : @zhengtuo
 * date         : 2020-04-29
 * function     : 初始化时间控件   
 * parameter    : 
 * return       : 
 *********************************************************************/
function initTimerCtrl()
{
	// fnFunction("test_json","initTimerCtrl");
	var strStartDate = fn_getMonthsDate(1);
	var strEndDate = fn_getMonthsDate(0);
	 $('#form_datetime1').datetimepicker({
		language:  'zh-CN',
		autoclose: 1,
		startView: 2,
		forceParse: 0,
		minView: 2,
		format:"yyyy年mm月dd日",
		startDate: new Date(parseInt(strEndDate.substring(0, 4), 10) - 10, 1, 1),
		initialDate: strStartDate.substring(0, 4) + '-' + strStartDate.substring(4, 6) + '-' + strStartDate.substring(6, 8)
	}).on('changeDate',OnTimerChangeControl);
	 $('#form_datetime2').datetimepicker({
		language:  'zh-CN',
		autoclose: 1,
		startView: 2,
		forceParse: 0,
		minView: 2,
		format:"yyyy年mm月dd日",
		startDate: new Date(parseInt(strEndDate.substring(0, 4), 10) - 10, 1, 1),
		initialDate: strEndDate.substring(0 ,4) + '-' + strEndDate.substring(4 ,6) + '-' + strEndDate.substring(6 ,8)
	}).on('changeDate',OnTimerChangeControl);
	
	 $('#time1').val(new Date(parseInt(strStartDate.substring(0, 4), 10), parseInt(strStartDate.substring(4, 6), 10) -  1, parseInt(strStartDate.substring(6, 8), 10)).format('yyyy年MM月dd日'));
	 $('#time2').val(new Date().format('yyyy年MM月dd日'));
}

/*********************************************************************
 * creator      : @xukanfeng
 * modifier		: @zhengtuo
 * date         : 2018-09-18
 * function     : 对json数组根据指定key值排序,并按照升序或者降序排列
 * parameter    : json数组，key值，flag值：upper：升序，down：降序
 * return       : 排序后的json数组
 *********************************************************************/
function SortJsonByKey(array, key, flag)
{
	return array.sort(function(a, b){
		var x = a[key];
		var y = b[key];
		if('down' == flag)
			return (x < y ? 1 : (x > y ? -1 : 0));
		else if ('upper' == flag)
			return (x > y ? 1 : (x < y ? -1 : 0));
	});
}

function getMyDay(date)
{
    var week;
    if(date.getDay()==0) week="周日";
    if(date.getDay()==1) week="周一";
    if(date.getDay()==2) week="周二";
    if(date.getDay()==3) week="周三";
    if(date.getDay()==4) week="周四";
    if(date.getDay()==5) week="周五";
    if(date.getDay()==6) week="周六";
    return week;
}

Date.prototype.format = function (fmt)
{
	var o = {
		"M+": this.getMonth() + 1, //月份 
		"d+": this.getDate(), //日 
		"h+": this.getHours(), //小时 
		"m+": this.getMinutes(), //分 
		"s+": this.getSeconds(), //秒 
		"q+": Math.floor((this.getMonth() + 3) / 3), //季度 
		"S": this.getMilliseconds() //毫秒 
	};
	if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
	for (var k in o)
	if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
	return fmt;
}

function getDayAll(begin,end)
{
	var dateAllArr = new Array();
	var db = new Date();
	db.setUTCFullYear(parseInt(begin.substring(0, 4), 10), parseInt(begin.substring(4, 6), 10) - 1, parseInt(begin.substring(6, 8), 10));
	var de = new Date();
	de.setUTCFullYear(parseInt(end.substring(0, 4), 10), parseInt(end.substring(4, 6), 10) - 1, parseInt(end.substring(6, 8), 10));
	var unixDb=db.getTime();
	var unixDe=de.getTime();
	for(var k=unixDb;k<=unixDe;){
		dateAllArr.push((new Date(parseInt(k))).format("yyyyMMdd").toString());
		k=k+24*60*60*1000;
	}
	return dateAllArr;
}

function GetMonthLastDay(strDate)
{
	  var date=new Date();
	  var curYear = parseInt(strDate.substring(0,4), 10);
	  var curMonth = parseInt(strDate.substring(4,6), 10);
	  var nextMonthFirstDay = new Date(curYear,curMonth,1);
	  var oneDay = 1000*60*60*24;
	  return new Date(nextMonthFirstDay-oneDay).format("yyyyMMdd");
}
	
function initBtnEvent()
{
	//日期选择事件绑定
	$('.profitContentDataTab li').each(function(){
		$(this).click(function(){
			g_nowClickTab = this.id; //nosonar
			var strIndexSection = GetCurIndexSection();//获取当前指数选项
			strIndexSection = TranslateIndex(strIndexSection);
			var strDateSection;
			var costtime;
			if(g_beginstaytime==0)
			{
				g_beginstaytime = (new Date()).valueOf();
				costtime = 0;
			}
			else
			{
				g_endstaytime = (new Date()).valueOf();
				costtime = g_endstaytime - g_beginstaytime;
				g_beginstaytime = g_endstaytime;			
			}
			if(g_curDateSection!='')
			{
				strDateSection = TranslateTimeTab(g_curDateSection);
				SendCBASEx(strDateSection+'.'+strIndexSection+'.staytime.'+costtime+'ms');
			}
			strDateSection = TranslateTimeTab(this.id);
			SendCBASEx(strDateSection+'.'+strIndexSection);
			if($(this).hasClass('select'))//如果该日期标签已经被选中的话则直接返回。
			{
				return '';
			}
			else
			{
				if(this.id != "today")//不是当天先查小财神状态
				{
					var xcsStatus = GetXcsStatus();
					g_status = parseInt(xcsStatus, 10);
					if(!HandleXcsStatus(xcsStatus))
					{
						$('.dateSelect').attr('data', this.id);
						return '';
					}
				}
				OnTriggerEventByDateSection(this.id);
			}	
		})
	})
	//指数选择事件绑定
	$('.profitContentIndexTab li').each(function(){
		$(this).click(function(){
			var strDateSection = GetCurDateSection();//获取当前时间选项
			strDateSection = TranslateTimeTab(strDateSection);
			var indexSection = TranslateIndex(this.id);
			SendCBASEx(strDateSection+'.'+indexSection);
			if($(this).hasClass('select'))//指数选中的时候直接返回
			{
				return '';
			}
			else
			{
				$(this).addClass('select');//如果点击的指数不是选中状态则设置为选中状态
				$(this).siblings().removeClass('select');//并且将剩余的其他指数选中状态移除
				setTimeout("drawAssetCurvePage()",50);
			}
		})
	})
}


function hideBtnEvent()
{
	if($('#MonthProfitData').text() !== '******')
	{
		$('#MonthProfitData').text('******');
		$('#pwdBtn img').attr('src', './images/pwdHideBtn.png');
		SendCBASEx('hidenumber');
		g_hideYK = 1;
	}
	else
	{
		$('#MonthProfitData').text($('#MonthProfitData').attr('data'));
		$('#pwdBtn img').attr('src', './images/pwdShowBtn.png');
		SendCBASEx('shownumber');
		g_hideYK = 0;
	}
	setRateElementColor()
}
//持仓数超过100的处理函数
function HandleLage100()
{
	document.getElementById("Chart").style.visibility = 'hidden';
	$('.profitContentDataTab li').removeClass('select');
	$('.profitContentIndexTab li').removeClass('select');

	$(".xcstips").css('z-index', 110).show().hide();
	$('#needOpenXcs,#NotSupportXcs,#NotSupportAssetCurve,#Large100,#openXcsFail,#HQData').hide();
	$('#NotOpenTipsPageBg').css('background-color','black');

	$('#NotOpenTipsPage').show();
	$('#Large100').css('z-index', 190).show();
	return;	
}
//行情数据获取失败
function HQDataFailed()
{
	fnShowDataError();
	return;	
}
function OnReloadXcs()
{
	$("#NewTips").hide();
	$(".xcstips").hide();
	$('#NotOpenTipsPageBg').css('background-color','white');
	$('#NotOpenTipsPage').show();
	$('#loadingxcs').css("z-index",190).show();
	fn_cxXcsQx();
}
// 小财神未开通时，点击开通时的响应
function OnOpenXcs()
{
	var Open_xcsStatus = fnFunction('get_module_statue', 'module=xcs\nuser=' +g_jsonUserInfo['userkey']); //nosonar
	
	Open_xcsStatus = parseInt(Open_xcsStatus);
	
	var nXcsMode = fnFunction('get_authorization', 'func_id=11\nuser=' +g_jsonUserInfo['userkey']); //nosonar
	
	nXcsMode = parseInt(nXcsMode);
	
	if(nXcsMode < 0)
	{
		Open_xcsStatus = -2;
	}
	
	if(Open_xcsStatus == 0)
	{
		fnShowLoadingTips();
		$('#needOpenXcs').hide();
		g_updataTimer = setInterval("fnStausTimeout()",3000);//设置客户端小财神准备数据超时定时器
		fn_cxXcsXy(g_jsonUserInfo['userkey']); //nosonar
	}
	else
	{
		HandleXcsStatus(Open_xcsStatus);
	}
}
// 小财神状态处理函数：-2不支持小财神功能， -1小财神数据获取失败，0小财神未开通，1-3小财神更新中，4小财神更新成功，4以上小财神更新失败
function HandleXcsStatus(nStatus) //nosonar
{
	var todayStatus = $('#needOpenXcs').is(':hidden');
	$(".xcstips").css('z-index', 110).show().hide();
	$('#needOpenXcs,#NotSupportXcs,#NotSupportAssetCurve,#Large100,#openXcsFail,#HQData').hide();
	$('#NotOpenTipsPageBg').css('background-color','black');
	//g_xcsStatus = nStatus;
		if(nStatus == -1)
		{
			// fn_getXcsDataFailed();
		}
		else if(nStatus == -2)
		{
			$('#NotOpenTipsPage').show();
			$('#NotSupportXcs').css('z-index', 190).show();
			return false;
		}
		else if(nStatus == -3)
		{
			$('#NotOpenTipsPage').show();
			$('#NotSupportAssetCurve').css('z-index', 190).show();
			return false;	
		}
		else if(nStatus == 0)
		{
			var section = 'assetDoNotPop';
			var key = g_jsonUserInfo['userkey'];
			var iniPath = fnFunction("get_modulepath", "") + "RES\\Zyy\\zyy.ini"; //nosonar
			var alreadyPop = readConfig(section, key, '', iniPath); //nosonar
			//需要弹窗的情况
			if((g_nowClickTab === "today" && alreadyPop !== '1') || g_nowClickTab !== "today") {
				$('#NotOpenTipsPage').show();
				$('#needOpenXcs').css('z-index', 190).show();
				if(g_nowClickTab === "today") {//当日弹窗只弹一次
					writeConfig(section, key, "1", iniPath);
				}
			} else {
				if(todayStatus) {
					$('#NotOpenTipsPage').hide();
					$('#NotOpenTipsPageBg').css('background-color','');
				} else {
					$('#NotOpenTipsPage').show();
					$('#needOpenXcs').css('z-index', 190).show();
				}
			}
			return false;
		}
		else if(nStatus > 0 && nStatus <4)
		{
			//展示数据正在准备中弹
			$("#updataLoadingTip").show();
			$('#NotOpenTipsPage').hide();
			$('#updataLoadingTimeoutTip').hide();
			$('#reportTips').hide();
			return true;
		}
		else if(nStatus == 4 || nStatus >= 10)
		{
			$("#updataLoadingTimeoutTip").hide();
			$("#reportTips").hide();
			$("#updataLoadingTip").hide();
			$("#querrXcsErrorTip").hide();
			$('#NotOpenTipsPage').hide();
			return true;
		}
		else if(nStatus > 4 && nStatus < 10)
		{
			SendLogToServer('DT_CX_XCS', '-1', '小财神更新失败', 'd_xcs_st=' + nStatus);
			$('#NotOpenTipsPage').show();
			$('#openXcsFail').css('z-index', 190).show();
			return false;
		}
}
/*********************************************************************
 * creator      : @zhengtuo
 * date         : 2020-04-29
 * function     : 时间选择事件触发
 * parameter    : strDateId 时间控件id
 * return       : 
 *********************************************************************/
function OnTriggerEventByDateSection(strDateId) //nosonar
{
	//g_flg = false;
	$('.dateSelect').hide();//隐藏时间选择按钮
	clearInterval(g_timerId);//清空查行情的定时器
	g_eleChart.clear(); //清空曲线绘图
	fnCleanSyTable();//清空盈亏和收益率值
	$('#' + strDateId).addClass('select');//设置属性，选中当前元素
	$('#' + strDateId).siblings().removeClass('select');//移除当前元素外其他的兄弟元素的选中
	fnRefreshDrZJQX();//这个操作的目的是为了每次切换标签的时候，页面显示的数据都是最新的
	if(strDateId == 'today') //分时数据
	{
		$('#MonthProfitName').text("当日盈亏:");//将区间盈亏设置成当日盈亏
	}
	else if(strDateId == 'customize') //自定义数据
	{
		$('#MonthProfitName').text("区间盈亏:");
		OnTimerChangeControl();//触发时间控件选择时间，目的：防止点击自定义时，确认按钮状态不正确
		//显示时间选择按钮
		$('.dateSelect').show();
		
		OnCustomizeQueryZjqx();//查询自己曲线自定义数据
	}
	else if(strDateId == 'all_day') //查全部
	{
		$('#MonthProfitName').text("全部盈亏:");
		if(!g_jsonUserInfo['begin_time']) //nosonar
		{
			QueryCxsUserInfoDataFromXcs();
		}
		else
		{
			var jsonParam = {};
			jsonParam['startDate'] = g_jsonUserInfo['begin_time']; //nosonar
			jsonParam['endDate'] = fn_getMonthsDate(0);
			jsonParam['dateSection'] = GetCurDateSection();
			if(g_jsonIndexFromXcs[strDateId] && g_jsonIndexFromXcs[strDateId]['szzs'].length > 0)//判断数据是否存在，存在认为存在缓存数据，直接画图
			{
				setProfitAsset();//设置收益
				showProfitTab();//设置收益率，上证，深圳，科创版收益率
				setTimeout("drawAssetCurvePage()",50);
			}
			else
			{
				fnQueryIndexDataFromXcs(jsonParam);//向小财神查询指数数据
			}
		}

	}
	else
	{
		var nowDate = fn_getMonthsDate(0);
		var jsonParam = {};
		jsonParam['endDate'] = nowDate;
		jsonParam['dateSection'] = strDateId;
		if(strDateId == 'this_month'){
			$('#MonthProfitName').text("本月盈亏:");
			jsonParam['startDate'] = nowDate.substring(0, 6) + '01';
		}else if(strDateId == 'three_month'){
			$('#MonthProfitName').text("近三月盈亏:");
			jsonParam['startDate'] = fn_getMonthsDate(2).substring(0, 6)+'01';
		}else if(strDateId == 'this_year'){
			if (fnJudgeNewYear())
			{
				$('#MonthProfitName').text("今年盈亏:");
				jsonParam['startDate'] = nowDate.substring(0, 4) + '0101';
			}
			else
			{	
				var lunarYear = parseInt(nowDate.substring(0, 4), 10) -1;
				var yearYKText = lunarYear+"年盈亏:";
				$('#MonthProfitName').text(yearYKText);
				jsonParam['startDate'] = lunarYear + "0101";
				jsonParam['endDate'] = lunarYear + "1231";
			}
		}
		if(g_jsonIndexFromXcs[strDateId] && g_jsonIndexFromXcs[strDateId]['szzs'].length > 0)
		{
			setProfitAsset();
			showProfitTab();
			
			setTimeout("drawAssetCurvePage()",50);
		}
		else
		{
			
			fnQueryIndexDataFromXcs(jsonParam);
		}
	}
	
}
/*********************************************************************
 * creator      : @zhengtuo
 * date         : 2020-04-29
 * function     : 向客户端查询当日指数数据
 * parameter    : 
 * return       : 
 *********************************************************************/
function fnRefreshDrZJQX()
{
	// var testTime8 = GetCurtime();
	// fnFunction("test_json","向客户端查询当日指数数据:fnRefreshDrZJQX：时间："+testTime8);
	//fnFunction("test_json","fnRefreshDrZJQX");
	var strRule = '';
	if(g_bFirstQuerydrZjqx)
	{
		var ruleObj = {};
		ruleObj['bank2broker'] = '银行转证券|银行转证|银行转存|';
		ruleObj['broker2bank'] = '证券转银行|证券转银|银行转取|';
		ruleObj['banktransfer'] = '';
		ruleObj['banktime'] = '25|2140|340|2140|13|2140|100|2140|51|2140|41|2140|110|2140|552|2140|29|2140';
		ruleObj['bankasset'] = '';
		
		strRule = 'rule=' + window.JSON2.stringify(ruleObj) + ';';
		g_bFirstQuerydrZjqx = false;
	}	
		
	var stockCodeList = '';
	var stockCodeMarket = '';
	for(var i = 0; i < g_arrStockList.length; i++)
	{
		stockCodeList += g_arrStockList[i]['stockCode'] + '|';
		stockCodeMarket += g_arrStockList[i]['market'] + '|';
	}
	var strParam = 'user=' + g_jsonUserInfo['userkey'] + ';codelist=399006|1a0001|399001|1b0016|399300|1b0905|' + stockCodeList + ';marketlist=深圳A股|上海A股|深圳A股|上海A股|深圳A股|上海A股|' + stockCodeMarket + ';' + strRule; //nosonar
	
	
	var strDateSection = GetCurDateSection();//获取当前时间选项
	if(strDateSection != "today" && g_getFirstDr == false)
	{
		return;
	}
	
	var strRet = fnFunction('ask_hq_minute_data', strParam); //nosonar
	write_html_log("hqdata is ::" + strRet);
	if(strRet == "{}")
	{
			return;	
	}
	if(strRet.length > 0)
	{
		ParseHqDataToLocal(strRet);
		clearInterval(g_timerId);
		strDateSection = GetCurDateSection();//获取当前时间选项
		if(strDateSection == 'today')
		{
			g_timerId = setInterval("fnRefreshDrZJQX()",30000);
		}	
	}
	else if(!g_bFirstGetDrDataFromExe)
	{
		if(strRet == "")
		{
			g_hqDataErrorTimer = setTimeout(HQDataFailed,1000);
		}
		else
		{
			HQDataFailed();
		}
	}
	
}
/*********************************************************************
 * creator      : @zhengtuo
 * date         : 2020-04-29
 * function     : 解析当日的指数数据
 * parameter    : strRet 客户端返回的指数数据
 * return       : 
 *********************************************************************/
function ParseHqDataToLocal(strRet)
{
	g_getFirstDr = false;
	var sh = "1A0001";
	var sz = "399001";
	var gem = "399006";
	var zz50 = "1B0016";
	var hs300 = "399300";
	var zz500 = "1B0905";
	g_jsonIndexFromXcs['today'] = {};
	g_jsonIndexFromXcs['today']['szzs'] = [];
	g_jsonIndexFromXcs['today']['szzs2'] = [];
	g_jsonIndexFromXcs['today']['cybzs'] = [];
	g_jsonIndexFromXcs['today']['userProfit'] = [];
	
	var strPreSh = '';
	var strPreSz = '';
	var strPreGem = '';
	
	var bLostSh = false;
	var bLostSz = false;
	var bLostGem = false;
	var bLostHold = false;

	var strToObj = new Function('return' + strRet)();
	
	var tmpData;
	
	strPreSh = strToObj.extra['1A0001_pre'];
	strPreSz = strToObj.extra['399001_pre'];
	strPreGem = strToObj.extra['399006_pre'];
	g_fAssetPre = strToObj.extra['assetpre'];
	var nStartKey = 570;
	
	var shObj = strToObj[sh];
	if(shObj)
	{
		for(var key in shObj)
		{
			if(nStartKey != parseInt(key))
			{
				bLostSh = true;
			}
			
			if(nStartKey == 690)
			{
				nStartKey = 780;
			}
			else
			{
				nStartKey ++;
			}
		
			var fBasePrice = strPreSh ? strPreSh : shObj['570'];
			fBasePrice = parseFloat(fBasePrice).toFixed(2);
			
			tmpData = (parseFloat(shObj[key]) - fBasePrice) / fBasePrice;
			g_jsonIndexFromXcs['today']['szzs'].push((tmpData * 100).toFixed(2));
		}
	}

	nStartKey = 570;
	
	var szObj = strToObj[sz];
	if(szObj)
	{
		for(var key in szObj)
		{
			if(nStartKey != parseInt(key))
			{
				bLostSz = true;
			}
			
			if(nStartKey == 690)
			{
				nStartKey = 780;
			}
			else
			{
				nStartKey ++;
			}
		
			var fBasePrice = strPreSz ? strPreSz : szObj['570'];
			fBasePrice = parseFloat(fBasePrice).toFixed(2);
		
			tmpData = (parseFloat(szObj[key]) - fBasePrice) / fBasePrice;
			g_jsonIndexFromXcs['today']['szzs2'].push((tmpData * 100).toFixed(2));
		}
	}
	nStartKey = 570;
	
	var gemObj = strToObj[gem];
	if(gemObj)
	{
		for(var key in gemObj)
		{
			if(nStartKey != parseInt(key))
			{
				bLostGem = true;
			}
			
			if(nStartKey == 690)
			{
				nStartKey = 780;
			}
			else
			{
				nStartKey ++;
			}
			var fBasePrice = strPreGem ? strPreGem : gemObj['570'];
			fBasePrice = parseFloat(fBasePrice).toFixed(2);
			
			tmpData = (parseFloat(gemObj[key]) - fBasePrice) / fBasePrice;
			g_jsonIndexFromXcs['today']['cybzs'].push((tmpData * 100).toFixed(2));
		}
	}
	nStartKey = 570;
	
	if(strToObj.holdings)
	{
		for(var key in strToObj.holdings)
		{
			if(nStartKey != parseInt(key))
			{
				bLostHold = true;
			}
			
			if(nStartKey == 690)
			{
				nStartKey = 780;
			}
			else
			{
				nStartKey ++;
			}
			g_jsonIndexFromXcs['today']['userProfit'].push(parseFloat(strToObj.holdings[key]).toFixed(2));	
		}
	}
	if(g_bSendLostPoint == 1)
	{
		if(bLostSh)
		{
			SendLogToServer('DT_CX_MINDATA', '-1', '当日上证指数曲线点不连续', '');
		}
		
		if(bLostSz)
		{
			SendLogToServer('DT_CX_MINDATA', '-1', '当日深证指数曲线点不连续', '');
		}
		
		if(bLostGem)
		{
			SendLogToServer('DT_CX_MINDATA', '-1', '当日创业板指曲线点不连续', '');
		}
		
		if(bLostHold)
		{
			SendLogToServer('DT_CX_MINDATA', '-1', '当日资金曲线点不连续', '');
		}
		
		if(bLostSh || bLostSz || bLostGem || bLostHold)
		{
			var strCBS = '||d_hqdt=' + ReplaceHqData(g_strMinData);
			
			SendLogToServer('DT_CX_MINDATA', '-1', '曲线点不连续,上传行情原始数据', strCBS);
			g_bSendLostPoint = 0;
		}
	}
	setProfitAsset();
	showProfitTab();
	setTimeout("drawAssetCurvePage()",50);
}
/*********************************************************************
 * creator      : @zhengtuo
 * date         : 2020-04-29
 * function     : 设置收益率，上证，深圳，创业板数据
 * parameter    : 
 * return       : 
 *********************************************************************/
 //设置收益率
function showProfitTab()
{	
	// fnFunction("test_json","showProfitTab");
	// var testTime11 = GetCurtime();
	// fnFunction("test_json","设置收益率:showProfitTab：时间："+testTime11);
	var strDateSection = GetCurDateSection();
	var nShIndex, nSzIndex, nGemIndex, nProfitRate;
	if(g_jsonIndexFromXcs[strDateSection] == undefined || g_jsonIndexFromXcs[strDateSection]['szzs'].length <= 0)
	{
		return false;
	}
	//分时数据和其他按区间查的数据不一样，做特殊处理，后面有时间可以合并起来
	if(strDateSection == 'today')
	{
		nShIndex = g_jsonIndexFromXcs[strDateSection]['szzs'][g_jsonIndexFromXcs[strDateSection]['szzs'].length - 1];
		nSzIndex = g_jsonIndexFromXcs[strDateSection]['szzs2'][g_jsonIndexFromXcs[strDateSection]['szzs2'].length - 1];
		nGemIndex = g_jsonIndexFromXcs[strDateSection]['cybzs'][g_jsonIndexFromXcs[strDateSection]['cybzs'].length - 1];
		var curProfitRate;
		if(g_fAssetPre == 0)
		{
			curProfitRate = 0;
		}
		else
		{
			curProfitRate = parseFloat(g_ftodayProfit)/ parseFloat(g_fAssetPre);
		}
		g_jsonIndexFromXcs[strDateSection]['userProfit'][g_jsonIndexFromXcs[strDateSection]['userProfit'].length - 1] = (curProfitRate*100).toFixed(2);//更新当前收益率
		nProfitRate = g_jsonIndexFromXcs[strDateSection]['userProfit'][g_jsonIndexFromXcs[strDateSection]['userProfit'].length - 1];
	}
	else
	{
		if(!(g_jsonIndexFromXcs[strDateSection] && g_jsonIndexFromXcs[strDateSection]['szzs'].length > 0))//判断数据是否存在，存在认为存在缓存数据，直接画图
		{
			return;
		}
		if(strDateSection == 'customize')
		{
			var nowDate = fn_getMonthsDate(0);
			if(nowDate==g_strcustomizeEndDate && (g_jsonIndexFromXcs["today"] && g_jsonIndexFromXcs["today"]["szzs"].length > 0))
			{
				HistoryoftodayProfit(strDateSection);
			}			
		}
		else
		{
			if(g_useOldYear == 1 && strDateSection == "this_year" )
			{
			}
			else
			{
				if(g_jsonIndexFromXcs["today"] && g_jsonIndexFromXcs["today"]["szzs"].length > 0)
				{
					HistoryoftodayProfit(strDateSection);
				}
			}
		}
		nShIndex = g_jsonIndexFromXcs[strDateSection]['szzs'][g_jsonIndexFromXcs[strDateSection]['szzs'].length - 1][1];
		nSzIndex = g_jsonIndexFromXcs[strDateSection]['szzs2'][g_jsonIndexFromXcs[strDateSection]['szzs2'].length - 1][1];
		nGemIndex = g_jsonIndexFromXcs[strDateSection]['cybzs'][g_jsonIndexFromXcs[strDateSection]['cybzs'].length - 1][1];
		nProfitRate = g_jsonIndexFromXcs[strDateSection]['userProfit'][g_jsonIndexFromXcs[strDateSection]['userProfit'].length - 1][1];

		//-----------------------------------------版本判断支持------------------------------------------------------------------------------------------
	}

	$('#sh_index').text(fnCheckSyl(nShIndex));//上海收益
	$('#sz_index').text(fnCheckSyl(nSzIndex));//深圳收益
	$('#gem_index').text(fnCheckSyl(nGemIndex));//创业板收益
	$('#profitRate').text(fnCheckSyl(nProfitRate));//收益率
	
	fnJudgeProfitRate(parseFloat(nShIndex).toFixed(2),parseFloat(nSzIndex).toFixed(2),parseFloat(nGemIndex).toFixed(2),parseFloat(nProfitRate).toFixed(2));
	
	setRateElementColor();
}
//历史收益率
function HistoryoftodayProfit(strDateSection)
{
		//--------------------------------------------------累计收益率和当日收益率------------------------------------------------------------------------------------------------------------------------
	var nyesterday_ProfitRate = g_jsonIndexFromXcs[strDateSection]['userProfit'][g_jsonIndexFromXcs[strDateSection]['userProfit'].length - 2][1];
	var yesterday_Zzc = g_jsonIndexFromXcs[strDateSection]['yestodayZzc'];//昨日总资产
	var curProfitRate;
	if(yesterday_Zzc == '0')
	{
		curProfitRate = 0;
	}
	else
	{
		curProfitRate = parseFloat(g_ftodayProfit)/ parseFloat(yesterday_Zzc);
	}
	var nsumProfitRate = (parseFloat(nyesterday_ProfitRate)/100+1)*(parseFloat(curProfitRate)+1)-1;
	nsumProfitRate = (parseFloat(nsumProfitRate)*100).toFixed(2);//累计收益率
	g_jsonIndexFromXcs[strDateSection]['userProfit'][g_jsonIndexFromXcs[strDateSection]['userProfit'].length - 1][1] = nsumProfitRate;//更新总盈亏收益率
	g_jsonIndexFromXcs[strDateSection]['userProfit'][g_jsonIndexFromXcs[strDateSection]['userProfit'].length - 1][2] = (curProfitRate*100).toFixed(2);//更新当前收益率

	//--------------------------------------------------指数收益率显示------------------------------------------------------------------------------------------------------------------------

	//-------------------------------------------------上证指数收益率---------------------------------------------------------------------
	var curshprofit = g_jsonIndexFromXcs['today']['szzs'][g_jsonIndexFromXcs['today']['szzs'].length - 1];
	var curszprofit = g_jsonIndexFromXcs['today']['szzs2'][g_jsonIndexFromXcs['today']['szzs2'].length - 1];
	var curgemprofit = g_jsonIndexFromXcs['today']['cybzs'][g_jsonIndexFromXcs['today']['cybzs'].length - 1];
	//---------------------------------------------------上证-------------------------------------------------------------------------------
	nyesterday_ProfitRate = g_jsonIndexFromXcs[strDateSection]['szzs'][g_jsonIndexFromXcs[strDateSection]['szzs'].length - 2][1];//昨日上证指数累加收益率
	nsumProfitRate = (parseFloat(nyesterday_ProfitRate)/100+1)*(1+parseFloat(curshprofit)/100)-1;
	nsumProfitRate = (parseFloat(nsumProfitRate)*100).toFixed(2);//累计收益率
	g_jsonIndexFromXcs[strDateSection]['szzs'][g_jsonIndexFromXcs[strDateSection]['szzs'].length - 1][1] = nsumProfitRate;//更新当日上证指数累计收益率
	g_jsonIndexFromXcs[strDateSection]['szzs'][g_jsonIndexFromXcs[strDateSection]['szzs'].length - 1][2] = (parseFloat(curshprofit)).toFixed(2);//更新当日上证指数收益率

	//----------------------------------------------------深证------------------------------------------------------------------------------
	nyesterday_ProfitRate = g_jsonIndexFromXcs[strDateSection]['szzs2'][g_jsonIndexFromXcs[strDateSection]['szzs2'].length - 2][1];
	nsumProfitRate = (parseFloat(nyesterday_ProfitRate)/100+1)*(1+parseFloat(curszprofit)/100)-1;
	nsumProfitRate = (parseFloat(nsumProfitRate)*100).toFixed(2);//累计收益率
	g_jsonIndexFromXcs[strDateSection]['szzs2'][g_jsonIndexFromXcs[strDateSection]['szzs2'].length - 1][1] = nsumProfitRate;//更新当日深证指数累计收益率
	g_jsonIndexFromXcs[strDateSection]['szzs2'][g_jsonIndexFromXcs[strDateSection]['szzs2'].length - 1][2] = (parseFloat(curszprofit)).toFixed(2);//更新当日深证指数收益率

	//----------------------------------------------------创业板----------------------------------------------------------------------------
	nyesterday_ProfitRate = g_jsonIndexFromXcs[strDateSection]['cybzs'][g_jsonIndexFromXcs[strDateSection]['cybzs'].length - 2][1];
	nsumProfitRate = (parseFloat(nyesterday_ProfitRate)/100+1)*(1+parseFloat(curgemprofit)/100)-1;
	nsumProfitRate = (nsumProfitRate*100).toFixed(2);//累计收益率
	g_jsonIndexFromXcs[strDateSection]['cybzs'][g_jsonIndexFromXcs[strDateSection]['cybzs'].length - 1][1] = nsumProfitRate;
	g_jsonIndexFromXcs[strDateSection]['cybzs'][g_jsonIndexFromXcs[strDateSection]['cybzs'].length - 1][2] = (parseFloat(curgemprofit)).toFixed(2);
	//--------------------------------------------------------------------------------------------------------------------------------------
}
/*********************************************************************
 * creator      : @zhengtuo
 * date         : 2020-04-29
 * function     : 设置元素的颜色
 * parameter    : 
 * return       : 
 *********************************************************************/
function setRateElementColor()
{
	$('.rate').each(function(){
		var value = parseFloat($(this).text());
		$(this).removeClass('rise').removeClass('fall');
		if(value > 0.00)
		{
			$(this).addClass('rise');
		}	
		else if(value < 0.00)
		{
			$(this).addClass('fall');
		}
	})
}
/*********************************************************************
 * creator      : @zhengtuo
 * date         : 2020-04-29
 * function     : 获取图表的x轴数值
 * parameter    : 
 * return       : 
 *********************************************************************/
function GetxAxisValue()
{
	var jsonParam = {}
	var strDateSection = GetCurDateSection();
	
	if(strDateSection == 'today')
	{
		jsonParam['xAxis'] = g_xAxisValue;
		jsonParam['interval'] = 0;
	}
	else
	{
		var startDate = g_jsonIndexFromXcs[strDateSection]['startDate'];
		var endDate = '';
		if(strDateSection == 'this_month')
		{
			endDate = GetMonthLastDay(g_jsonIndexFromXcs[strDateSection]['endDate']);
		}
		else
		{
			endDate = g_jsonIndexFromXcs[strDateSection]['endDate'];
		}
		
		
		jsonParam['xAxis'] = getDayAll(startDate, endDate);
		jsonParam['interval'] = jsonParam['xAxis'].length / 5;
	}
	
	
	return jsonParam;
}
//上传服务器日志
function SendLogToServer(param1,param2,param3,param4)
{
	var logParam = [];
	
	logParam.push(param1);
	logParam.push(param2);
	logParam.push(param3);
	logParam.push(param4);
	
	fn_requestlog(logParam, true);
}


function drawAssetCurvePage() //nosonar
{
	write_html_log("draw");
	clearTimeout(g_alertTimoutTimer);
	var strDateSection = GetCurDateSection();//获取当前时间选项
	var strIndexSection = GetCurIndexSection();//获取当前指数选项
	if(strIndexSection == '')
	{
		strIndexSection = 'szzs';
		$('#' + strIndexSection).addClass('select');//设置属性，选中当前元素
		$('#' + strIndexSection).siblings().removeClass('select');//移除当前元素外其他的兄弟元素的选中
	}
	if(strDateSection!='today')
	{
		if(!(g_jsonIndexFromXcs[strDateSection] && g_jsonIndexFromXcs[strDateSection]['szzs'].length > 0))//判断数据是否存在，存在认为存在缓存数据，直接画图
		{
			return;
		}
	}

		//每次触发点击事件都先要显示绘图板
	document.getElementById("Chart").style.visibility = 'visible';
	var arrIndexData = g_jsonIndexFromXcs[strDateSection][strIndexSection];//获取指数数据
	var arrUserIndexData = g_jsonIndexFromXcs[strDateSection]['userProfit'];//获取用户数据
	var fMaxStockData = 0.0, fMinStockData = 0.0;
	var jsonXAxis = GetxAxisValue();

	// fnFunction("test_json","时间标签2 = " + strDateSection);
	// fnFunction("test_json","指数标签2 = " + strIndexSection);

	if(arrUserIndexData.length > 0 && arrIndexData.length > 0)
	{
		g_eleChart.clear();
		g_eleChart.setOption({
			animation:false,
			//图表大小
			grid: {
				top: "10px",
				left: "21px"
			},
			//提示框工具
			tooltip : {
				//触发方式
				trigger: "axis",
				//触发类型
				axisPointer:{
					snap:true,
					type:"line",
					axis:'x'
				},
				
				formatter:function(params, ticket, callback)
				{
					if(typeof(params[1]) == 'undefined')
					{
						return ;
					}
					var strDateSection = GetCurDateSection();
					if(strDateSection != g_curDateSection || $.isEmptyObject(g_jsonIndexFromXcs[strDateSection]))
					{
						return '';
					}
					var day = '';
					if(strDateSection == 'today')
					{
						day = params[0].axisValue;
					}
					else
					{
						var isGreateYear = IsGreateYears(g_jsonIndexFromXcs[strDateSection]['startDate'], g_jsonIndexFromXcs[strDateSection]['endDate'], 1);
						
						var d = params[0].data[0];
						if (typeof(d) == 'undefined')
						{
							return '';
						}
						var show_day=new Array('星期一','星期二','星期三','星期四','星期五','星期六','星期日');
						var date = new Date;
						date.setFullYear(parseInt(d.substring(0,4), 10), parseInt(d.substring(4, 6), 10) - 1, parseInt(d.substring(6, 8), 10));
						
						day = d.substring(4,6) + '-' + d.substring(6,8) + '  ' + show_day[date.getDay() - 1];
						if(isGreateYear)
							day = d.substring(0, 4) + '-' + day;
					}
					
					
					var strRet = '<div>'+ day + '</div><table class="tooltip_table"><tr><th></th><th>当前收益率</th><th>' + (strDateSection == 'today' ? '金额' : '累计收益率') + '</th></tr><tr><td>' + g_jsonUserInfo['qsname'].substring(0, 2) + g_jsonUserInfo['gdxm'] + '</td>'; //nosonar
					if(strDateSection == 'today')
					{
						strRet += GetSection(params[0].data + '%');
						strRet += GetUserTotalValue(params[0].dataIndex);
						strRet += '</tr><tr><td>' + params[1].seriesName + '</td>';
						strRet += GetSection(params[1].data + '%');
						strRet += GetIndexSection(params[1].dataIndex) + '</tr></table>';

					}
					else
					{
						strRet += GetSection(params[0].data[2] + '%');//当前收益率
						strRet += GetSection(params[0].data[1] + '%');//累计收益率
						strRet += '</tr><tr><td>' + params[1].seriesName + '</td>';
						strRet += GetSection(params[1].data[2] + '%');
						strRet += GetSection(params[1].data[1] + '%'); + '</tr></table>';
					}
					return strRet;
					
				},
				// extraCssText:'color:black;background-color:white;border:1px solid black;font:12px  "Microsoft YaHei","WenQuanYi Micro Hei","sans-serif";font-weight:600;filter:none;filter:progid:DXImageTransform.Microsoft.gradient(startcolorstr=#05000000,endcolorstr=#05000000,enabled=true)'
				extraCssText:'color:black;background-color:white;border:1px solid black;font:12px  "Microsoft YaHei","WenQuanYi Micro Hei","sans-serif";font-weight:600;'
			},
			xAxis : {
				data : jsonXAxis['xAxis'],
				//分组
				axisLabel:{
					interval:0,
					formatter:function(value,index){
						var strDateSection = GetCurDateSection();
						var strVal = value.toString();
						if(strDateSection == 'today')
						{
							if(index == 0 || index == 60 || index == 120
								|| index == 181 || index ==241)
							{
								return value;
							}
						}
						else if(strDateSection == 'this_year')
						{
							if(strVal.search(/\d{6}01/i) == 0)
								return strVal.substring(4, 6) + '.' + strVal.substring(6, 8);
						}
						else
						{
							var nInterval = parseInt((jsonXAxis['xAxis'].length - 1) / 4);
							if(index == 1 
								|| index == (1 + nInterval) 
								|| index == (1 + 2 * nInterval) 
								|| index == (1 + 3 * nInterval) 
								|| index == ((1 + 4 * nInterval) == jsonXAxis['xAxis'].length ? jsonXAxis['xAxis'].length - 1 : (1 + 4 * nInterval)))
								{
									var isGreateYear = IsGreateYears(g_jsonIndexFromXcs[strDateSection]['startDate'], g_jsonIndexFromXcs[strDateSection]['endDate'], 1);
									if(isGreateYear)
									{
										value = strVal.substring(0, 4) + '.' + strVal.substring(4, 6);
									}
									else
									{
										value = strVal.substring(4, 6) + '.' + strVal.substring(6, 8);
									}
									return value;
								}
						}
						
					}
				},
				//刻度
				axisTick:{
					length: 20,
					show: false
				},
				//标线
				axisLine:{
					show: false
				}
			},
			yAxis :{
					minInterval : 0.1,
					type:"value",
					splitLine:{
						lineStyle:{
							type: 'dashed',
							color: '#cccccc'
						}
					},
					axisLine:{
						show: false
					},
					axisTick:{
						show: false
					},
					//位置
					position: 'right',
					splitNumber: 5,
					axisLabel : {
						formatter:function(value, index)
						{
							return parseFloat(value).toFixed(1) + '%';
						}
					}
			},
			//数据
			series : [{
				data : arrUserIndexData,
				type: 'line',
				itemStyle:{
					normal:{
						lineStyle:{
							width:1,
							color:'#ff0000'
						}
					}
				},
				showSymbol: false,
				yAxisIndex: 0
			},
			{
				name : g_IndexNameToCN[strIndexSection],
				type: 'line',
				data : arrIndexData,
				itemStyle:{
					normal:{
						lineStyle:{
							width:1,
							color:'#0079da'
						}
					}
				},
				showSymbol: false,
				yAxisIndex: 0
			}]
		});
	}
	g_curDateSection = GetCurDateSection();
	g_curIndexSection = GetCurIndexSection();//获取当前指数选项
}

// 设置当日横坐标时间点
function initTimeXAxis()
{
	var nHour = 9;
	var nMin = 30;
	var nCount = 121;
	
	g_xAxisValue.splice(0, g_xAxisValue.length);
	
	setTimeXAxis(nHour, nMin, nCount);
	
	nHour = 13;
	nMin = 0;
	nCount = 122;
	
	setTimeXAxis(nHour, nMin, nCount);
}

// 设置时间段内的时间点
function setTimeXAxis(nHour, nMin, nCount)
{
	var strTime;
	var date = new Date();
	
	date.setHours(nHour);
	date.setMinutes(nMin);
	
	while(nCount--)
	{
		nHour = date.getHours();
		nHour = parseInt(nHour);
		
		if(nHour >= 1 && nHour <=9)
		{
			nHour = '0' + nHour;
		}
		
		nMin = date.getMinutes();
		date.setMinutes(nMin + 1);
		
		nMin = parseInt(nMin);
		
		if(nMin >= 0 && nMin <=9)
		{
			nMin = '0' + nMin;
		}
		
		strTime = nHour + ':' + nMin;
		g_xAxisValue.push(strTime);
	}
}

/*********************************************************************
 * creator      : @zhengtuo
 * date         : 2020-04-29
 * function     : 处理请求返回数据
 * parameter    : 
 * return       : 
 *********************************************************************/
function DealQueryBackData(strCmd, obj)
{
	// 请求返回的数据解析，解析完毕后刷新数据
	switch(strCmd)
	{
		//持仓请求
		case '1537':
			g_queryCCCallback = true;
		case '1547':
			RefreshPositionData(obj);
			break;
		//自运营请求
		case '2318':
			RefreshDataFromZyy(obj);
			break;
		case 'newdryk':
			Dealdryk(obj);
			break;
		default:
			break;
	}

}
//兼容新版的当日盈亏
function Dealdryk(obj)
{
	var struserkey = g_jsonUserInfo["userkey"] + '_0'; //nosonar
	if(!obj[struserkey] || !obj[struserkey].dryk)
		return;
	g_ftodayProfit = parseFloat(obj[struserkey].dryk);
	g_bNewDryk = true;
	setProfitAsset();
	showProfitTab();
	if(g_arrStockList.length > 0 && !g_bClicked)
	{
		g_bClicked = true;
		OntriggerByStatus(g_status);
	}
}
/*********************************************************************
 * creator      : @zhengtuo
 * date         : 2020-04-29
 * function     : 解析持仓数据
 * parameter    : obj请求返回数据
 * return       : 
 *********************************************************************/
function RefreshPositionData(obj)
{
	//fnFunction("test_json","持仓表 = " + window.JSON2.stringify(obj));
	// fnFunction("test_json","持仓表推送");
	//埋点
	g_ccendtime = (new Date()).valueOf();
	var costtime;
	if(g_ccbegintime == 0)
	{
		costtime = 0;
	}
	else
	{
		costtime = g_ccendtime - g_ccbegintime;
	}
	//如果没有数据返回的话直接返回，不做后续的处理
	if(!obj||!obj.reply)
	{

		return;
	}
	if(obj.reply.ret_code)
	{
		if(obj.reply.ret_code != '0')
		{
			var strMsg = '';
			if(obj.reply.ret_msg)
			{
				strMsg = obj.reply.ret_msg;
			}

			SendLogToServer('DT_CX_CC', '-1', strMsg, '');
			return;
		}
	}
	write_html_log("!obj.reply.table"+!obj.reply.table);
	if(!obj.reply.table)//空表
	{
		g_ftodayProfit = 0.00;//空持仓的时候当日收益就是零
		if(!obj.local.myuserkey)
		{
		}
		else
		{
			if(g_bClicked == false)
			{
				g_bClicked = true;
				OntriggerByStatus(g_status);
				//埋点
				var strDateSection = GetCurDateSection();//获取当前时间选项
				var strIndexSection = GetCurIndexSection();//获取当前指数选项
				strDateSection = TranslateTimeTab(strDateSection);
				strIndexSection = TranslateIndex(strIndexSection);
				SendCBASEx(strDateSection+'.'+strIndexSection+'.query_cc.costtime.'+costtime+'ms');
			}

		}
		return;
	}
	var arrStockListTemp = new Array();
	//请求失败判断
	var arrStockList = obj.reply.table.body;
	if(arrStockList && arrStockList.length >= 100)
	{	
		if(!obj.local.myuserkey || g_bClicked == true)
		{
		}
		else
		{
			g_bClicked = true;
			g_bLarg100 = true;
			clearTimeout(g_alertTimoutTimer);
			HandleLage100();
		}
		return;
	}
	for(var i = 0; i < arrStockList.length; i++)
	{
		var jsonParam = {};
		jsonParam['stockCode']  = arrStockList[i].xd_2102;
		if(arrStockList[i].xd_2108)
		{
			jsonParam['market'] = arrStockList[i].xd_2108;
		}
		else
		{
			jsonParam['market'] = arrStockList[i].xd_2171;
		}
		arrStockListTemp.push(jsonParam);
	}
	g_arrStockList = arrStockListTemp;
	write_html_log("obj.reply.table.extra.allDryk:" + obj.reply.table.extra.allDryk +":g_bNewDryk" + g_bNewDryk);
	if(obj.reply.table.extra.allDryk || g_bNewDryk == true)//有持仓的情况下，实时更新当日盈亏
	{
		if(obj.reply.table.extra.allDryk)
		{
			g_ftodayProfit = parseFloat(obj.reply.table.extra.allDryk);
		}
		write_html_log("obj.local.myuserkey" + obj.local.myuserkey +":g_bClicked" + g_bClicked);
		if(!obj.local.myuserkey || g_bClicked == true)
		{
		}
		else
		{
			if(g_arrStockList.length > 0 && !g_bClicked)
			{
				g_bClicked = true;
				
				OntriggerByStatus(g_status);
			}
			//埋点
			var strDateSection = GetCurDateSection();//获取当前时间选项
			var strIndexSection = GetCurIndexSection();//获取当前指数选项
			strDateSection = TranslateTimeTab(strDateSection);
			strIndexSection = TranslateIndex(strIndexSection);
			SendCBASEx(strDateSection+'.'+strIndexSection+'.query_cc.costtime.'+costtime+'ms');
		}
	}	
}
function RefreshDataFromZyy(obj)
{
	
	if(!obj.reply)
	{
		return '';
	}
	var strCmd = obj.reply.cmd;
	if(strCmd == "query_Index")
	{
		write_html_log("有查指数请求应答 清空查指数定时器");
		clearTimeout(g_queryIndexTimer);
		g_xcsendtime = (new Date()).valueOf();
		var costtime = g_xcsendtime - g_xcsbegintime;
		var strDateSection = GetCurDateSection();//获取当前时间选项
		var strIndexSection = GetCurIndexSection();//获取当前指数选项
		strDateSection = TranslateTimeTab(strDateSection);
		strIndexSection = TranslateIndex(strIndexSection);
		SendCBASEx(strDateSection+'.'+strIndexSection+'.query_xcs.costtime.'+costtime+'ms');
		var ret = parseIndexFromZyy(obj);
		if(!ret)
		{
			SendLogToServer('DT_CX_XCS', '-1', '小财神数据获取失败', 'd_xcs_st=' + '');
			return '';
		}
			
		setProfitAsset();
		showProfitTab();
		setTimeout("drawAssetCurvePage()",50);
		
		
	}
	else if(strCmd == "query_asset")
	{
		parseAssetFromZyy(obj)
	}
	else if(strCmd == "query_xcsUserInfo")
	{
		g_xcsinfoendtime = (new Date()).valueOf();
		var costtime = g_xcsinfoendtime - g_xcsinfobegintime;
		var strDateSection = GetCurDateSection();//获取当前时间选项
		var strIndexSection = GetCurIndexSection();//获取当前指数选项
		strDateSection = TranslateTimeTab(strDateSection);
		strIndexSection = TranslateIndex(strIndexSection);
		SendCBASEx(strDateSection+'.'+strIndexSection+'.query_xcsUserInfo.costtime.'+costtime+'ms');
		OnQueryXcsUserInfoCB(obj)
	}
}
/*********************************************************************
 * creator      : @zhengtuo
 * date         : 2020-04-29
 * function     : 用户小财神起始时间数据
 * parameter    : 
 * return       : 
 *********************************************************************/
function OnQueryXcsUserInfoCB(obj)
{	
	var strRetData = obj.reply.data;
	var jsonRetData = window.JSON2.parse(strRetData);
	g_jsonUserInfo['begin_time'] = jsonRetData['ex_data']['data'][0]['begin_time']; //nosonar
	var jsonParam = {};
	jsonParam['startDate'] = g_jsonUserInfo['begin_time']; //nosonar
	jsonParam['endDate'] = fn_getMonthsDate(0);
	jsonParam['dateSection'] = GetCurDateSection();
	fnQueryIndexDataFromXcs(jsonParam);//向小财神查询指数数据


}
/*********************************************************************
 * creator      : @zhengtuo
 * date         : 2020-04-29
 * function     : 获取当前选中的时间选项
 * parameter    : 
 * return       : 
 *********************************************************************/
function GetCurDateSection()
{
	var strId = '';
	$('.profitContentDataTab li').each(function(){
		if($(this).hasClass('select'))
		{
			strId = this.id;
		}
	})
	return strId;
}
/*********************************************************************
 * creator      : @zhengtuo
 * date         : 2020-04-29
 * function     : 获取当前的指数选项
 * parameter    : 
 * return       : 
 *********************************************************************/
function GetCurIndexSection()
{
	var strId = '';
	$('.profitContentIndexTab li').each(function(){
		if($(this).hasClass('select'))
		{
			strId = this.id;
		}		
	})
	return strId;
}
function parseIndexFromZyy(obj)
{
	if(obj.reply.ret_code != '0')
	{
		fnQueryIndexError("backError");
		return false;
	}
	var strSection = obj.local.type;
	g_jsonIndexFromXcs[strSection] = {};
	g_jsonIndexFromXcs[strSection]['sz50'] = [];//上证50
	g_jsonIndexFromXcs[strSection]['szzs2'] = [];//深证
	g_jsonIndexFromXcs[strSection]['hs300'] = [];//沪深300
	g_jsonIndexFromXcs[strSection]['zz500'] = [];//中正500
	g_jsonIndexFromXcs[strSection]['cybzs'] = [];//创业板指数
	g_jsonIndexFromXcs[strSection]['szzs'] = [];//上证
	g_jsonIndexFromXcs[strSection]['userProfit'] = [];//用户收益
	g_jsonIndexFromXcs[strSection]['zyk'] = [];//总盈亏
	g_jsonIndexFromXcs[strSection]['curyk'] = [];//小财神返回的今日盈亏
	g_jsonIndexFromXcs[strSection]['yestodayZzc'] = [];//昨日总资产
	var strRetData = obj.reply.data;
	if(strRetData == '')
	{
		fnQueryIndexError("backError");
		return false;
	}
	var jsonRetData = window.JSON2.parse(obj.reply.data);
	if(jsonRetData['error_code'] != '0')
	{
		fnQueryIndexError("backError");
		return false;
	}
	if(jsonRetData.ex_data.zczs==''||jsonRetData.ex_data.zczs.length == 1)
	{
		$('#MonthProfitData').text('');
		$('#profitRate').text('');
		$('#sh_index').text('');
		$('#sz_index').text('');
		$('#gem_index').text('');
		g_eleChart.clear();
		$('#selectDateDetermin').addClass('selectDateDeterminOff').removeClass('selectDateDeterminOn');
		$('#dateSelectTips').show();
		$('#dateSelectTips').text('您查询的时间段内无历史数据');
		return false;
	}
	var szzsObj = jsonRetData.ex_data.szzs;

	var nStartTime = obj.local.startDate;
	var dataObj = [];
	
	var jsonUserData = jsonRetData.ex_data.zczs;
	
	//先判断日期是否是大于设置的起始天数
	for(var i = 0; i < szzsObj.length; i++)
	{
		var nTime = parseInt(szzsObj[i].time);
		
			dataObj.push(szzsObj[i]);
	}

	if(dataObj.length <= 0)
	{
		return false;
	}
	g_jsonIndexFromXcs[strSection]['zyk'] = jsonRetData.ex_data.zyk;
	g_jsonIndexFromXcs[strSection]['startDate'] = dataObj[0].time;
	g_jsonIndexFromXcs[strSection]['endDate'] = obj.local.endDate;
	g_jsonIndexFromXcs[strSection]['curyk'] = jsonUserData[jsonUserData.length-1].yk;
	g_jsonIndexFromXcs[strSection]['yestodayZzc'] = jsonUserData[jsonUserData.length-2].zzc;//昨日总资产
	for(var i = 0; i < dataObj.length; i++)
	{
		var tmpData = 0.0;
		var date = dataObj[i].time
		for(var indexType in dataObj[i])
		{
			if(indexType != 'time')
			{
				var tmpArr = [];
				tmpData = (parseFloat(dataObj[i][indexType]) - parseFloat(dataObj[0][indexType])) / parseFloat(dataObj[0][indexType]);
				tmpArr[0] = date;//日期
				tmpArr[1] = (tmpData * 100).toFixed(2);//累计收益率
				if(i > 0)
				{
					tmpData = (parseFloat(dataObj[i][indexType]) - parseFloat(dataObj[i-1][indexType])) / parseFloat(dataObj[i-1][indexType]);
					tmpArr[2] = (tmpData * 100).toFixed(2);//当前收益率
				}
				else
				{
					tmpArr[2] = 0;
				}
				
				g_jsonIndexFromXcs[strSection][indexType].push(tmpArr);
			}
			
		}
		
	}
	for(var i = 0; i < jsonUserData.length; i++)
	{
		var tmpData = 0;
		var tmpArr = [];
		var date = jsonUserData[i]['time'];
		tmpArr[0] = date;//日期
		tmpData = (parseFloat(jsonUserData[i].zczs) - parseFloat(jsonUserData[0].zczs)) / parseFloat(jsonUserData[0].zczs);
		tmpArr[1] = (tmpData * 100).toFixed(2);//累计收益率
		if(i > 0)
		{
			tmpData = (parseFloat(jsonUserData[i].zczs) - parseFloat(jsonUserData[i-1].zczs)) / parseFloat(jsonUserData[i-1].zczs);
			tmpArr[2] = (tmpData * 100).toFixed(2);//当前收益率
		}
		else
		{
			tmpArr[2] = 0;
		}
		
		g_jsonIndexFromXcs[strSection]['userProfit'].push(tmpArr);
	}
	
	if(g_jsonIndexFromXcs[strSection]['userProfit'].length == 0)
	{
		g_jsonIndexFromXcs[strSection]['userProfit'].push(["0",0, 0]);
	}
	return true;
}
//设置盈亏
function setProfitAsset()
{
	var strCurDateSection = GetCurDateSection();
	var yk = g_ftodayProfit;
	g_fxuanfu = g_ftodayProfit;
	if(strCurDateSection!='today')
	{
		if(!(g_jsonIndexFromXcs[strCurDateSection] && g_jsonIndexFromXcs[strCurDateSection]['szzs'].length > 0))//判断数据是否存在，存在认为存在缓存数据，直接画图
		{
			return;
		}
		if(strCurDateSection == 'customize')
		{
			var nowDate = fn_getMonthsDate(0);
			if(nowDate==g_strcustomizeEndDate)
			{
				yk =parseFloat(g_jsonIndexFromXcs[strCurDateSection]['zyk']) - parseFloat(g_jsonIndexFromXcs[strCurDateSection]['curyk']) ;//昨日总盈亏
				if(g_ftodayProfit !='')
					yk+=parseFloat(g_ftodayProfit);
			}
			else
			{
				yk =parseFloat(g_jsonIndexFromXcs[strCurDateSection]['zyk']);
			}

		}
		else
		{
			if(g_useOldYear == 1 && strCurDateSection == "this_year")
			{
				yk =parseFloat(g_jsonIndexFromXcs[strCurDateSection]['zyk']);
			}
			else
			{
				yk =parseFloat(g_jsonIndexFromXcs[strCurDateSection]['zyk']) - parseFloat(g_jsonIndexFromXcs[strCurDateSection]['curyk']) ;//昨日总盈亏
				if(g_ftodayProfit !='')
				{
					yk+=parseFloat(g_ftodayProfit);
				}
			}
			
		}
	}
	yk = parseFloat(yk).toFixed(2);
	if(isNaN(yk))
	{
		yk = "--";
	}
	var nlength = yk.length;
	if(nlength>=4&&nlength<=10)//十万级别
	{
		document.getElementById("MonthProfitData").style.width = 115 + "px";
	}
	else if(nlength>10)//百万级别
	{
		document.getElementById("MonthProfitData").style.width = 150 + "px";
	}
	if(bLoadingTip == true)
	{
		bLoadingTip = false;
		//fnFunction("test_json","盈亏="+yk);
		HandleXcsStatus(g_status);
	}
	
	$('#MonthProfitData').attr('data', yk)
	if($('#MonthProfitData').text() == '******')
	{
		return '';
	}
	else
	{
		if(g_hideYK == 1)
		{
			$('#MonthProfitData').text('******');
		}
		else
		{
			$('#MonthProfitData').text(yk);//盈亏
			setRateElementColor();
		}
	}
	
}

function fnNotify(strCmd, strParam)
{
	if(document.readyState!=="complete")
	{
		return;
	}
	if(g_status == -3 || g_bLarg100 == true)//如果不支持资金曲线或者当前账号持仓数大于100，那么客户端的一切通知全不接受
	{
		if(g_bLarg100 == true)
		{
			HandleLage100();
		}
		return;
	}
	var strDes = ReplaceString(strParam);
	var obj = new Object();
	try
	{
		obj = new Function('return' + strDes)();
	}
	catch(err)
	{
	}
	if(strCmd == 'xcs')
	{

		if(obj.state)
		{
			var nStatus = parseInt(obj.state, 10);
			//fnFunction("test_json","小财神="+nStatus);

			if(nStatus == 4){
				write_html_log("客户端通知小财神数据准备完毕");
				clearPage(false);
				g_status = nStatus;
				if(!g_bFirstOpenPage && g_queryCCCallback)
				{
					OntriggerByStatus(g_status);
				}
			}
			if(HandleXcsStatus(nStatus))
			{
				var strDateId = $('.dateSelect').attr('data');
				if(strDateId)
				{
					$('.dateSelect').attr('data', '');
					OnTriggerEventByDateSection(strDateId);
				}
			}
		}
	}
	else if(strCmd == 'minData')
	{
		if(obj.src)
		{
			g_strMinData = obj.src;
		}
		if(obj.errno)
		{
			if(obj.errno == '0')
			{
					if(g_hqDataErrorTimer != "")
					{
						clearTimeout(g_hqDataErrorTimer);
						g_hqDataErrorTimer = "";
					}
					g_bFirstGetDrDataFromExe = false;
					fnRefreshDrZJQX();
			}
		}
	}
	else if(strCmd == 'visible'){}
	else if(strCmd == 'operator'){
		if(obj.type == "relogin" || obj.type == "exit")
		{
			clearPage(true);
			g_bFirstOpenPage = true;
		}
	}
	else
	{
		DealQueryBackData(strCmd, obj);//处理查询请求返回的数据
	}
	
}
function fnShowLoadingTips()
{
		$('#NotOpenTipsPageBg').css("background-color","white");
		$('#NotOpenTipsPage').show();
		$('#loadingxcs').css("z-index",200).show();
}

function fnAlertTimeoutTips()
{
	if(g_status < 1)
	{
		return;
	}
	write_html_log("首页绘图定时器触发");
	fnShowDataError();
	g_alertTimoutTimer = "";
}

function fnQueryIndexDataFromXcs(jsonParam) //查询小财神数据请求优化 添加超时逻辑
{
	if(g_queryIndexTimer != "") // 避免频繁点击带来的异常问题 每次请求都要去掉上一次的定时器
	{
		clearTimeout(g_queryIndexTimer);
	}
	QueryIndexDataFromXcs(jsonParam);
	write_html_log("设置查指数定时器");
	g_queryIndexTimer = setTimeout(fnQueryIndexError,3000);
	g_queryIndexCount = 0;
}

function fnQueryIndexError(msgType) //查询小财神数据请求超时 视为失败 
{
	var errorMsg = "";
	if(msgType == "backError")
	{
		errorMsg = "小财神应答报错";
		//记录错误日志
		//弹出请求失败提示
		fnShowDataError();
	}else if(g_queryIndexTimer != "")
	{
		errorMsg = "小财神请求超时";
		//记录超时日志
		var requestStatus = parseInt(fnFunction("is_disconnect",g_jsonUserInfo['userkey']), 10); //nosonar
		if(requestStatus != 0)
		{
			fnShowDataError();
		}
		else if(g_queryIndexCount < 3)
		{
			errorMsg = errorMsg + "连接状态为："+ requestStatus;
			g_queryIndexTimer = setTimeout(fnQueryIndexError,3000);
			g_queryIndexCount = g_queryIndexCount + 1;
		}
		else
		{
			fnShowDataError();
		}
		
	}
	//上传日志
	SendLogToServer("ZJQX", "-1" , errorMsg , "");
}

function fnJudgeProfitRate(shsyl,szsyl,cybsyl,totalsyl)
{
	var errorMsg = "";
	if(shsyl <= -95 || isNaN(shsyl))
	{
		errorMsg = errorMsg +"上海收益率异常：" + shsyl + ",";
	}
	if(szsyl <= -95 || isNaN(szsyl))
	{
		errorMsg = errorMsg +"深圳收益率异常：" + szsyl + ",";
	}
	if(cybsyl <= -95 || isNaN(cybsyl))
	{
		errorMsg = errorMsg +"创业板收益率异常：" + cybsyl + ",";
	}
	if(totalsyl <= -95 || isNaN(totalsyl))
	{
		errorMsg = errorMsg +"总收益率异常：" + totalsyl + ",";
	}
	//上传日志
	if(errorMsg != "" && g_errorTip < 1)
	{
		g_errorTip = g_errorTip + 1;
		SendLogToServer("ZJQX", "-1", errorMsg, "");
	}
}
function fnFeedbackOnClick()
{
	fnFunction("js_report",""); //nosonar
}
function clearPage(needClearStockList)
{
	//埋点-----
	g_ccbegintime = 0;
	g_ccendtime = 0;
	g_xcsbegintime = 0;
	g_xcsendtime = 0;
	g_xcsinfobegintime = 0;
	g_xcsinfoendtime = 0;
	g_beginstaytime = 0;
	g_endstaytime = 0;
	//埋点-----
	g_bLarg100 = false;
	g_jsonIndexFromXcs = new Object(); //清空小财神数据
	g_bFirstQuerydrZjqx = true;//是否第一次查询当日资金曲线
	g_bFirstGetDrDataFromExe = true;//是否第一次成功获取数据
	g_bClicked = false;
	g_strcustomizeEndDate = "";
	g_strMinData = '';
	g_bSendLostPoint = 1;
	g_bNewDryk = false;
	g_nCountQuery = 0;
	g_getFirstDr = true;
	

	$('#MonthProfitData').text('');
	$('#profitRate').text('');
	$('#sh_index').text('');
	$('#sz_index').text('');
	$('#gem_index').text('');
	$('#NotOpenTipsPage').hide();
	$('#pwdBtn img').attr('src', 'images/pwdShowBtn.png');
	$('.profitContentDataTab li').removeClass('select');
	$('.profitContentIndexTab li').removeClass('select');
	$('.dateSelect').hide();//隐藏时间选择按钮
	$("#updataLoadingTimeoutTip").hide();
	$("#reportTips").hide();
	$("#updataLoadingTip").hide();
	$("#querrXcsErrorTip").hide();
	document.getElementById("Chart").style.visibility = 'hidden';
	clearInterval(g_timerId);//清除定时器
	clearInterval(g_QueryHQtimerId);//清除定时器
	clearInterval(g_updataTimer);//清除更新小财神数据定时器
	
	if(needClearStockList)
	{
		g_arrStockList = new Array(); //清空用户持仓
		g_queryCCCallback = false;
	}
}

function fnStausTimeout()
{
	var errorMsg = "小财神数据未准备好"; //nosonar
	var requestStatus = parseInt(fnFunction("is_disconnect",g_jsonUserInfo['userkey']), 10); //nosonar
	if(requestStatus == 0 && g_nCountQuery < 3 )
	{
		errorMsg = errorMsg + "连接状态为："+ requestStatus + "耗时为：" + (g_nCountQuery + 1)*3;
		g_nCountQuery++;
	}
	else
	{
		errorMsg = errorMsg + "更新超时 连接状态为："+ requestStatus + "耗时为"+ (g_nCountQuery + 1)*3;
		clearInterval(g_updataTimer);
		fnShowStatusTimeout();
		write_html_log("小财神状态超时未更新，显示更新失败提示");
	}
	SendLogToServer("ZJQX", "-1" , errorMsg , "");
}

function fnShowDataError()
{
	$("#updataLoadingTimeoutTip").hide();
	$("#reportTips").hide();
	$("#updataLoadingTip").hide();
	$("#NewTips").show();
	$("#querrXcsErrorTip").show();
}
function fnShowStatusTimeout()
{
	$("#updataLoadingTip").hide();
	$("#updataLoadingTimeoutTip").show();
	$("#reportTips").show();
}

function fnCleanSyTable()
{
	$('#MonthProfitData').text("--");//盈亏
	$('#sh_index').text("--");//上海收益
	$('#sz_index').text("--");//深圳收益
	$('#gem_index').text("--");//创业板收益
	$('#profitRate').text("--");//收益率
}

function fnCheckSyl(syl)
{
	if(isNaN(parseFloat(syl).toFixed(2)))
	{
		return "--"
	}
	else
	{
		var yk = parseFloat(syl).toFixed(2) + "%";
		return yk;
	}
}

function fnJudgeNewYear()
{
	var nowDate = new Date();
	var isNewYear = true;
	var solarYear = nowDate.getFullYear();
	var solarMonth = nowDate.getMonth() + 1;
	var solarDay = nowDate.getDate();
	
	var lunarYear = calendar.solar2lunar(solarYear,solarMonth,solarDay);
	
	if(solarYear == lunarYear["lYear"])
	{
		isNewYear = true;
	}
	else
	{
		isNewYear = false;
	}
	
	return isNewYear;
	
}
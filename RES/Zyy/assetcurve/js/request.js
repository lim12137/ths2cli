/*******************************************************************
 * creator      : @jiguoqian
 * date         : 2017-06-05
 * function     : ??ͻ??˷??ajax??
 * parameter    : arr_std:??????
 *              : arr_ext:??չ???
 *              : arr_local:?????????
 * return       :  
 *****************************************************************/
function SendRequest(arr_std, arr_ext, arr_local)
{
	var parameter = "";
	var jsonStr1 = window.JSON2.stringify(arr_std);
	var jsonStr2 = window.JSON2.stringify(arr_ext);
	var jsonStr3 = window.JSON2.stringify(arr_local);
	parameter = '{"standard":'+ jsonStr1 +',"extra":'+ jsonStr2 +',"local":'+ jsonStr3 +'}';
	fnRequest("", parameter);
}
//上传elk
function fn_requestlog(arrLogParam, bSendWhenConExit)
{
	var arr_ext = {};
	var arr_std = {};
	var arr_local = {};
	if(!arguments[1])
	{
		bSendWhenConExit = false;
	}
	
	arr_std['reqtype'] 	 = "2318";			
	arr_std['setcode'] 	 = "";									
	arr_std['refresh'] 	 = "1";
	arr_std['cachedata'] 	 = "1";
	arr_std['userkey']   	 = g_jsonUserInfo['userkey'];
	
	if(bSendWhenConExit)
	{
		arr_std['sendwhenexitreq'] 	 = "1";
	}
	
	arr_ext['cmd'] = "cbas_ipo_log";	
	arr_ext['xd_local_notify_req'] = "1";
	
	arr_ext['logtype'] = "asset_log";
	arr_ext['zjzh'] = g_jsonUserInfo['zjzh'];
	arr_ext['encode'] = '1';
	
	arr_ext['module']	 = 'ZJQX';
	arr_ext['datatype']	 = arrLogParam[0];
	arr_ext['pkgver']	 = g_pkgVer;
	arr_ext['retcode']	 = arrLogParam[1];
	arr_ext['retmsg'] 	 = arrLogParam[2];
	arr_ext['cbasdata']  = fnFunction('encode_base64ex', arrLogParam[3]);
	arr_ext['qsid'] 	 = g_jsonUserInfo['qsid'];
	arr_ext['userkey']	 = g_jsonUserInfo['userkey'];
	arr_ext['ldatetime'] = get_cur_date() + clientTimeZone();
	arr_local['html_callback'] = 'fn_callback_ipolog';
	arr_local['destination']   = "1";
	SendRequest(arr_std,arr_ext,arr_local);
}

function get_cur_date() 
{
	var date = new Date();
	var seperator1 = "-";
	var seperator2 = ":";
	var month = date.getMonth() + 1;
	var strDate = date.getDate();
	if (month >= 1 && month <= 9) 
	{
		month = "0" + month;
	}
	if (strDate >= 0 && strDate <= 9) 
	{
		strDate = "0" + strDate;
	}

	var hh = date.getHours();
	var mm = date.getMinutes();
	var ss = date.getSeconds();
	if (hh >= 1 && hh <= 9) 
	{
		hh = "0" + hh;
	}
	if (mm >= 0 && mm <= 9) 
	{
		mm = "0" + mm;
	}

	if (ss >= 0 && ss <= 9)
	{
		ss = "0" + ss;
	}

	return date.getFullYear() + seperator1 + month + seperator1 + strDate + " " + hh + seperator2 + mm + seperator2 + ss;
}

function clientTimeZone() 
{
	var munites = new Date().getTimezoneOffset();
	var hour = parseInt(munites / 60);
	var munite = munites % 60;
	var prefix = "-";
	if (hour < 0 || munite < 0) 
	{
		prefix = "+";
		hour = -hour;
		if (munite < 0){ munite = -munite; }
	}
	hour = hour + "";
	munite = munite + "";
	if (hour.length == 1) { hour = "0" + hour; }
	if (munite.length == 1) { munite = "0" + munite; }
	return prefix + hour + munite;
}


// 从小财神查历史数据
function QueryIndexDataFromXcs(jsonParam)
{
	var arr_std = {};
	var arr_local = {};
	var arr_ext = {};
	write_html_log("query_Index");
	g_xcsbegintime = (new Date()).valueOf();
	arr_std['reqtype'] = "2318";
	arr_std['setcode'] = "";
	arr_std['refresh'] = "1";
	arr_std['cachedata'] = "0";
	arr_std['userkey'] = g_jsonUserInfo['userkey'];
	
	arr_ext['cmd'] = "query_Index";
	arr_ext['zdjy'] = "1";
	arr_ext['starttime'] = jsonParam['startDate'];
	arr_ext['endtime'] = jsonParam['endDate'];
	arr_ext['command'] = 'getCondition';
	arr_ext['type'] = 'single';
	arr_ext['qsid'] = g_jsonUserInfo['qsid'];
	arr_ext['userid'] = g_jsonUserInfo['userid'];
	arr_ext['zjzh'] = g_jsonUserInfo['zjzh'];
	
	arr_local['startDate'] = jsonParam['startDate'];
	arr_local['endDate'] = jsonParam['endDate'];
	arr_local['type'] = jsonParam['dateSection'];
	
	SendRequest(arr_std,arr_ext,arr_local);
}
// ?????ʱ??ʽ??????
function QueryCashCurveDataFromXcs(jsonParam)
{
	var arr_std = {};
	var arr_local = {};
	var arr_ext = {};
	
	arr_std['reqtype'] = "2318";
	arr_std['setcode'] = "";
	arr_std['refresh'] = "1";
	arr_std['cachedata'] = "0";
	arr_std['userkey'] = g_jsonUserInfo['userkey'];
	
	arr_ext['cmd'] = "query_asset";
	arr_ext['zdjy'] = "1";
	arr_ext['starttime'] = jsonParam['startDate'];
	arr_ext['endtime'] = jsonParam['endDate'];
	arr_ext['command'] = 'getAssetTotal';
	arr_ext['type'] = 'single';
	arr_ext['qsid'] = g_jsonUserInfo['qsid'];
	arr_ext['userid'] = g_jsonUserInfo['userid'];
	arr_ext['zjzh'] = g_jsonUserInfo['zjzh'];

	arr_local['startDate'] = jsonParam['startDate'];
	arr_local['endDate'] = jsonParam['endDate'];
	arr_local['type'] = jsonParam['dateSection'];
	
	SendRequest(arr_std,arr_ext,arr_local);
}

// ???????ʼ??
function QueryCxsUserInfoDataFromXcs()
{
	var arr_std = {};
	var arr_local = {};
	var arr_ext = {};
	
	g_xcsinfobegintime = (new Date()).valueOf();
	arr_std['reqtype'] = "2318";
	arr_std['setcode'] = "";
	arr_std['refresh'] = "1";
	arr_std['cachedata'] = "0";
	arr_std['userkey'] = g_jsonUserInfo['userkey'];
	
	arr_ext['cmd'] = "query_xcsUserInfo";
	arr_ext['zdjy'] = "1";
	arr_ext['qsid'] = g_jsonUserInfo['qsid'];
	arr_ext['userid'] = g_jsonUserInfo['userid'];
	arr_ext['zjzh'] = g_jsonUserInfo['zjzh'];
	
	SendRequest(arr_std,arr_ext,arr_local);
}

//???С?????
function fn_cxXcsXy()
{
	var arr_std = {};
	var arr_local = {};
	var arr_ext = {};
	
	arr_std['reqtype'] = "2318";
	arr_std['setcode'] = "";
	arr_std['refresh'] = "0";
	arr_std['cachedata'] = "0";
	arr_std['userkey'] = g_jsonUserInfo['userkey'];
	
	arr_ext['cmd'] = "getfile";
	arr_ext['zdjy'] = "1";
	arr_ext['data'] = "xcsxy";
	
	SendRequest(arr_std,arr_ext,arr_local);
}

// ???ֲ????
function QueryPositionDataFromBroker()
{
	var arr_std = {};
	var arr_local = {};
	var arr_ext = {};
	g_ccbegintime = (new Date()).valueOf();
	arr_std['reqtype'] = "1537";
	arr_std['setcode'] = "";
	arr_std['refresh'] = "0";
	arr_std['cachedata'] = "1";
	arr_std['userkey'] = g_jsonUserInfo['userkey'];
	
	arr_local['jsonway'] = "1";
	arr_local['myuserkey'] = g_jsonUserInfo['userkey'];

	SendRequest(arr_std,arr_ext,arr_local);
}
function fn_cxXcsQx(strUserInfo)
{
	var arr_std = {};
	var arr_local = {};
	var arr_ext = {};
	
	arr_std['reqtype'] = "2318";
	arr_std['setcode'] = "";
	arr_std['refresh'] = "1";
	arr_std['cachedata'] = "0";
	arr_std['userkey'] = g_jsonUserInfo['userkey'];
	
	arr_ext['zdjy'] = "1";
	arr_ext['cmd'] = "connect_xcs";
	arr_ext['type'] = "cx_zhxx";
	arr_ext['userid'] = g_jsonUserInfo['userid'];
	arr_ext['zjzh'] = g_jsonUserInfo['zjzh'];
	arr_ext['qsid'] = g_jsonUserInfo['qsid'];
	arr_ext['version'] = '1.0';
	arr_ext['terminal'] = '1';
	arr_ext['datatype'] = '';
	arr_ext['wtid'] = '0';
	arr_ext['xcs_from'] = '0';
	
	SendRequest(arr_std,arr_ext,arr_local);
}
function write_html_log(str) 
{
	fnFunction("test_json", get_cur_date() + ':htmllog:' + str);
}

function get_cur_date() 
{
	var date = new Date();
	var seperator1 = "-";
	var seperator2 = ":";
	var month = date.getMonth() + 1;
	var strDate = date.getDate();
	if (month >= 1 && month <= 9) 
	{
		month = "0" + month;
	}
	if (strDate >= 0 && strDate <= 9) 
	{
		strDate = "0" + strDate;
	}

	var hh = date.getHours();
	var mm = date.getMinutes();
	var ss = date.getSeconds();
	if (hh >= 1 && hh <= 9) 
	{
		hh = "0" + hh;
	}
	if (mm >= 0 && mm <= 9) 
	{
		mm = "0" + mm;
	}

	if (ss >= 0 && ss <= 9)
	{
		ss = "0" + ss;
	}

	return date.getFullYear() + seperator1 + month + seperator1 + strDate + " " + hh + seperator2 + mm + seperator2 + ss;
}
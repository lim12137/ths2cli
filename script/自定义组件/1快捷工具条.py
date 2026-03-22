dict_ui = {
	"width" : "750",
	"height" : "35",
	"btn1" : {
		"text" : "买入",
		"textcolor" : "#FFFFFFFF",
		"bkcolor" : "#FFFF4040",
		"type" : "Button",
		"cmd" : "buy fsdm $wtjg$ $wtfs$ $wtsl$",
		"hotkey" : "1000000"
	},
	"btn2" : {
		"text" : "卖出",
		"textcolor" : "#FFFFFFFF",
		"bkcolor" : "#FF00BFFF",
		"type" : "Button",
		"cmd" : "sell fsdm $wtjg$ $wtfs$ $wtsl$",
		"hotkey" : "1000000"
	},
	"btn3" : {
		"text" : "撤单",
		"textcolor" : "#FFFFFFFF",
		"bkcolor" : "#FFCD9B1D",
		"type" : "Button",
		"cmd" : "cancel fsdm",
		"hotkey" : "1000000"
	},
	"btn5" : {
		"text" : "抢买",
		"type" : "Button",
		"textcolor" : "#FFFFFFFF",
		"bkcolor" : "#FFFF0000",
		"tooltip" : "以涨停价全仓买入",
		"cmd" : "buy fsdm ztjg -cw 1/1 -notip",
		"hotkey" : "1000000"
	},
	"btn6" : {
		"text" : "抢卖",
		"type" : "Button",
		"textcolor" : "#FFFFFFFF",
		"bkcolor" : "#FF006400",
		"tooltip" : "以跌停价全仓卖出",
		"cmd" : "sell fsdm dtjg -cw 1/1 -notip",
		"hotkey" : "1000000"
	},
	"configs" : {
		"fenshi" : "true",
		"fenshititle" : "false",
		"code" : "false",
		"price" : "true",
		"defprice" : "zxjg",
		"operation" : "true",
		"defoperation" : " ",
		"amount" : "true",
		"buysellnotip" : "false",
		"cancelnotip" : "false",
		"topmost" : "true",
		"hidetitle" : "true"
	}
}
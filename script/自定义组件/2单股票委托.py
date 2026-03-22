dict_ui = {
	"width" : "500",
	"height" : "60",
	"zqdm_dgp" : {
		"type" : "Edit",
		"tipvalue" : "证券代码"
	},
	"btn0" : {
		"text" : "切",
		"type" : "Button",
		"width" : "20",
		"tooltip" : "切换行情",
		"cmd" : "hq $zqdm_dgp$"
	},
	"wtjg_dgp" : {
		"type" : "Combo",
		"value" : "zxjg",
		"values" : "ztjg,mrxjg,dsj5,dsj3,dsj1,zxjg,bfj1,bfj3,bfj5,mcxjg,dtjg",
		"texts" : "涨停价,买限价,对手价5,对手价3,对手价1,最新价,本方价1,本方价3,本方价5,卖限价,跌停价"
	},
	"wtfs_dgp" : {
		"type" : "Combo",
		"value" : " ",
		"values" : " ,-m,-cw,-zzc,-zcw",
		"texts" : "数量,金额,可用仓位,总资产仓位,目标总仓位",
		"tooltip" : "空：委托数量（股），-m：委托金额（元），-cw：可用仓位（比例），zzc:总资产仓位（比例），-zcw：目标总资产仓位（比例）"
	},
	"wtsl_dgp" : {
		"type" : "Edit",
		"tipvalue" : "",
		"tooltip" : "委托数量、委托金额、或仓位（小数）"
	},
	"btn1" : {
		"text" : "买入",
		"type" : "Button",
		"textcolor" : "#FFFFFFFF",
		"bkcolor" : "#FFFF4040",
		"cmd" : "buy $zqdm_dgp$ $wtjg_dgp$ $wtfs_dgp$ $wtsl_dgp$"
	},
	"btn2" : {
		"text" : "卖出",
		"type" : "Button",
		"textcolor" : "#FFFFFFFF",
		"bkcolor" : "#FF00BFFF",
		"cmd" : "sell $zqdm_dgp$ $wtjg_dgp$ $wtfs_dgp$ $wtsl_dgp$"
	},
	"btn3" : {
		"text" : "撤当前",
		"type" : "Button",
		"textcolor" : "#FFFFFFFF",
		"bkcolor" : "#FFCD9B1D",
		"cmd" : "cancel $zqdm_dgp$"
	},
	"configs" : {
		"fenshi" : "",
		"fenshititle" : "",
		"code" : "",
		"price" : "",
		"defprice" : "",
		"operation" : "",
		"defoperation" : "",
		"amount" : "",
		"buysellnotip" : "",
		"cancelnotip" : ""
	}
}    


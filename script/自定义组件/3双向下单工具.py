dict_ui = {
	"width" : "200",
	"height" : "240",
	"zqdm_sx" : {
		"type" : "Edit",
		"height" : "23",
		"tipvalue" : "证券代码",
		"tooltip" : "请输入证券代码"
	},
	"btn0" : {
		"text" : "切换",
		"type" : "Button",
		"width" : "35",
		"tooltip" : "切换行情",
		"cmd" : "hq $zqdm_sx$"
	},
	"btn1" : {
		"text" : "撤当前",
		"type" : "Button",
		"width" : "40",
		"textcolor" : "#FFFFFFFF",
		"bkcolor" : "#FFCD9B1D",
		"tooltip" : "撤销当前代码的所有委托",
		"cmd" : "cancel $zqdm_sx$"
	},
	"text2" : {
		"text" : "买入价格/数量",
		"type" : "Label",
		"height" : "23",
		"textcolor" : "#FFFF0000",
		"textpadding" : "2,2,15,2",
		"newline" : "true"
	},
	"text3" : {
		"text" : " 卖出价格/数量",
		"type" : "Label",
		"height" : "23",
		"textcolor" : "#FF0000CD",
		"textpadding" : "15,2,2,2"
	},
	"wtjg_buy" : {
		"type" : "Combo",
		"height" : "23",
		"value" : "zxjg",
		"values" : "ztjg,mrxjg,dsj5,dsj3,dsj1,zxjg,bfj1,bfj3,bfj5,mcxjg,dtjg",
		"texts" : "涨停价,买限价,对手价5,对手价3,对手价1,最新价,本方价1,本方价3,本方价5,卖限价,跌停价",
		"newline" : "true"
	},
	"wtjg_sell" : {
		"type" : "Combo",
		"height" : "23",
		"value" : "zxjg",
		"values" : "ztjg,mrxjg,dsj5,dsj3,dsj1,zxjg,bfj1,bfj3,bfj5,mcxjg,dtjg",
		"texts" : "涨停价,买限价,对手价5,对手价3,对手价1,最新价,本方价1,本方价3,本方价5,卖限价,跌停价"
	},
	"wtfs_buy" : {
		"type" : "Combo",
		"value" : " ",
		"height" : "23",
		"values" : " ,-m,-cw,-zzc,-zcw",
		"texts" : "数量,金额,可用仓位,总资产仓位,目标总仓位",
		"tooltip" : "",
		"newline" : "true"
	},
	"wtfs_sell" : {
		"type" : "Combo",
		"value" : " ",
		"height" : "23",
		"values" : " ,-m,-cw,-zzc,-zcw",
		"texts" : "数量,金额,可用仓位,总资产仓位,目标总仓位",
		"tooltip" : ""
	},
	"wtsl_buy" : {
		"type" : "Edit",
		"height" : "23",
		"tipvalue" : "",
		"tooltip" : "请输入委托数量/金额/仓位",
		"newline" : "true"
	},
	"wtsl_sell" : {
		"type" : "Edit",
		"height" : "23",
		"tipvalue" : "",
		"tooltip" : "请输入委托数量/金额/仓位"
	},
	"btn2" : {
		"text" : "买入",
		"type" : "Button",
		"height" : "30",
		"textcolor" : "#FFFFFFFF",
		"bkcolor" : "#FFFF4040",
		"cmd" : "buy $zqdm_sx$ $wtjg_buy$ $wtfs_buy$ $wtsl_buy$",
		"newline" : "true"
	},
	"btn3" : {
		"text" : "卖出",
		"type" : "Button",
		"height" : "30",
		"textcolor" : "#FFFFFFFF",
		"bkcolor" : "#FF00BFFF",
		"cmd" : "sell $zqdm_sx$ $wtjg_sell$ $wtfs_sell$ $wtsl_sell$"
	},
	"btn4" : {
		"text" : "撤买",
		"type" : "Button",
		"height" : "30",
		"textcolor" : "#FFFFFFFF",
		"bkcolor" : "#FFCD9B1D",
		"tooltip" : "撤销当前代码的买入委托",
		"cmd" : "cancel $zqdm_sx$ buy",
		"newline" : "true"
	}
}
#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
最小化测试 - 在同花顺策略平台直接运行
"""

# 测试行情
from ths_api import hq
api = hq.ths_hq_api()
quote = api.get_quote('600000')
print('浦发银行:', quote['600000']['price'])

# 测试资金
import xiadan as xd
print('总资产:', xd.g_money['zzc'])
print('持仓数:', len(xd.g_position))

print('测试完成！')

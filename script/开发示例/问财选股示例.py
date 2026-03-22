from ths_api import *

df = hq.select_stock('当日涨幅在8%以上的股票且价格小于3元')

# 取第1列数据
column1 = df.iloc[0]
print(column1)

print('-----------------')

# 取第1行数据
row1 = df.iloc[[0]]
print(row1)

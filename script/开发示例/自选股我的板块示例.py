from ths_api import *

# 取自选股
selfStocklist = hq.get_block()
print(selfStocklist)

# 取我的板块成分股
selfblock1list = hq.get_block('板块1')
print(selfblock1list)

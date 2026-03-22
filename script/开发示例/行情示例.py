from ths_api import *

code = '300033'
api = hq.ths_hq_api()
quote = api.reg_quote(code)
while True:
	api.wait_update()
	print(quote)
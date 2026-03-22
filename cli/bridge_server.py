#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
同花顺HTTP桥接服务
提供HTTP接口访问同花顺Python API
"""

import sys
import json
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# 添加同花顺API路径
ths_api_path = os.path.join(os.path.dirname(__file__), '..', 'python3.5.0_32', 'Lib', 'site-packages')
if ths_api_path not in sys.path:
    sys.path.insert(0, ths_api_path)

try:
    from ths_api import *
except ImportError:
    print("Error: Cannot import ths_api")
    print("Please ensure xiadan.exe is running and Python environment is properly configured")
    sys.exit(1)

class BridgeHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        """禁用默认日志"""
        pass

    def send_json(self, data):
        """发送JSON响应"""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def send_error(self, code, message):
        """发送错误响应"""
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        error_data = {'error': message, 'code': code}
        self.wfile.write(json.dumps(error_data, ensure_ascii=False).encode('utf-8'))

    def do_GET(self):
        """处理GET请求"""
        try:
            parsed = urlparse(self.path)
            path = parsed.path
            params = parse_qs(parsed.query)

            if path == '/test':
                self.send_json({'status': 'ok', 'message': '连接成功'})

            elif path == '/quote':
                code = params.get('code', [''])[0]
                if not code:
                    self.send_error(400, 'Missing code parameter')
                    return

                api = hq.ths_hq_api()
                quote = api.get_quote(code)
                self.send_json(quote)

            elif path == '/kline':
                code = params.get('code', [''])[0]
                period = int(params.get('period', ['1440'])[0])  # 默认日线
                length = int(params.get('length', ['5'])[0])

                api = hq.ths_hq_api()
                kline = api.get_kline(code, period, length)
                self.send_json(kline)

            elif path == '/money':
                # 返回资金数据
                self.send_json(g_money)

            elif path == '/position':
                # 返回持仓数据
                self.send_json(g_position)

            elif path == '/order':
                # 返回委托数据
                self.send_json(g_order)

            elif path == '/fullorder':
                # 返回全量委托数据
                self.send_json(g_fullorder)

            elif path == '/block':
                name = params.get('name', ['自选股'])[0]
                block = hq.get_block(name)
                self.send_json(block)

            else:
                self.send_error(404, 'Not Found')

        except Exception as e:
            self.send_error(500, str(e))

    def do_POST(self):
        """处理POST请求"""
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))

            parsed = urlparse(self.path)
            path = parsed.path

            if path == '/cmd':
                # 执行自定义命令
                result = cmd(data['cmd'])
                self.send_json(result)

            elif path == '/select_stock':
                # 问财选股
                query = data.get('query', '')
                result = hq.select_stock(query)
                self.send_json(result)

            else:
                self.send_error(404, 'Not Found')

        except Exception as e:
            self.send_error(500, str(e))

    def do_OPTIONS(self):
        """处理OPTIONS请求（CORS预检）"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

def run_server(port=18888):
    server_address = ('', port)
    httpd = HTTPServer(server_address, BridgeHandler)
    print('=' * 50)
    print('同花顺桥接服务启动成功')
    print('=' * 50)
    print(f'监听端口: {port}')
    print(f'访问地址: http://127.0.0.1:{port}')
    print('')
    print('可用接口:')
    print('  GET  /test          - 测试连接')
    print('  GET  /quote         - 查询行情')
    print('  GET  /kline         - 查询K线')
    print('  GET  /money         - 查询资金')
    print('  GET  /position      - 查询持仓')
    print('  GET  /order         - 查询委托')
    print('  GET  /fullorder     - 查询全量委托')
    print('  POST /cmd           - 执行命令')
    print('=' * 50)
    print('')
    print('按 Ctrl+C 停止服务')
    print('')

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n\n服务已停止')
        httpd.shutdown()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 18888
    run_server(port)

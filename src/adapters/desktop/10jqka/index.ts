/**
 * 同花顺桌面客户端适配器
 *
 * 支持功能：
 * - 实时行情查询
 * - K线数据获取
 * - 买入/卖出/撤单
 * - 持仓/资金查询
 * - 自选股管理
 */

import { DesktopAdapter } from '@/sdk/adapters';
import {
  TenjqkaQuoteData,
  TenjqkaKlineData,
  TenjqkaMoneyData,
  TenjqkaPositionData,
  TenjqkaOrderData,
  TenjqkaTradeResult,
  TenjqkaBlockData,
  TenjqkaOrderStatus,
  TenjqkaPriceType,
} from './types';
import { QuoteCommand } from './commands/quote';
import { TradeCommand } from './commands/trade';
import { PositionCommand } from './commands/position';

export class TenjqkaAdapter extends DesktopAdapter {
  name = '10jqka';
  displayName = '同花顺';
  version = '1.0.0';
  description = '同花顺桌面客户端适配器，支持行情、交易、查询等功能';

  // 进程识别
  processNames = ['xiadan.exe', '同花顺', '10jqka'];

  // 安装路径（Windows）
  installPaths = [
    'C:\\Program Files (x86)\\同花顺\\同花顺',
    'C:\\Program Files\\同花顺\\同花顺',
    'D:\\同花顺*',
  ];

  // Python环境路径（相对于安装目录）
  pythonRelPath = 'python3.5.0_32\\python.exe';

  // 脚本目录
  scriptDir = 'script';

  // HTTP桥接服务配置
  bridgeServer = {
    host: '127.0.0.1',
    port: 18888,
    scriptPath: 'script/bridge_server.py',
  };

  // 命令映射
  commands = {
    quote: QuoteCommand,
    trade: TradeCommand,
    position: PositionCommand,
  };

  /**
   * 检测同花顺是否安装
   */
  async detect(): Promise<boolean> {
    // 检查进程
    const isRunning = await this.findProcess();
    if (!isRunning) {
      return false;
    }

    // 检查安装路径
    const installPath = await this.findInstallPath();
    if (!installPath) {
      return false;
    }

    // 检查Python环境
    const pythonPath = await this.findPythonPath();
    if (!pythonPath) {
      return false;
    }

    return true;
  }

  /**
   * 查找同花顺安装路径
   */
  async findInstallPath(): Promise<string | null> {
    const paths = await this.searchPaths(this.installPaths);
    return paths[0] || null;
  }

  /**
   * 查找Python解释器路径
   */
  async findPythonPath(): Promise<string | null> {
    const installPath = await this.findInstallPath();
    if (!installPath) {
      return null;
    }

    const pythonPath = this.join(installPath, this.pythonRelPath);
    const exists = await this.fileExists(pythonPath);

    return exists ? pythonPath : null;
  }

  /**
   * 初始化适配器
   */
  async initialize(): Promise<void> {
    // 检测同花顺是否运行
    const isRunning = await this.findProcess();
    if (!isRunning) {
      throw new Error('同花顺客户端未运行，请先启动同花顺');
    }

    // 启动Python桥接服务
    await this.startBridgeServer();

    // 测试连接
    const isConnected = await this.testConnection();
    if (!isConnected) {
      throw new Error('无法连接到同花顺，请检查客户端状态');
    }
  }

  /**
   * 启动Python HTTP桥接服务
   */
  async startBridgeServer(): Promise<void> {
    const installPath = await this.findInstallPath();
    const pythonPath = await this.findPythonPath();

    if (!installPath || !pythonPath) {
      throw new Error('找不到同花顺安装路径或Python环境');
    }

    const scriptPath = this.join(installPath, this.bridgeServer.scriptPath);

    // 检查桥接脚本是否存在
    const scriptExists = await this.fileExists(scriptPath);
    if (!scriptExists) {
      // 自动创建桥接脚本
      await this.createBridgeScript(scriptPath);
    }

    // 启动Python HTTP服务器
    const command = `"${pythonPath}" "${scriptPath}" ${this.bridgeServer.port}`;
    await this.execInBackground(command);

    // 等待服务启动
    await this.sleep(2000);
  }

  /**
   * 创建Python桥接脚本
   */
  async createBridgeScript(scriptPath: string): Promise<void> {
    const script = `
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
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'python3.5.0_32', 'Lib', 'site-packages'))

try:
    from ths_api import *
except ImportError:
    print("Error: Cannot import ths_api")
    sys.exit(1)

class BridgeHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        """禁用默认日志"""
        pass

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
                import xiadan as xd
                self.send_json(xd.g_money)

            elif path == '/position':
                # 返回持仓数据
                import xiadan as xd
                self.send_json(xd.g_position)

            elif path == '/order':
                # 返回委托数据
                import xiadan as xd
                self.send_json(xd.g_order)

            elif path == '/buy':
                code = params.get('code', [''])[0]
                price = params.get('price', ['zxjg'])[0]
                amount = params.get('amount', ['100'])[0]
                notip = params.get('notip', ['1'])[0]

                cmd = f'buy {code} {price} {amount}'
                if notip == '1':
                    cmd += ' -notip'

                import xiadan as xd
                result = xd.cmd(cmd)
                self.send_json(result)

            elif path == '/sell':
                code = params.get('code', [''])[0]
                price = params.get('price', ['zxjg'])[0]
                amount = params.get('amount', ['100'])[0]
                notip = params.get('notip', ['1'])[0]

                cmd = f'sell {code} {price} {amount}'
                if notip == '1':
                    cmd += ' -notip'

                import xiadan as xd
                result = xd.cmd(cmd)
                self.send_json(result)

            elif path == '/cancel':
                htbh = params.get('htbh', [''])[0]
                if htbh:
                    cmd = f'cancel -h {htbh}'
                else:
                    cmd = 'cancel all'

                import xiadan as xd
                result = xd.cmd(cmd)
                self.send_json(result)

            elif path == '/block':
                name = params.get('name', ['自选股'])[0]
                import xiadan as xd
                block = xd.hq.get_block(name)
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
                import xiadan as xd
                result = xd.cmd(data['cmd'])
                self.send_json(result)

            elif path == '/select_stock':
                # 问财选股
                import xiadan as xd
                query = data.get('query', '')
                result = xd.hq.select_stock(query)
                self.send_json(result)

            else:
                self.send_error(404, 'Not Found')

        except Exception as e:
            self.send_error(500, str(e))

    def send_json(self, data):
        """发送JSON响应"""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

def run_server(port=18888):
    server_address = ('', port)
    httpd = HTTPServer(server_address, BridgeHandler)
    print(f'同花顺桥接服务启动成功，监听端口: {port}')
    httpd.serve_forever()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 18888
    run_server(port)
`;

    await this.writeFile(scriptPath, script);
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.httpGet(
        `http://${this.bridgeServer.host}:${this.bridgeServer.port}/test`
      );
      const data = JSON.parse(response);
      return data.status === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * 执行HTTP GET请求
   */
  async httpGet(url: string): Promise<string> {
    const response = await fetch(url);
    return await response.text();
  }

  /**
   * 执行HTTP POST请求
   */
  async httpPost(url: string, data: any): Promise<string> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return await response.text();
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    // 停止桥接服务
    await this.stopBridgeServer();
  }

  /**
   * 停止Python桥接服务
   */
  async stopBridgeServer(): Promise<void> {
    // 查找并终止Python桥接进程
    const command = `taskkill /F /IM python.exe /FI "WINDOWTITLE eq 10jqka-Bridge*"`;
    await this.exec(command);
  }
}

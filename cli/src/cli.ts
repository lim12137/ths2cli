#!/usr/bin/env node
/**
 * 同花顺下单 CLI 工具
 * 支持功能：
 * - 买入/卖出股票
 * - 查询资金、持仓、委托
 * - 撤单操作
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as commands from './commands';

const program = new Command();

// CLI 信息
program
  .name('xiadan')
  .description('同花顺下单命令行接口工具')
  .version('1.0.0');

// 查询命令组
const queryCmd = program.command('query');

// 查询资金
queryCmd
  .command('money')
  .description('查询账户资金信息')
  .action(commands.queryMoney);

// 查询持仓
queryCmd
  .command('position')
  .description('查询持仓信息')
  .option('-c, --code <code>', '股票代码（可选）')
  .action(commands.queryPosition);

// 查询委托
queryCmd
  .command('orders')
  .description('查询委托信息')
  .option('-a, --all', '查询全部委托（包括已成交）')
  .action(commands.queryOrders);

// 交易命令组
const tradeCmd = program.command('trade');

// 买入
tradeCmd
  .command('buy <code> <amount>')
  .description('买入股票')
  .option('-p, --price <price>', '价格（默认：对手价）', 'dsj1')
  .option('-m, --money <amount>', '按金额买入（元）')
  .option('-cw, --position <ratio>', '买入可用仓位（如 1/3）')
  .option('-zcw, --target <ratio>', '买入到目标仓位')
  .option('--notip', '不弹出确认框', true)
  .action(commands.buy);

// 卖出
tradeCmd
  .command('sell <code> <amount>')
  .description('卖出股票')
  .option('-p, --price <price>', '价格（默认：对手价）', 'dsj1')
  .option('-m, --money <amount>', '按金额卖出（元）')
  .option('-zcw, --target <ratio>', '卖出到目标仓位')
  .option('--notip', '不弹出确认框', true)
  .action(commands.sell);

// 撤单
tradeCmd
  .command('cancel [htbh]')
  .description('撤单')
  .option('-c, --code <code>', '股票代码')
  .option('-d, --direction <dir>', '方向（buy/sell）')
  .option('-a, --all', '全部撤单')
  .option('-l, --last', '撤最后一条')
  .action(commands.cancel);

// 撤单快捷命令
tradeCmd
  .command('cancel-all')
  .description('撤销所有委托')
  .action(commands.cancelAll);

// 按代码撤单
tradeCmd
  .command('cancel-code <code>')
  .description('撤销某股票的所有委托')
  .action(commands.cancelByCode);

// 市场命令组
const marketCmd = program.command('market');

// 查询行情
marketCmd
  .command('quote <code>')
  .description('查询股票行情')
  .action(commands.getQuote);

// 查询K线
marketCmd
  .command('kline <code>')
  .description('查询K线数据')
  .option('-p, --period <minutes>', '周期（分钟），默认1440（日线）', '1440')
  .option('-l, --length <n>', '数据条数', '5')
  .action(commands.getKline);

// 系统命令
program
  .command('test')
  .description('测试连接')
  .action(commands.testConnection);

program
  .command('server')
  .description('启动Python桥接服务')
  .option('-p, --port <port>', '端口号', '18888')
  .action(commands.startServer);

// 解析命令行参数
program.parse(process.argv);

// 如果没有参数，显示帮助
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

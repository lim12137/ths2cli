/**
 * 自动化交易系统主入口
 */

import { Scheduler } from './core/Scheduler';
import { Logger } from './utils/logger';
import * as fs from 'fs';
import * as path from 'path';

// 配置
const CONFIG: SchedulerConfig = {
  rules_path: path.join(__dirname, '../config/rules.yaml'),
  plugins_path: path.join(__dirname, '../config/plugins.yaml'),
  plugins: [],  // 从配置文件加载
  check_interval: 5,
  safety: {
    funds: {
      max_single_trade: 50000,
      max_daily_trade: 200000,
      min_reserve: 10000,
    },
    position: {
      max_single_stock: 0.3,
      max_total_position: 0.8,
    },
    circuit_breaker: {
      enabled: true,
      max_consecutive_losses: 3,
      cooldown_minutes: 30,
      notify_on_trigger: true,
    },
  },
  monitoring: {
    log_level: 'info',
    check_interval: 60,
    notify_channels: ['console', 'file'],
  },
};

// 全局调度器实例
let scheduler: Scheduler | null = null;
const logger = new Logger('Automation');

/**
 * 启动自动化交易系统
 */
async function start(): Promise<void> {
  try {
    logger.info('========================================');
    logger.info('   同花顺自动化交易系统 v1.0.0');
    logger.info('========================================\n');

    // 确保必要的目录存在
    ensureDirectories();

    // 创建调度器
    scheduler = new Scheduler(CONFIG);

    // 启动调度器
    await scheduler.start();

    logger.info('\n✅ 系统启动成功！');
    logger.info('\n💡 提示:');
    logger.info('  - 按 Ctrl+C 停止系统');
    logger.info('  - 查看日志文件: logs/trading.log');
    logger.info('  - 修改配置文件后自动重载\n');

  } catch (error) {
    logger.error('\n❌ 系统启动失败:', error);
    process.exit(1);
  }
}

/**
 * 停止系统
 */
async function stop(): Promise<void> {
  if (scheduler) {
    logger.info('\n\n⏹️  正在停止系统...');
    await scheduler.stop();
    logger.info('✅ 系统已停止\n');
  }
}

/**
 * 确保必要的目录存在
 */
function ensureDirectories(): void {
  const dirs = [
    'config',
    'plugins',
    'logs',
  ];

  for (const dir of dirs) {
    const dirPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      logger.info(`✓ 创建目录: ${dir}`);
    }
  }
}

/**
 * 处理命令行参数
 */
function parseArgs(): { command?: string } {
  const args = process.argv.slice(2);
  return {
    command: args[0],
  };
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  const { command } = parseArgs();

  // 启动命令
  if (!command || command === 'start') {
    await start();

    // 处理退出信号
    process.on('SIGINT', async () => {
      await stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await stop();
      process.exit(0);
    });

    // 保持运行
    process.stdin.resume();

  } else if (command === 'status') {
    // 查询状态
    // TODO: 实现状态查询
    logger.info('状态查询功能待实现');

  } else if (command === 'test') {
    // 测试模式
    logger.info('测试模式\n');
    await start();

  } else if (command === 'help') {
    // 显示帮助
    logger.info(`
自动化交易系统

用法:
  node automation.js [命令]

命令:
  start   启动自动化交易系统 (默认)
  test    测试模式启动
  status  查询系统状态
  help    显示帮助信息

示例:
  node automation.js start     # 启动系统
  node automation.js           # 启动系统（默认）
  node automation.js test      # 测试模式

配置文件:
  config/rules.yaml        - 交易规则配置
  config/plugins.yaml      - 插件配置
  config/monitoring.yaml   - 监控配置
  config/environments.yaml - 环境配置

日志文件:
  logs/trading.log        - 交易日志
  logs/notifications.log  - 通知日志
    `);

  } else {
    logger.info(`未知命令: ${command}`);
    logger.info('使用 "node automation.js help" 查看帮助');
    process.exit(1);
  }
}

// 运行主函数
main().catch(error => {
  logger.error('未捕获的错误:', error);
  process.exit(1);
});

// 类型导入（用于编译）
type SchedulerConfig = import('./types-auto').SchedulerConfig;

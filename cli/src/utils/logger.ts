/**
 * 日志系统
 * 提供分级日志记录和文件持久化功能
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * 日志级别字符串映射
 */
const LogLevelNames: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR'
};

/**
 * 日志配置选项
 */
export interface LoggerOptions {
  level?: string;
  logDir?: string;
  logFile?: string;
  enableConsole?: boolean;
  enableFile?: boolean;
}

/**
 * 日志记录器类
 */
export class Logger {
  private level: LogLevel;
  private name: string;
  private logDir: string;
  private logFile: string;
  private enableConsole: boolean;
  private enableFile: boolean;

  constructor(name: string, options: LoggerOptions = {}) {
    this.name = name;
    const levels: Record<string, number> = {
      debug: LogLevel.DEBUG,
      info: LogLevel.INFO,
      warn: LogLevel.WARN,
      error: LogLevel.ERROR
    };
    this.level = levels[options.level || 'info'] ?? LogLevel.INFO;
    this.logDir = options.logDir || path.join(process.cwd(), 'logs');
    this.logFile = options.logFile || 'app.log';
    this.enableConsole = options.enableConsole !== false;
    this.enableFile = options.enableFile !== false;

    // 确保日志目录存在
    if (this.enableFile) {
      this.ensureLogDir();
    }
  }

  /**
   * 确保日志目录存在
   */
  private ensureLogDir(): void {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch (err) {
      // 如果创建目录失败，禁用文件日志
      this.enableFile = false;
      console.error(`创建日志目录失败: ${this.logDir}`, err);
    }
  }

  /**
   * 记录日志的核心方法
   */
  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (level < this.level) {
      return;
    }

    const timestamp = new Date().toISOString();
    const levelStr = LogLevelNames[level];
    const msg = `[${timestamp}] [${levelStr}] [${this.name}] ${message}`;

    // 输出到控制台
    if (this.enableConsole) {
      const consoleMethod = level >= LogLevel.ERROR ? console.error :
                           level >= LogLevel.WARN ? console.warn :
                           console.log;
      consoleMethod(msg, ...args);
    }

    // 写入文件
    if (this.enableFile) {
      this.writeToFile(timestamp, levelStr, message, args);
    }
  }

  /**
   * 将日志写入文件
   */
  private writeToFile(timestamp: string, level: string, message: string, args: any[]): void {
    try {
      const filePath = path.join(this.logDir, this.logFile);
      const logEntry = {
        timestamp,
        level,
        logger: this.name,
        message,
        args: args.length > 0 ? args : undefined
      };

      const line = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(filePath, line, 'utf8');
    } catch (err) {
      // 静默失败，避免日志影响主逻辑
      // 但可以输出到 stderr 以便调试
      if (this.enableConsole) {
        console.error('写入日志文件失败:', err);
      }
    }
  }

  /**
   * 记录 DEBUG 级别日志
   */
  debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  /**
   * 记录 INFO 级别日志
   */
  info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  /**
   * 记录 WARN 级别日志
   */
  warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  /**
   * 记录 ERROR 级别日志
   */
  error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  /**
   * 设置日志级别
   */
  setLevel(level: string): void {
    const levels: Record<string, number> = {
      debug: LogLevel.DEBUG,
      info: LogLevel.INFO,
      warn: LogLevel.WARN,
      error: LogLevel.ERROR
    };
    const newLevel = levels[level];
    if (newLevel !== undefined) {
      this.level = newLevel;
    }
  }

  /**
   * 获取当前日志级别
   */
  getLevel(): string {
    return LogLevelNames[this.level];
  }

  /**
   * 创建子日志记录器
   */
  child(childName: string): Logger {
    const newName = `${this.name}.${childName}`;
    return new Logger(newName, {
      level: LogLevelNames[this.level].toLowerCase(),
      logDir: this.logDir,
      logFile: this.logFile,
      enableConsole: this.enableConsole,
      enableFile: this.enableFile
    });
  }
}

/**
 * 创建全局日志记录器实例
 */
let globalLogger: Logger | null = null;

/**
 * 获取或创建全局日志记录器
 */
export function getLogger(name: string = 'app', options?: LoggerOptions): Logger {
  if (!globalLogger) {
    globalLogger = new Logger(name, options);
  }
  return globalLogger;
}

/**
 * 设置全局日志记录器
 */
export function setLogger(logger: Logger): void {
  globalLogger = logger;
}

/**
 * 便捷方法 - 创建日志记录器
 */
export function createLogger(name: string, options?: LoggerOptions): Logger {
  return new Logger(name, options);
}

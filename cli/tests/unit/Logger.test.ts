/**
 * Logger 测试套件
 * 测试日志系统的所有核心功能
 */

// 由于 Logger 类可能还未实现，这里先定义接口
// 测试按照预期的 Logger 功能编写

import * as fs from 'fs';

// Mock fs 模块
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

// 假设的 Logger 类接口（实际实现由 Team 1 或 Team 2 完成）
interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  setLevel(level: string): void;
  setLogFile(path: string): void;
}

// 简单的 Logger 实现用于测试（实际实现应该在 src/core/Logger.ts）
class SimpleLogger implements Logger {
  private level: string = 'info';
  private logFile?: string;
  private levels: Record<string, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  constructor(private options: { level?: string; logFile?: string } = {}) {
    if (options.level) {
      this.level = options.level;
    }
    if (options.logFile) {
      this.logFile = options.logFile;
    }
  }

  private shouldLog(level: string): boolean {
    return this.levels[level] >= this.levels[this.level];
  }

  private formatMessage(level: string, message: string, args: any[]): string {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ` ${args.map(arg => JSON.stringify(arg)).join(' ')}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${formattedArgs}`;
  }

  private writeToFile(formattedMessage: string): void {
    if (this.logFile) {
      try {
        mockFs.appendFileSync(this.logFile, formattedMessage + '\n');
      } catch (error) {
        console.error('Failed to write to log file:', error);
      }
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      const formatted = this.formatMessage('debug', message, args);
      console.debug(formatted);
      this.writeToFile(formatted);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      const formatted = this.formatMessage('info', message, args);
      console.info(formatted);
      this.writeToFile(formatted);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      const formatted = this.formatMessage('warn', message, args);
      console.warn(formatted);
      this.writeToFile(formatted);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      const formatted = this.formatMessage('error', message, args);
      console.error(formatted);
      this.writeToFile(formatted);
    }
  }

  setLevel(level: string): void {
    if (level in this.levels) {
      this.level = level;
    } else {
      throw new Error(`Invalid log level: ${level}`);
    }
  }

  setLogFile(path: string): void {
    this.logFile = path;
  }
}

describe('Logger', () => {
  let logger: Logger;
  let consoleDebugSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = new SimpleLogger({ level: 'debug' });

    // Spy on console methods
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Mock fs.appendFileSync
    mockFs.appendFileSync.mockImplementation();
  });

  afterEach(() => {
    consoleDebugSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('日志级别过滤', () => {
    it('应该根据日志级别过滤输出', () => {
      logger.setLevel('error');

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('应该在 warn 级别下输出 warn 和 error', () => {
      logger.setLevel('warn');

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('应该在 info 级别下输出 info、warn 和 error', () => {
      logger.setLevel('info');

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('应该在 debug 级别下输出所有日志', () => {
      logger.setLevel('debug');

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('应该拒绝无效的日志级别', () => {
      expect(() => logger.setLevel('invalid')).toThrow('Invalid log level');
    });
  });

  describe('日志文件写入', () => {
    it('应该支持日志文件写入', () => {
      const testLogger = new SimpleLogger({ level: 'info', logFile: '/test/test.log' });

      testLogger.info('Test message');

      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        '/test/test.log',
        expect.stringContaining('Test message')
      );
    });

    it('应该在写入失败时优雅降级', () => {
      mockFs.appendFileSync.mockImplementation(() => {
        throw new Error('Write failed');
      });

      const testLogger = new SimpleLogger({ level: 'info', logFile: '/test/test.log' });

      // 不应该抛出错误
      expect(() => testLogger.info('Test message')).not.toThrow();
    });

    it('应该能够动态设置日志文件', () => {
      logger.setLogFile('/test/new.log');

      logger.info('New log file message');

      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        '/test/new.log',
        expect.stringContaining('New log file message')
      );
    });

    it('应该在没有设置日志文件时不写入文件', () => {
      const testLogger = new SimpleLogger({ level: 'info' });

      testLogger.info('No file message');

      expect(mockFs.appendFileSync).not.toHaveBeenCalled();
    });
  });

  describe('日志消息格式化', () => {
    it('应该正确格式化日志消息', () => {
      logger.info('Test message');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]')
      );
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test message')
      );
    });

    it('应该包含时间戳', () => {
      logger.info('Timestamp test');

      const callArg = consoleInfoSpy.mock.calls[0][0];
      expect(callArg).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    });

    it('应该正确处理多个参数', () => {
      logger.info('Message with args', { key: 'value' }, 123, 'string');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('{"key":"value"}')
      );
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('123')
      );
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('"string"')
      );
    });

    it('应该正确处理特殊字符', () => {
      logger.info('Special chars: \n\t\r');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Special chars:')
      );
    });

    it('应该正确处理对象参数', () => {
      const obj = { name: 'test', value: 123, nested: { key: 'value' } };
      logger.info('Object test', obj);

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('"name":"test"')
      );
    });

    it('应该正确处理数组参数', () => {
      const arr = [1, 2, 3, 'four'];
      logger.info('Array test', arr);

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('[1,2,3,"four"]')
      );
    });

    it('应该正确处理 null 和 undefined', () => {
      logger.info('Null test', null, undefined);

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('null')
      );
    });
  });

  describe('不同日志级别', () => {
    it('应该正确处理 debug 日志', () => {
      logger.debug('Debug message');

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]')
      );
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Debug message')
      );
    });

    it('应该正确处理 info 日志', () => {
      logger.info('Info message');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]')
      );
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Info message')
      );
    });

    it('应该正确处理 warn 日志', () => {
      logger.warn('Warn message');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WARN]')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warn message')
      );
    });

    it('应该正确处理 error 日志', () => {
      logger.error('Error message');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error message')
      );
    });
  });

  describe('日志级别动态切换', () => {
    it('应该能够动态切换日志级别', () => {
      logger.setLevel('error');

      logger.info('Should not appear');
      expect(consoleInfoSpy).not.toHaveBeenCalled();

      logger.setLevel('debug');

      logger.info('Should appear');
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    });

    it('应该在切换级别后正确过滤', () => {
      logger.setLevel('info');

      logger.debug('Debug 1');
      expect(consoleDebugSpy).not.toHaveBeenCalled();

      logger.setLevel('debug');

      logger.debug('Debug 2');
      expect(consoleDebugSpy).toHaveBeenCalledTimes(1);

      logger.setLevel('error');

      logger.debug('Debug 3');
      expect(consoleDebugSpy).toHaveBeenCalledTimes(1); // 仍然是 1
    });
  });

  describe('边界情况', () => {
    it('应该处理空字符串消息', () => {
      logger.info('');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]')
      );
    });

    it('应该处理非常长的消息', () => {
      const longMessage = 'A'.repeat(10000);
      logger.info(longMessage);

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining(longMessage)
      );
    });

    it('应该处理没有额外参数的日志', () => {
      logger.info('No extra args');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('No extra args')
      );
    });

    it('应该处理只有参数没有消息的情况', () => {
      logger.info('', { key: 'value' });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]')
      );
    });

    it('应该处理循环引用对象', () => {
      const obj: any = { name: 'test' };
      obj.self = obj;

      logger.info('Circular ref', obj);

      // 应该能够处理而不崩溃
      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('应该处理函数参数', () => {
      const func = () => 'test';
      logger.info('Function arg', func);

      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('应该处理 Date 对象', () => {
      const date = new Date('2024-01-01');
      logger.info('Date arg', date);

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('2024-01-01')
      );
    });
  });

  describe('性能', () => {
    it('应该能够快速记录大量日志', () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        logger.info(`Log message ${i}`);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 应该在合理时间内完成（小于 1 秒）
      expect(duration).toBeLessThan(1000);
    });

    it('应该在过滤日志时具有良好的性能', () => {
      logger.setLevel('error');

      const startTime = Date.now();

      for (let i = 0; i < 10000; i++) {
        logger.debug(`Debug message ${i}`);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 过滤应该很快（小于 100ms）
      expect(duration).toBeLessThan(100);
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });
  });

  describe('多实例', () => {
    it('应该支持多个独立的 Logger 实例', () => {
      const logger1 = new SimpleLogger({ level: 'debug' });
      const logger2 = new SimpleLogger({ level: 'error' });

      logger1.info('Logger1 info');
      logger2.info('Logger2 info');

      expect(consoleInfoSpy).toHaveBeenCalledTimes(1); // 只有 logger1
    });

    it('应该允许每个实例有不同的配置', () => {
      const logger1 = new SimpleLogger({ level: 'info', logFile: '/test/log1.log' });
      const logger2 = new SimpleLogger({ level: 'debug', logFile: '/test/log2.log' });

      logger1.info('Message 1');
      logger2.debug('Message 2');

      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        '/test/log1.log',
        expect.any(String)
      );
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        '/test/log2.log',
        expect.any(String)
      );
    });
  });

  describe('并发安全性', () => {
    it('应该能够安全地并发记录日志', async () => {
      const promises = [];

      for (let i = 0; i < 100; i++) {
        promises.push(
          new Promise(resolve => {
            setImmediate(() => {
              logger.info(`Concurrent log ${i}`);
              resolve(undefined);
            });
          })
        );
      }

      await Promise.all(promises);

      expect(consoleInfoSpy).toHaveBeenCalled();
    });
  });
});

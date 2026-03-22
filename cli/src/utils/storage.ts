/**
 * 数据持久化系统
 * 提供交易历史的保存、加载和统计功能
 */

import * as fs from 'fs';
import * as path from 'path';
import type { TradeResult } from '../types-auto';

/**
 * 交易记录接口（包含时间戳）
 */
interface TradeRecord extends TradeResult {
  savedAt: number;
  timestamp?: number;
}

/**
 * 统计信息接口
 */
export interface TradeStats {
  total: number;
  successful: number;
  failed: number;
  totalAmount: number;
  totalProfit: number;
  avgProfit: number;
  winRate: number;
}

/**
 * 交易存储类
 */
export class TradeStorage {
  private storageDir: string;
  private tradesFile: string;
  private maxRecords: number;

  constructor(storageDir: string = 'data', maxRecords: number = 10000) {
    this.storageDir = path.join(process.cwd(), storageDir);
    this.tradesFile = path.join(this.storageDir, 'trades.json');
    this.maxRecords = maxRecords;
    this.ensureDir();
  }

  /**
   * 确保存储目录存在
   */
  private ensureDir(): void {
    try {
      if (!fs.existsSync(this.storageDir)) {
        fs.mkdirSync(this.storageDir, { recursive: true });
      }
    } catch (err) {
      console.error('创建存储目录失败:', err);
      throw err;
    }
  }

  /**
   * 保存交易记录
   */
  async save(trade: TradeResult): Promise<void> {
    try {
      let trades = this.loadTrades();

      // 添加时间戳
      const record: TradeRecord = {
        ...trade,
        savedAt: Date.now(),
        timestamp: (trade as any).timestamp || Date.now()
      };

      trades.push(record);

      // 限制历史记录数量
      if (trades.length > this.maxRecords) {
        trades = trades.slice(-this.maxRecords);
      }

      // 写入文件
      fs.writeFileSync(this.tradesFile, JSON.stringify(trades, null, 2), 'utf8');
    } catch (err) {
      console.error('保存交易记录失败:', err);
      throw err;
    }
  }

  /**
   * 批量保存交易记录
   */
  async saveBatch(trades: TradeResult[]): Promise<void> {
    try {
      let allTrades = this.loadTrades();

      // 添加时间戳
      const records: TradeRecord[] = trades.map(trade => ({
        ...trade,
        savedAt: Date.now(),
        timestamp: (trade as any).timestamp || Date.now()
      }));

      allTrades.push(...records);

      // 限制历史记录数量
      if (allTrades.length > this.maxRecords) {
        allTrades = allTrades.slice(-this.maxRecords);
      }

      // 写入文件
      fs.writeFileSync(this.tradesFile, JSON.stringify(allTrades, null, 2), 'utf8');
    } catch (err) {
      console.error('批量保存交易记录失败:', err);
      throw err;
    }
  }

  /**
   * 加载所有交易记录
   */
  loadTrades(): TradeRecord[] {
    try {
      if (fs.existsSync(this.tradesFile)) {
        const data = fs.readFileSync(this.tradesFile, 'utf8');
        const trades = JSON.parse(data) as TradeRecord[];
        return Array.isArray(trades) ? trades : [];
      }
    } catch (err) {
      console.error('加载交易历史失败:', err);
    }
    return [];
  }

  /**
   * 获取最近的交易记录
   */
  getRecentTrades(limit: number = 100): TradeRecord[] {
    const trades = this.loadTrades();
    return trades.slice(-limit);
  }

  /**
   * 根据条件筛选交易记录
   */
  filterTrades(predicate: (trade: TradeRecord) => boolean): TradeRecord[] {
    const trades = this.loadTrades();
    return trades.filter(predicate);
  }

  /**
   * 获取指定时间范围的交易记录
   */
  getTradesInTimeRange(startTime: number, endTime: number): TradeRecord[] {
    return this.filterTrades(trade => {
      const tradeTime = trade.timestamp || trade.savedAt;
      return tradeTime >= startTime && tradeTime <= endTime;
    });
  }

  /**
   * 获取今日交易记录
   */
  getTodayTrades(): TradeRecord[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startTime = today.getTime();
    const endTime = startTime + 24 * 60 * 60 * 1000;

    return this.getTradesInTimeRange(startTime, endTime);
  }

  /**
   * 获取统计信息
   */
  getStats(): TradeStats {
    const trades = this.loadTrades();

    if (trades.length === 0) {
      return {
        total: 0,
        successful: 0,
        failed: 0,
        totalAmount: 0,
        totalProfit: 0,
        avgProfit: 0,
        winRate: 0
      };
    }

    const successful = trades.filter(t => t.success);
    const failed = trades.filter(t => !t.success);
    const totalAmount = trades.reduce((sum, t) => sum + (t.amount || 0), 0);

    // 计算盈亏统计
    const profitTrades = successful.filter(t => t.profit !== undefined);
    const totalProfit = profitTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const avgProfit = profitTrades.length > 0 ? totalProfit / profitTrades.length : 0;

    // 计算胜率（盈利的交易 / 总的成功交易）
    const winningTrades = profitTrades.filter(t => (t.profit || 0) > 0).length;
    const winRate = successful.length > 0 ? (winningTrades / successful.length) * 100 : 0;

    return {
      total: trades.length,
      successful: successful.length,
      failed: failed.length,
      totalAmount,
      totalProfit,
      avgProfit,
      winRate
    };
  }

  /**
   * 获取指定股票的交易统计
   */
  getStatsByCode(code: string): TradeStats {
    const trades = this.filterTrades(t => (t as any).code === code);

    if (trades.length === 0) {
      return {
        total: 0,
        successful: 0,
        failed: 0,
        totalAmount: 0,
        totalProfit: 0,
        avgProfit: 0,
        winRate: 0
      };
    }

    const successful = trades.filter(t => t.success);
    const failed = trades.filter(t => !t.success);
    const totalAmount = trades.reduce((sum, t) => sum + (t.amount || 0), 0);

    const profitTrades = successful.filter(t => t.profit !== undefined);
    const totalProfit = profitTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const avgProfit = profitTrades.length > 0 ? totalProfit / profitTrades.length : 0;

    const winningTrades = profitTrades.filter(t => (t.profit || 0) > 0).length;
    const winRate = successful.length > 0 ? (winningTrades / successful.length) * 100 : 0;

    return {
      total: trades.length,
      successful: successful.length,
      failed: failed.length,
      totalAmount,
      totalProfit,
      avgProfit,
      winRate
    };
  }

  /**
   * 清除所有交易记录
   */
  clearAll(): void {
    try {
      if (fs.existsSync(this.tradesFile)) {
        fs.unlinkSync(this.tradesFile);
      }
    } catch (err) {
      console.error('清除交易记录失败:', err);
      throw err;
    }
  }

  /**
   * 清除指定时间之前的记录
   */
  clearBefore(timestamp: number): void {
    try {
      const trades = this.loadTrades();
      const filtered = trades.filter(t => {
        const tradeTime = t.timestamp || t.savedAt;
        return tradeTime >= timestamp;
      });

      fs.writeFileSync(this.tradesFile, JSON.stringify(filtered, null, 2), 'utf8');
    } catch (err) {
      console.error('清除历史记录失败:', err);
      throw err;
    }
  }

  /**
   * 导出交易记录为 CSV
   */
  exportToCSV(filePath?: string): string {
    const trades = this.loadTrades();
    const outputFile = filePath || path.join(this.storageDir, 'trades_export.csv');

    // CSV 头部
    const headers = ['时间', '成功', '合同编号', '股票代码', '金额', '盈亏', '错误'];

    // CSV 数据行
    const rows = trades.map(t => [
      new Date(t.timestamp || t.savedAt).toLocaleString('zh-CN'),
      t.success ? '是' : '否',
      t.htbh || '',
      (t as any).code || '',
      (t.amount || 0).toString(),
      (t.profit || 0).toString(),
      t.error || ''
    ]);

    // 组合 CSV 内容
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // 写入文件
    fs.writeFileSync(outputFile, csvContent, 'utf8');

    return outputFile;
  }

  /**
   * 获取存储文件路径
   */
  getStoragePath(): string {
    return this.tradesFile;
  }

  /**
   * 获取存储目录路径
   */
  getStorageDir(): string {
    return this.storageDir;
  }
}

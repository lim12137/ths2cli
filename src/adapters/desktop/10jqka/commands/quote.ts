/**
 * 行情命令
 * 支持实时行情、K线、选股等功能
 */

import { DesktopCommand } from '@/sdk/adapters';
import { TenjqkaAdapter } from '../index';
import {
  TenjqkaQuoteData,
  TenjqkaKlineData,
  TenjqkaBlockData,
} from '../types';

export class QuoteCommand extends DesktopCommand {
  name = 'quote';
  description = '获取实时行情数据';

  adapter: TenjqkaAdapter;

  constructor(adapter: TenjqkaAdapter) {
    super();
    this.adapter = adapter;
  }

  /**
   * 获取实时行情
   * @param code 股票代码，支持单个或多个（逗号分隔）
   * @returns 行情数据
   */
  async getQuote(code: string | string[]): Promise<Record<string, TenjqkaQuoteData>> {
    const codes = Array.isArray(code) ? code.join(',') : code;
    const url = `http://${this.adapter.bridgeServer.host}:${this.adapter.bridgeServer.port}/quote?code=${encodeURIComponent(codes)}`;
    const response = await this.adapter.httpGet(url);
    return JSON.parse(response);
  }

  /**
   * 获取单个股票的现价
   * @param code 股票代码
   * @returns 现价
   */
  async getPrice(code: string): Promise<number> {
    const quote = await this.getQuote(code);
    return quote[code]?.price || 0;
  }

  /**
   * 获取K线数据
   * @param code 股票代码
   * @param period 周期（分钟）：1=1分钟, 5=5分钟, 60=1小时, 1440=日线, 10080=周线
   * @param length 数据条数
   * @param fuquan 复权类型：0=除权, 1=前复权, 2=后复权
   * @returns K线数据
   */
  async getKline(
    code: string,
    period: number = 1440,
    length: number = 5,
    fuquan: number = 0
  ): Promise<Record<string, TenjqkaKlineData[]>> {
    const url = `http://${this.adapter.bridgeServer.host}:${this.adapter.bridgeServer.port}/kline?code=${encodeURIComponent(code)}&period=${period}&length=${length}`;
    const response = await this.adapter.httpGet(url);
    return JSON.parse(response);
  }

  /**
   * 获取日K线
   */
  async getDaily(code: string, length: number = 5): Promise<TenjqkaKlineData[]> {
    const kline = await this.getKline(code, 1440, length);
    return kline[code] || [];
  }

  /**
   * 获取分钟K线
   */
  async getMinute(code: string, length: number = 240): Promise<TenjqkaKlineData[]> {
    const kline = await this.getKline(code, 1, length);
    return kline[code] || [];
  }

  /**
   * 问财选股
   * @param query 问财查询语句，如："涨幅>5% 且 价格<20元"
   * @param type 证券类型：stock=股票, fund=基金, bond=债券, conbond=可转债
   * @returns 选股结果
   */
  async selectStock(
    query: string,
    type: 'stock' | 'fund' | 'bond' | 'conbond' = 'stock'
  ): Promise<any> {
    const url = `http://${this.adapter.bridgeServer.host}:${this.adapter.bridgeServer.port}/select_stock`;
    const response = await this.adapter.httpPost(url, { query, type });
    return JSON.parse(response);
  }

  /**
   * 获取自选股或自定义板块
   * @param name 板块名称，默认为"自选股"
   * @returns 板块成分股
   */
  async getBlock(name: string = '自选股'): Promise<TenjqkaBlockData> {
    const url = `http://${this.adapter.bridgeServer.host}:${this.adapter.bridgeServer.port}/block?name=${encodeURIComponent(name)}`;
    const response = await this.adapter.httpGet(url);
    return JSON.parse(response);
  }

  /**
   * 获取自选股列表
   */
  async getSelfStock(): Promise<string[]> {
    const block = await this.getBlock('自选股');
    return block.zqdm || [];
  }

  /**
   * 批量获取行情
   * @param codes 股票代码数组
   * @returns 行情数据
   */
  async batchGetQuote(codes: string[]): Promise<Record<string, TenjqkaQuoteData>> {
    return await this.getQuote(codes);
  }

  /**
   * 获取涨停价
   */
  async getLimitUpPrice(code: string): Promise<number> {
    const quote = await this.getQuote(code);
    return quote[code]?.zt_p || 0;
  }

  /**
   * 获取跌停价
   */
  async getLimitDownPrice(code: string): Promise<number> {
    const quote = await this.getQuote(code);
    return quote[code]?.dt_p || 0;
  }

  /**
   * 判断是否涨停
   */
  async isLimitUp(code: string): Promise<boolean> {
    const quote = await this.getQuote(code);
    const price = quote[code]?.price || 0;
    const ztPrice = quote[code]?.zt_p || 0;
    return Math.abs(price - ztPrice) < 0.01;
  }

  /**
   * 判断是否跌停
   */
  async isLimitDown(code: string): Promise<boolean> {
    const quote = await this.getQuote(code);
    const price = quote[code]?.price || 0;
    const dtPrice = quote[code]?.dt_p || 0;
    return Math.abs(price - dtPrice) < 0.01;
  }

  /**
   * 获取涨幅
   */
  async getChangePercent(code: string): Promise<number> {
    const quote = await this.getQuote(code);
    return quote[code]?.zf || 0;
  }

  /**
   * 获取涨跌值
   */
  async getChangeValue(code: string): Promise<number> {
    const quote = await this.getQuote(code);
    return quote[code]?.zd || 0;
  }

  /**
   * 获取成交量
   */
  async getVolume(code: string): Promise<number> {
    const quote = await this.getQuote(code);
    return quote[code]?.volume || 0;
  }

  /**
   * 获取成交额
   */
  async getAmount(code: string): Promise<number> {
    const quote = await this.getQuote(code);
    return quote[code]?.amount || 0;
  }

  /**
   * 获取换手率
   */
  async getTurnoverRate(code: string): Promise<number> {
    const quote = await this.getQuote(code);
    return quote[code]?.hs || 0;
  }

  /**
   * 获取量比
   */
  async getVolumeRatio(code: string): Promise<number> {
    const quote = await this.getQuote(code);
    return quote[code]?.lb || 0;
  }

  /**
   * 获取总市值
   */
  async getMarketCap(code: string): Promise<number> {
    const quote = await this.getQuote(code);
    return quote[code]?.zsz || 0;
  }

  /**
   * 获取流通市值
   */
  async getFloatCap(code: string): Promise<number> {
    const quote = await this.getQuote(code);
    return quote[code]?.ltz || 0;
  }
}

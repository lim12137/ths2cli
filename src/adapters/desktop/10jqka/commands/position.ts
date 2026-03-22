/**
 * 持仓查询命令
 * 支持资金、持仓、委托查询
 */

import { DesktopCommand } from '@/sdk/adapters';
import { TenjqkaAdapter } from '../index';
import {
  TenjqkaMoneyData,
  TenjqkaPositionData,
  TenjqkaOrderData,
} from '../types';

export class PositionCommand extends DesktopCommand {
  name = 'position';
  description = '查询资金、持仓、委托等信息';

  adapter: TenjqkaAdapter;

  constructor(adapter: TenjqkaAdapter) {
    super();
    this.adapter = adapter;
  }

  /**
   * 获取资金数据
   */
  async getMoney(): Promise<TenjqkaMoneyData> {
    const url = `http://${this.adapter.bridgeServer.host}:${this.adapter.bridgeServer.port}/money`;
    const response = await this.adapter.httpGet(url);
    return JSON.parse(response);
  }

  /**
   * 获取资金余额
   */
  async getBalance(): Promise<number> {
    const money = await this.getMoney();
    return money.zjye || 0;
  }

  /**
   * 获取可用资金
   */
  async getAvailable(): Promise<number> {
    const money = await this.getMoney();
    return money.kyje || 0;
  }

  /**
   * 获取可取资金
   */
  async getWithdrawable(): Promise<number> {
    const money = await this.getMoney();
    return money.kqje || 0;
  }

  /**
   * 获取总资产
   */
  async getTotalAssets(): Promise<number> {
    const money = await this.getMoney();
    return money.zzc || 0;
  }

  /**
   * 获取总市值
   */
  async getMarketValue(): Promise<number> {
    const money = await this.getMoney();
    return money.zsz || 0;
  }

  /**
   * 获取持仓数据
   */
  async getPosition(): Promise<Record<string, TenjqkaPositionData>> {
    const url = `http://${this.adapter.bridgeServer.host}:${this.adapter.bridgeServer.port}/position`;
    const response = await this.adapter.httpGet(url);
    return JSON.parse(response);
  }

  /**
   * 获取持仓列表
   */
  async getPositionList(): Promise<TenjqkaPositionData[]> {
    const position = await this.getPosition();
    return Object.values(position);
  }

  /**
   * 获取指定股票的持仓
   */
  async getStockPosition(code: string): Promise<TenjqkaPositionData | null> {
    const position = await this.getPosition();
    return position[code] || null;
  }

  /**
   * 获取持仓股票代码列表
   */
  async getStockCodes(): Promise<string[]> {
    const position = await this.getPosition();
    return Object.keys(position);
  }

  /**
   * 判断是否持有某股票
   */
  async hasPosition(code: string): Promise<boolean> {
    const pos = await this.getStockPosition(code);
    return pos !== null && pos.sjsl > 0;
  }

  /**
   * 获取可用持仓数量
   */
  async getAvailableAmount(code: string): Promise<number> {
    const pos = await this.getStockPosition(code);
    return pos?.kyye || 0;
  }

  /**
   * 获取实际持仓数量
   */
  async getTotalAmount(code: string): Promise<number> {
    const pos = await this.getStockPosition(code);
    return pos?.sjsl || 0;
  }

  /**
   * 获取持仓成本价
   */
  async getCostPrice(code: string): Promise<number> {
    const pos = await this.getStockPosition(code);
    return pos?.cbj || 0;
  }

  /**
   * 获取持仓盈亏
   */
  async getProfit(code: string): Promise<number> {
    const pos = await this.getStockPosition(code);
    return pos?.yk || 0;
  }

  /**
   * 获取持仓市值
   */
  async getPositionValue(code: string): Promise<number> {
    const pos = await this.getStockPosition(code);
    return pos?.sz || 0;
  }

  /**
   * 计算持仓盈亏比例
   */
  async getProfitPercent(code: string): Promise<number> {
    const pos = await this.getStockPosition(code);
    if (!pos || pos.cbj === 0) return 0;

    const currentValue = pos.sjsl * pos.sj;
    const costValue = pos.sjsl * pos.cbj;
    return ((currentValue - costValue) / costValue) * 100;
  }

  /**
   * 获取委托数据（可撤委托）
   */
  async getOrders(): Promise<Record<string, TenjqkaOrderData[]>> {
    const url = `http://${this.adapter.bridgeServer.host}:${this.adapter.bridgeServer.port}/order`;
    const response = await this.adapter.httpGet(url);
    return JSON.parse(response);
  }

  /**
   * 获取委托列表
   */
  async getOrderList(): Promise<TenjqkaOrderData[]> {
    const orders = await this.getOrders();
    const list: TenjqkaOrderData[] = [];

    for (const code in orders) {
      list.push(...orders[code]);
    }

    return list;
  }

  /**
   * 获取指定股票的委托
   */
  async getStockOrders(code: string): Promise<TenjqkaOrderData[]> {
    const orders = await this.getOrders();
    return orders[code] || [];
  }

  /**
   * 获取未成交的委托
   */
  async getPendingOrders(): Promise<TenjqkaOrderData[]> {
    const allOrders = await this.getOrderList();
    return allOrders.filter(order =>
      order.bz === '未成交' || order.bz === '部分成交'
    );
  }

  /**
   * 获取已成交的委托
   */
  async getFilledOrders(): Promise<TenjqkaOrderData[]> {
    const allOrders = await this.getOrderList();
    return allOrders.filter(order => order.bz === '全部成交');
  }

  /**
   * 按方向获取委托
   */
  async getOrdersByDirection(direction: '买入' | '卖出'): Promise<TenjqkaOrderData[]> {
    const allOrders = await this.getOrderList();
    return allOrders.filter(order => order.cz === direction);
  }

  /**
   * 获取买单
   */
  async getBuyOrders(): Promise<TenjqkaOrderData[]> {
    return await this.getOrdersByDirection('买入');
  }

  /**
   * 获取卖单
   */
  async getSellOrders(): Promise<TenjqkaOrderData[]> {
    return await this.getOrdersByDirection('卖出');
  }

  /**
   * 计算持仓市值
   */
  async calculatePositionValue(): Promise<number> {
    const position = await this.getPosition();
    let totalValue = 0;

    for (const code in position) {
      totalValue += position[code].sz || 0;
    }

    return totalValue;
  }

  /**
   * 计算总盈亏
   */
  async calculateTotalProfit(): Promise<number> {
    const position = await this.getPosition();
    let totalProfit = 0;

    for (const code in position) {
      totalProfit += position[code].yk || 0;
    }

    return totalProfit;
  }

  /**
   * 计算仓位比例
   */
  async getPositionRatio(): Promise<number> {
    const money = await this.getMoney();
    const totalAssets = money.zzc || 0;
    const marketValue = money.zsz || 0;

    if (totalAssets === 0) return 0;
    return (marketValue / totalAssets) * 100;
  }

  /**
   * 获取账户摘要
   */
  async getAccountSummary(): Promise<{
    /** 总资产 */
    totalAssets: number;
    /** 总市值 */
    marketValue: number;
    /** 可用资金 */
    available: number;
    /** 资金余额 */
    balance: number;
    /** 持仓数量 */
    positionCount: number;
    /** 仓位比例 */
    positionRatio: number;
    /** 总盈亏 */
    totalProfit: number;
    /** 待成交委托数 */
    pendingOrders: number;
  }> {
    const money = await this.getMoney();
    const positionList = await this.getPositionList();
    const pendingOrders = await this.getPendingOrders();

    const totalAssets = money.zzc || 0;
    const marketValue = money.zsz || 0;

    return {
      totalAssets,
      marketValue,
      available: money.kyje || 0,
      balance: money.zjye || 0,
      positionCount: positionList.length,
      positionRatio: totalAssets > 0 ? (marketValue / totalAssets) * 100 : 0,
      totalProfit: await this.calculateTotalProfit(),
      pendingOrders: pendingOrders.length,
    };
  }
}

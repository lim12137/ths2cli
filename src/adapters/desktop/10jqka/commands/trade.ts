/**
 * 交易命令
 * 支持买入、卖出、撤单等功能
 */

import { DesktopCommand } from '@/sdk/adapters';
import { TenjqkaAdapter } from '../index';
import {
  TenjqkaTradeResult,
  TenjqkaOrderStatus,
  TenjqkaPriceType,
} from '../types';

export class TradeCommand extends DesktopCommand {
  name = 'trade';
  description = '执行交易操作（买入/卖出/撤单）';

  adapter: TenjqkaAdapter;

  constructor(adapter: TenjqkaAdapter) {
    super();
    this.adapter = adapter;
  }

  /**
   * 买入股票
   * @param code 股票代码
   * @param price 价格类型或具体价格
   * @param amount 数量
   * @param options 选项
   * @returns 交易结果
   */
  async buy(
    code: string,
    price: number | TenjqkaPriceType,
    amount: number,
    options: {
      /** 不弹出确认框（用于条件单） */
      notip?: boolean;
      /** 按金额买入（元） */
      money?: number;
      /** 买入可用仓位（如 1/3 表示买1/3仓位） */
      position?: string;
      /** 买入到目标仓位 */
      targetPosition?: string;
    } = {}
  ): Promise<TenjqkaTradeResult> {
    let cmd = `buy ${code}`;

    // 处理价格
    if (typeof price === 'number') {
      cmd += ` ${price}`;
    } else {
      cmd += ` ${price}`;
    }

    // 处理数量/金额/仓位
    if (options.money) {
      cmd += ` -m ${options.money}`;
    } else if (options.position) {
      cmd += ` -cw ${options.position}`;
    } else if (options.targetPosition) {
      cmd += ` -zcw ${options.targetPosition}`;
    } else {
      cmd += ` ${amount}`;
    }

    // 是否不弹框
    if (options.notip) {
      cmd += ' -notip';
    }

    return await this.executeCommand(cmd);
  }

  /**
   * 卖出股票
   * @param code 股票代码
   * @param price 价格类型或具体价格
   * @param amount 数量
   * @param options 选项
   * @returns 交易结果
   */
  async sell(
    code: string,
    price: number | TenjqkaPriceType,
    amount: number,
    options: {
      /** 不弹出确认框 */
      notip?: boolean;
      /** 按金额卖出（元） */
      money?: number;
      /** 卖出到目标仓位 */
      targetPosition?: string;
    } = {}
  ): Promise<TenjqkaTradeResult> {
    let cmd = `sell ${code}`;

    // 处理价格
    if (typeof price === 'number') {
      cmd += ` ${price}`;
    } else {
      cmd += ` ${price}`;
    }

    // 处理数量/金额/仓位
    if (options.money) {
      cmd += ` -m ${options.money}`;
    } else if (options.targetPosition) {
      cmd += ` -zcw ${options.targetPosition}`;
    } else {
      cmd += ` ${amount}`;
    }

    // 是否不弹框
    if (options.notip) {
      cmd += ' -notip';
    }

    return await this.executeCommand(cmd);
  }

  /**
   * 撤单
   * @param options 撤单选项
   * @returns 交易结果
   */
  async cancel(options: {
    /** 合同编号 */
    htbh?: string;
    /** 股票代码 */
    code?: string;
    /** 方向：buy=买单, sell=卖单 */
    direction?: 'buy' | 'sell';
    /** 全部撤单 */
    all?: boolean;
    /** 撤最后一条 */
    last?: boolean;
  } = {}): Promise<TenjqkaTradeResult> {
    let cmd = 'cancel';

    if (options.htbh) {
      cmd += ` -h ${options.htbh}`;
    } else if (options.code) {
      cmd += ` ${options.code}`;
      if (options.direction) {
        cmd += ` ${options.direction}`;
      }
    } else if (options.all) {
      cmd += ' all';
    } else if (options.last) {
      cmd += ' last';
    } else {
      cmd += ' all'; // 默认全撤
    }

    return await this.executeCommand(cmd);
  }

  /**
   * 按合同编号撤单
   */
  async cancelByHtbh(htbh: string): Promise<TenjqkaTradeResult> {
    return await this.cancel({ htbh });
  }

  /**
   * 撤销某股票的所有委托
   */
  async cancelByCode(code: string): Promise<TenjqkaTradeResult> {
    return await this.cancel({ code });
  }

  /**
   * 撤销某股票的所有买单
   */
  async cancelBuy(code: string): Promise<TenjqkaTradeResult> {
    return await this.cancel({ code, direction: 'buy' });
  }

  /**
   * 撤销某股票的所有卖单
   */
  async cancelSell(code: string): Promise<TenjqkaTradeResult> {
    return await this.cancel({ code, direction: 'sell' });
  }

  /**
   * 全部撤单
   */
  async cancelAll(): Promise<TenjqkaTradeResult> {
    return await this.cancel({ all: true });
  }

  /**
   * 以最新价买入
   */
  async buyAtLatest(code: string, amount: number, notip: boolean = true): Promise<TenjqkaTradeResult> {
    return await this.buy(code, TenjqkaPriceType.Latest, amount, { notip });
  }

  /**
   * 以涨停价买入
   */
  async buyAtLimitUp(code: string, amount: number, notip: boolean = true): Promise<TenjqkaTradeResult> {
    return await this.buy(code, TenjqkaPriceType.LimitUp, amount, { notip });
  }

  /**
   * 以跌停价买入
   */
  async buyAtLimitDown(code: string, amount: number, notip: boolean = true): Promise<TenjqkaTradeResult> {
    return await this.buy(code, TenjqkaPriceType.LimitDown, amount, { notip });
  }

  /**
   * 以对手价买入（卖一价）
   */
  async buyAtOpponent(code: string, amount: number, notip: boolean = true): Promise<TenjqkaTradeResult> {
    return await this.buy(code, TenjqkaPriceType.Opponent1, amount, { notip });
  }

  /**
   * 以最新价卖出
   */
  async sellAtLatest(code: string, amount: number, notip: boolean = true): Promise<TenjqkaTradeResult> {
    return await this.sell(code, TenjqkaPriceType.Latest, amount, { notip });
  }

  /**
   * 以涨停价卖出
   */
  async sellAtLimitUp(code: string, amount: number, notip: boolean = true): Promise<TenjqkaTradeResult> {
    return await this.sell(code, TenjqkaPriceType.LimitUp, amount, { notip });
  }

  /**
   * 以跌停价卖出
   */
  async sellAtLimitDown(code: string, amount: number, notip: boolean = true): Promise<TenjqkaTradeResult> {
    return await this.sell(code, TenjqkaPriceType.LimitDown, amount, { notip });
  }

  /**
   * 以对手价卖出（买一价）
   */
  async sellAtOpponent(code: string, amount: number, notip: boolean = true): Promise<TenjqkaTradeResult> {
    return await this.sell(code, TenjqkaPriceType.Opponent1, amount, { notip });
  }

  /**
   * 按金额买入
   */
  async buyByMoney(code: string, money: number, price: TenjqkaPriceType = TenjqkaPriceType.Opponent1): Promise<TenjqkaTradeResult> {
    return await this.buy(code, price, 0, { money });
  }

  /**
   * 按金额卖出
   */
  async sellByMoney(code: string, money: number, price: TenjqkaPriceType = TenjqkaPriceType.Opponent1): Promise<TenjqkaTradeResult> {
    return await this.sell(code, price, 0, { money });
  }

  /**
   * 买入到目标仓位
   */
  async buyToPosition(code: string, targetPosition: string, price: TenjqkaPriceType = TenjqkaPriceType.Opponent1): Promise<TenjqkaTradeResult> {
    return await this.buy(code, price, 0, { targetPosition });
  }

  /**
   * 卖出到目标仓位
   */
  async sellToPosition(code: string, targetPosition: string, price: TenjqkaPriceType = TenjqkaPriceType.Opponent1): Promise<TenjqkaTradeResult> {
    return await this.sell(code, price, 0, { targetPosition });
  }

  /**
   * 等待订单状态更新
   * @param ret 交易结果
   * @param status 期望状态
   * @param timeout 超时时间（秒）
   * @returns 是否成功
   */
  async waitUpdate(
    ret: TenjqkaTradeResult,
    status: TenjqkaOrderStatus | TenjqkaOrderStatus[],
    timeout: number = 10
  ): Promise<boolean> {
    const startTime = Date.now();
    const statuses = Array.isArray(status) ? status : [status];

    while (Date.now() - startTime < timeout * 1000) {
      // 查询订单状态
      const order = await this.adapter.commands.position.getOrders();

      if (ret.htbh && order[ret.htbh]) {
        const currentStatus = order[ret.htbh].bz;

        for (const s of statuses) {
          if (this.statusMatch(currentStatus, s)) {
            return true;
          }
        }
      }

      await this.sleep(500); // 轮询间隔500ms
    }

    return false;
  }

  /**
   * 执行交易命令
   */
  private async executeCommand(cmd: string): Promise<TenjqkaTradeResult> {
    const url = `http://${this.adapter.bridgeServer.host}:${this.adapter.bridgeServer.port}/cmd`;
    const response = await this.adapter.httpPost(url, { cmd });
    return JSON.parse(response);
  }

  /**
   * 匹配订单状态
   */
  private statusMatch(bz: string, status: TenjqkaOrderStatus): boolean {
    const statusMap: Record<string, TenjqkaOrderStatus> = {
      '未成交': TenjqkaOrderStatus.submitted,
      '部分成交': TenjqkaOrderStatus.dealing,
      '全部成交': TenjqkaOrderStatus.dealed,
      '已撤': TenjqkaOrderStatus.canceled,
      '废单': TenjqkaOrderStatus.inactive,
    };

    const mapped = statusMap[bz];
    return mapped === status;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

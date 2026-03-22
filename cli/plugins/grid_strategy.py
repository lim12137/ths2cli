#!/usr/bin/env python3
"""
网格交易策略插件
在设定的价格区间内，按固定间隔分批买入卖出
"""

import sys
import json
import time


class GridStrategy:
    def __init__(self):
        self.id = 'plugin_grid'
        self.name = '网格交易策略'
        self.version = '1.0.0'
        self.config = None

    def init(self, config):
        """初始化插件"""
        self.config = config
        self.base_price = config.get('base_price', 10.00)
        self.grid_spacing = config.get('grid_spacing', 0.10)
        self.grid_levels = config.get('grid_levels', 10)
        self.amount_per_level = config.get('amount_per_level', 1000)

        # 计算网格线
        self.grid_lines = []
        for i in range(self.grid_levels):
            price = self.base_price - (self.grid_levels // 2) * self.grid_spacing + i * self.grid_spacing
            self.grid_lines.append(price)

        print(f"✓ {self.name} 插件初始化完成")
        print(f"  基准价格: {self.base_price}")
        print(f"  网格间距: {self.grid_spacing}")
        print(f"  网格层数: {self.grid_levels}")

    def check(self, context):
        """检查是否满足交易条件"""
        try:
            # 获取当前价格
            quote = context.get_quote('600000')
            current_price = quote.get('price', 0)

            if current_price == 0:
                return False

            # 检查是否触及网格线
            for i, grid_price in enumerate(self.grid_lines):
                if abs(current_price - grid_price) < 0.01:
                    # 获取持仓
                    position = context.get_position()
                    has_position = position.get('600000', {}).get('sz', 0) > 0

                    # 下半网格买入，上半网格卖出
                    if i < self.grid_levels // 2 and not has_position:
                        return True
                    elif i >= self.grid_levels // 2 and has_position:
                        return True

            return False

        except Exception as e:
            print(f"策略检查失败: {e}")
            return False

    def execute(self, context):
        """执行交易"""
        try:
            quote = context.get_quote('600000')
            current_price = quote.get('price', 0)

            position = context.get_position()
            has_position = position.get('600000', {}).get('sz', 0) > 0

            # 根据价格位置决定买入或卖出
            grid_index = int((current_price - self.base_price) / self.grid_spacing + self.grid_levels // 2)

            if grid_index < self.grid_levels // 2 and not has_position:
                # 买入
                print(f"网格买入: 价格 {current_price:.2f}, 金额 {self.amount_per_level}")
                context.buy('600000', self.amount_per_level, {'price_type': 'market'})

            elif grid_index >= self.grid_levels // 2 and has_position:
                # 卖出
                pos = position.get('600000', {})
                amount = pos.get('sz', 0)
                print(f"网格卖出: 价格 {current_price:.2f}, 数量 {amount}")
                context.sell('600000', amount, {'price_type': 'market'})

        except Exception as e:
            print(f"交易执行失败: {e}")

    def destroy(self):
        """销毁插件"""
        print(f"✓ {self.name} 插件已销毁")


def main():
    """主函数 - 处理标准输入输出"""
    plugin = GridStrategy()

    # 从命令行参数读取配置
    if len(sys.argv) > 1:
        try:
            config = json.loads(sys.argv[1])
            plugin.init(config)
        except json.JSONDecodeError as e:
            print(f"配置解析失败: {e}")
            sys.exit(1)

    # 监听标准输入的消息
    for line in sys.stdin:
        try:
            message = json.loads(line.strip())

            if message.get('type') == 'check':
                # 检查交易条件
                result = plugin.check(MockContext(plugin))
                response = {
                    'type': 'check_result',
                    'result': result
                }
                print(json.dumps(response))
                sys.stdout.flush()

            elif message.get('type') == 'execute':
                # 执行交易
                plugin.execute(MockContext(plugin))

        except json.JSONDecodeError:
            print(f"无法解析消息: {line}")
        except Exception as e:
            print(f"处理消息失败: {e}")


class MockContext:
    """模拟上下文对象（Python插件需要通过IPC与主进程通信）"""
    def __init__(self, plugin):
        self.plugin = plugin

    def get_quote(self, code):
        """获取行情（需要通过IPC请求主进程）"""
        # TODO: 实现IPC通信
        return {'price': 9.85}

    def get_position(self):
        """获取持仓"""
        return {'600000': {'sz': 0}}

    def buy(self, code, amount, options):
        """买入"""
        print(f'BUY: {code}, {amount}')

    def sell(self, code, amount, options):
        """卖出"""
        print(f'SELL: {code}, {amount}')


if __name__ == '__main__':
    main()

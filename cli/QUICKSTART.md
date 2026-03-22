# 快速开始指南

## 第一步：确保环境准备

### 1.1 检查Node.js环境

```bash
node --version  # 应该 >= v18.0.0
npm --version
```

### 1.2 检查Python环境（可选，如需使用Python插件）

```bash
python --version  # 应该 >= v3.7
```

### 1.3 确保同花顺交易客户端正在运行

---

## 第二步：安装依赖

```bash
cd cli
npm install
```

---

## 第三步：编译项目

```bash
npm run build
```

编译成功后会在 `dist/` 目录生成JavaScript文件。

---

## 第四步：测试CLI工具

### 4.1 测试连接

```bash
# 启动桥接服务（需要先在同花顺目录下运行）
# 在另一个终端窗口：
python bridge_server.py

# 测试连接
node dist/cli.js test
```

如果看到 "✓ 连接成功"，说明一切正常。

### 4.2 测试查询命令

```bash
# 查询资金
node dist/cli.js query money

# 查询持仓
node dist/cli.js query position

# 查询委托
node dist/cli.js query orders

# 查询行情
node dist/cli.js market quote 600000
```

---

## 第五步：配置自动化交易系统

### 5.1 编辑配置文件

```bash
# 使用你喜欢的编辑器打开
code config/rules.yaml
```

### 5.2 启用示例规则

在 `rules.yaml` 中，将你想要的规则设置为 `enabled: true`：

```yaml
rules:
  - id: 'rule_001'
    name: '浦发银行价格买入'
    enabled: true  # 确保设置为 true
    condition:
      type: 'price'
      code: '600000'
      operator: '<'
      value: 9.80
    action:
      type: 'buy'
      amount_type: 'money'
      amount: 10000
```

### 5.3 配置安全参数

在同一文件中，找到 `safety` 部分：

```yaml
safety:
  funds:
    max_single_trade: 50000      # 根据你的资金调整
    max_daily_trade: 200000      # 根据你的风险偏好调整
    min_reserve: 10000           # 最小保留资金
```

---

## 第六步：启动自动化交易系统

### 6.1 测试模式启动

```bash
node dist/automation.js test
```

这会启动系统并显示日志，让你查看系统运行情况。

### 6.2 正式启动

```bash
node dist/automation.js start
```

系统会显示：

```
========================================
   同花顺自动化交易系统 v1.0.0
========================================

🚀 启动自动化交易调度器...
✓ 配置加载完成
✓ 已加载 4 条交易规则
✓ 已加载 2 个插件
🔍 启动规则监控，检查间隔: 5秒
🔍 启动插件监控，检查间隔: 5秒

✅ 系统启动成功！

💡 提示:
  - 按 Ctrl+C 停止系统
  - 查看日志文件: logs/trading.log
```

---

## 第七步：监控系统运行

### 7.1 查看实时日志

系统会在控制台输出实时日志：

```
📌 规则触发: 浦发银行价格买入 (rule_001)
💰 执行交易: BUY 600000 10000元
✅ 交易成功: 123456
```

### 7.2 查看日志文件

```bash
# 查看交易日志
cat logs/trading.log

# 查看通知日志
cat logs/notifications.log
```

### 7.3 停止系统

按 `Ctrl+C` 停止系统，系统会：

1. 停止规则监控
2. 停止插件监控
3. 清理所有插件
4. 保存统计数据

---

## 常见问题

### Q1: 编译失败怎么办？

```bash
# 清理并重新安装
rm -rf node_modules dist
npm install
npm run build
```

### Q2: 连接失败怎么办？

1. 确保同花顺交易客户端正在运行
2. 确保桥接服务已启动（`python bridge_server.py`）
3. 检查端口18888是否被占用

### Q3: 如何禁用某个规则？

编辑 `config/rules.yaml`，将对应规则的 `enabled` 设置为 `false`：

```yaml
- id: 'rule_001'
  enabled: false  # 禁用此规则
```

系统会在下次检查时自动重载配置。

### Q4: 如何开发自己的插件？

1. 复制 `plugins/template_plugin.js`
2. 修改实现逻辑
3. 在 `config/plugins.yaml` 中注册
4. 系统会自动加载

详细指南请参考 `README_AUTOMATION.md`

### Q5: 系统安全吗？

系统内置多重安全机制：

- ✅ 单笔交易限额
- ✅ 单日交易限额
- ✅ 最小保留资金
- ✅ 仓位限制
- ✅ 熔断机制

但请注意：
- ⚠️ 仅供学习研究使用
- ⚠️ 实盘交易需谨慎
- ⚠️ 建议先在模拟环境测试

---

## 下一步

1. **阅读文档**: 查看 `README_AUTOMATION.md` 了解详细功能
2. **自定义规则**: 编辑 `config/rules.yaml` 配置自己的交易策略
3. **开发插件**: 参考 `plugins/template_plugin.js` 开发自定义插件
4. **监控运行**: 定期查看日志和系统状态
5. **风险评估**: 根据自己的风险承受能力调整安全参数

---

## 获取帮助

- 📖 查看文档: `README_AUTOMATION.md`
- 📊 查看完成报告: `PROJECT_COMPLETION.md`
- 🐛 提交问题: GitHub Issues

---

**祝你交易顺利！** 📈

⚠️ **风险提示**: 自动化交易存在风险，请谨慎使用，建议先在模拟环境中充分测试。

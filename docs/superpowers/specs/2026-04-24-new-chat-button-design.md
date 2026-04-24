# 新建对话按钮设计

## 需求

在 Agent 聊天面板的 Header 上添加"新建对话"按钮，点击后清空聊天历史（上下文），但不重置 TODOs。

## 设计

### 位置
ChatContainer 展开面板的 Header 区域，标题右侧。

### 按钮样式
- 文本按钮："新建对话"
- 字号 12，颜色 `#007AFF`，hover 时加下划线
- 不显眼，不抢走状态文字的注意力

### 交互
- 点击 → `setMessages([])`，清空消息列表
- `setStatus('idle')`，重置 Agent 状态为"就绪"
- AgentCore 的 `messages` 数组通过 `useState` 的初始化函数在组件 mount 时创建，组件卸载/重建时才重置。所以需要 AgentCore 支持 reset，或重建 AgentCore 实例。

### 实现要点
由于 `AgentCore` 实例在组件首次 mount 时创建，对话历史存在实例内部：
1. **方案 1**：在 `AgentCore` 中添加 `resetMessages()` 方法，清空内部 `messages` 数组
2. **方案 2**：通过 `key` 重置整个 AgentCore 实例（让 React 重新创建实例）

推荐方案 1，更轻量。

### 修改文件
- `src/agent/core.ts`：添加 `resetMessages()` 公开方法
- `src/components/ChatContainer.tsx`：在 Header 添加按钮，点击调用 `agentRef.resetMessages()` 并 `setMessages([])`, `setStatus('idle')`

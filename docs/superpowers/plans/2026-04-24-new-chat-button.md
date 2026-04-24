# 新建对话按钮实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Agent 聊天面板 Header 添加"新建对话"按钮，点击清空聊天历史。

**Architecture:** 在 AgentCore 添加 resetMessages() 方法，ChatContainer 在按钮点击时同时清空 UI 消息状态并调用 AgentCore 的重置方法。

**Tech Stack:** React (useState), TypeScript, AgentCore class

---

### Task 1: AgentCore 添加 resetMessages() 方法

**Files:**
- Modify: `src/agent/core.ts`

- [ ] **Step 1: 添加 resetMessages 公开方法**

在 `AgentCore` 类中，在 `getMessages()` 方法后添加：

```typescript
resetMessages(): void {
  this.messages = []
}
```

- [ ] **Step 2: 提交**

```bash
git add src/agent/core.ts
git commit -m "feat: add resetMessages() to AgentCore"
```

---

### Task 2: ChatContainer Header 添加"新建对话"按钮

**Files:**
- Modify: `src/components/ChatContainer.tsx`

- [ ] **Step 1: 在 Header 添加按钮**

在 Header 的 div 中（`setExpanded(false)` 按钮之前）添加：

```tsx
<button
  onClick={(e) => {
    e.stopPropagation()
    agentRef?.resetMessages()
    setMessages([])
    setStatus('idle')
  }}
  style={{
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    color: '#007AFF',
    padding: '0 2px',
  }}
>
  新建对话
</button>
```

- [ ] **Step 2: 提交**

```bash
git add src/components/ChatContainer.tsx
git commit -m "feat: add new chat button to ChatContainer header"
```

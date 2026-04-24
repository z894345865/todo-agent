# Agent Tools 增强设计文档

> **Goal:** 增强 Agent Tools，使 `todo_update` 用 `id` 定位任务并支持修改任务名称，`todo_list` 返回结果中显示 `id`

## 1. 概述

当前 `todo_update` 使用 `text` 字段模糊匹配任务，存在重名冲突问题。同时 `todo_list` 不返回任务 `id`，导致 Agent 无法准确引用特定任务。

本次改动：
- `todo_update` 改用 `id` 定位任务，支持修改 `text` 名称
- `todo_list` 在返回结果中显示 `id`，方便 Agent 引用

## 2. 工具变更

### 2.1 `todo_update`

**变更前 Schema：**
```ts
{
  text: z.string(),  // 用 text 查找任务
  priority: z.enum(['high', 'medium', 'low']).optional(),
  dueDate: z.string().optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
}
```

**变更后 Schema：**
```ts
{
  id: z.string(),  // 用 id 定位任务（必填）
  text: z.string().optional(),        // 可选，修改任务名称
  priority: z.enum(['high', 'medium', 'low']).optional(),
  dueDate: z.string().optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
}
```

**说明：**
- `id` 必填，确保精确匹配
- `text` 从查找字段变为可修改字段
- 其他字段保持可选

### 2.2 `todo_list`

**变更：** 在返回结果中每行显示 `id`

**变更前返回格式：**
```
[x] 完成任务A | 优先级: high | 标签: 工作
[ ] 新任务B | 截止: 2024/1/1
```

**变更后返回格式：**
```
[id: abc-123] [x] 完成任务A | 优先级: high | 标签: 工作
[id: def-456] [ ] 新任务B | 截止: 2024/1/1
```

## 3. 其他工具一致性检查

以下工具仍使用 `text` 模糊匹配，应逐步统一为 `id` 引用：

| 工具 | 当前查找方式 | 建议 |
|------|------------|------|
| `todo_complete` | text 匹配 | 改为 id |
| `todo_uncomplete` | text 匹配 | 改为 id |
| `todo_delete` | text 匹配 | 改为 id |

**本次只改 `todo_update` 和 `todo_list`**，其他工具的改动可作为后续任务。

## 4. 文件变更

- `src/agent/tools.ts` — 修改 `todo_update` 和 `todo_list` 实现

## 5. 兼容性

- Agent 侧需要适配新的 `todo_update` 调用方式（传入 `id` 而非 `text` 定位）
- 现有 UI（`TodoEditModal`）不受影响，仍通过 store 操作
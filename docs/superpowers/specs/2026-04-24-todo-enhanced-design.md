# TODO 增强设计文档

> **Goal:** 为 TODO 添加优先级、标签（多对多）、截止日期、描述字段，AI 工具调用支持所有新字段，UI 同步更新。

## 1. 数据模型

### 1.1 Tag 表（新增）

```ts
interface Tag {
  id: string
  name: string       // 标签名，唯一
  color: string     // 预定义颜色 hex
}
```

**预定义 8 色板：**
```ts
const TAG_COLORS = [
  '#EF4444', // 红
  '#3B82F6', // 蓝
  '#22C55E', // 绿
  '#EAB308', // 黄
  '#F97316', // 橙
  '#A855F7', // 紫
  '#EC4899', // 粉
  '#06B6D4', // 青
]
```

### 1.2 TodoTag 关联表（新增）

```ts
interface TodoTag {
  todoId: string
  tagId: string
}
```

### 1.3 更新的 Todo 结构

```ts
interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: number
  completedAt?: number     // 联动：完成时自动写入
  priority?: 'high' | 'medium' | 'low'
  dueDate?: number        // timestamp
  description?: string
}
```

### 1.4 更新的 TodoStats

```ts
interface TodoStats {
  total: number
  completed: number
  completionRate: number
  weeklyCompleted: number
  priorityStats: {        // 新增
    high: number
    medium: number
    low: number
  }
  overdueCount: number     // 新增：已逾期且未完成的 TODO 数量
}
```

## 2. 数据库变更（IndexedDB）

**DB_VERSION 从 1 → 2**，upgrade 逻辑：
1. 创建 `tags` 对象仓库（keyPath: `id`）
2. 创建 `todo_tags` 对象仓库（keyPath: `[todoId, tagId]`）
3. 对现有 `todos` 对象仓库：**不迁移**，已有 TODO 的 tags 为空

## 3. Store / DB 层变更

### 3.1 新增 DB 函数

```ts
// src/db/index.ts
getAllTags(): Promise<Tag[]>
addTag(tag: Tag): Promise<void>
updateTag(tag: Tag): Promise<void>
deleteTag(id: string): Promise<void>
getTagsByTodo(todoId: string): Promise<Tag[]>
addTodoTag(todoId: string, tagId: string): Promise<void>
removeTodoTag(todoId: string, tagId: string): Promise<void>
getTodoTags(todoId: string): Promise<string[]>  // 返回 tagId[]
```

### 3.2 Store 变更

新增：
```ts
tags: Tag[]
addTag(name: string, color: string): Promise<void>
updateTag(id: string, name: string, color: string): Promise<void>
deleteTag(id: string): Promise<void>
getTagsByTodo(todoId: string): Promise<Tag[]>
addTagToTodo(todoId: string, tagId: string): Promise<void>
removeTagFromTodo(todoId: string, tagId: string): Promise<void>
```

`add(todo)` 签名不变（不传 tags），`create_todo` 工具会处理关联。

## 4. Agent Tools 变更

### 4.1 todo_create（更新）

```ts
todo_create: {
  name: 'todo_create',
  description: 'Create a new TODO item',
  inputSchema: z.object({
    text: z.string(),
    priority: z.enum(['high', 'medium', 'low']).optional(),
    dueDate: z.string().optional(),       // ISO date string, e.g. "2026-05-01"
    tags: z.array(z.string()).optional(), // tag names
    description: z.string().optional(),
  }),
  execute: async (input) => {
    // 1. 创建 TODO（存储 priority, dueDate, description）
    // 2. 如果有 tags，对每个 tag name：
    //    - 查已存在 tag → 用其 id
    //    - 不存在 → 自动创建（随机选颜色）→ 用新 id
    // 3. 建立 TodoTag 关联
    // 4. 返回创建结果（含优先级/标签等信息）
  }
}
```

### 4.2 todo_update（新增）

```ts
todo_update: {
  name: 'todo_update',
  description: 'Update TODO fields (priority, dueDate, tags, description)',
  inputSchema: z.object({
    text: z.string(),              // 用于查找 TODO
    priority: z.enum(['high', 'medium', 'low']).optional(),
    dueDate: z.string().optional(),
    tags: z.array(z.string()).optional(),  // 新的完整 tag 列表
    description: z.string().optional(),
  }),
  execute: async (input) => {
    // 1. 通过 text 查找 TODO
    // 2. 更新对应字段
    // 3. tags 数组为全量替换：删除旧关联，建立新关联
    // 4. 返回更新结果
  }
}
```

### 4.3 tag_create（新增）

```ts
tag_create: {
  name: 'tag_create',
  description: 'Create a new tag',
  inputSchema: z.object({
    name: z.string(),
    color: z.string().optional(),  // 不传则随机选一个
  }),
  execute: async (input) => {
    // 1. 检查 name 是否已存在 → 存在则报错
    // 2. 创建 tag
    // 3. 返回 tag 信息
  }
}
```

### 4.4 tag_delete（新增）

```ts
tag_delete: {
  name: 'tag_delete',
  description: 'Delete a tag (removes from all todos)',
  inputSchema: z.object({ name: z.string() }),
  execute: async (input) => {
    // 1. 查找 tag
    // 2. 删除所有关联的 TodoTag
    // 3. 删除 Tag 记录
    // 4. 返回结果
  }
}
```

### 4.5 todo_list（更新）

```ts
todo_list: {
  // 新增返回 tags 数组（tag 对象全量）
  // 输出格式更新为：
  // [x] 买牛奶 | 优先级: 高 | 标签: 生活,购物 | 截止: 2026-05-01
}
```

## 5. UI 变更

### 5.1 标签管理入口

在 StatsPanel 下方添加「管理标签」按钮，点击弹出标签管理弹窗（创建/编辑/删除标签）。

### 5.2 TodoInput 增强

新增字段：
- **优先级选择**：三个按钮（高🟥 / 中🟨 / 低🟩），默认不选
- **截止日期**：日期输入框
- **标签选择**：多选下拉，显示所有已有标签，支持「创建新标签」
- **描述**：单行文本框

### 5.3 TodoItem 增强

显示：
- 优先级图标（高/中/低）
- 标签 Badge（彩色小标签）
- 截止日期（如果有），逾期显示红色 + "已逾期"
- 描述（如果有用灰色小字显示）
- 完成日期（completedAt）

hover 时显示编辑按钮，点击可编辑所有字段。

### 5.4 StatsPanel 增强

新增两行统计：
- 优先级：高X / 中X / 低X
- 逾期：X 项已逾期

### 5.5 新增组件

| 组件 | 用途 |
|------|------|
| `TagBadge` | 彩色小标签展示 |
| `TagSelector` | 多选下拉 + 创建新标签 |
| `TagManager` | 弹窗：创建/编辑/删除标签 |
| `PrioritySelector` | 高/中/低按钮组 |
| `EnhancedTodoItem` | 整合所有新字段的 TODO 项 |

## 6. 文件变更清单

**新建：**
- `src/db/index.ts` — 新增 Tag 相关函数（getAllTags, addTag, updateTag, deleteTag, getTagsByTodo, addTodoTag, removeTodoTag）
- `src/components/TagBadge.tsx`
- `src/components/TagSelector.tsx`
- `src/components/TagManager.tsx`
- `src/components/PrioritySelector.tsx`
- `src/components/EnhancedTodoItem.tsx`（或合并到 TodoItem.tsx）

**修改：**
- `src/types/index.ts` — 新增 Tag, TodoTag 类型，更新 TodoStats
- `src/db/index.ts` — DB_VERSION 升级，upgrade 逻辑
- `src/store/index.ts` — 新增 tag 状态和相关操作
- `src/agent/tools.ts` — 更新 todo_create, todo_list；新增 todo_update, tag_create, tag_delete
- `src/components/TodoInput.tsx` — 新增优先级/截止日期/标签/描述输入
- `src/components/TodoItem.tsx` — 显示所有新字段
- `src/components/StatsPanel.tsx` — 显示优先级和逾期统计
- `src/components/ChatContainer.tsx` — 无变更（已有浮动组件）

## 7. 错误处理

- 标签名重复：`tag_create` 返回错误 "标签已存在"
- TODO 未找到：`todo_update` / `todo_complete` 等返回 "未找到匹配的 TODO"
- 逾期判断：仅比较 dueDate 和 Date.now()，不考虑时区
- 工具参数校验失败：Zod 验证错误直接返回给 LLM

## 8. 迁移策略

- DB VERSION 1 → 2，upgrade 时创建新对象仓库，不迁移旧数据
- 已有 TODO 的 priority/dueDate/description/tags 均为 undefined
- 旧 text 字段不做自动解析（按你的选择：保留为空标签）

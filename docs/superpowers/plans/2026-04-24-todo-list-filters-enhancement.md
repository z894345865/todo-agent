# todo_list 筛选功能增强实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 `todo_list` 补充完整筛选参数（priority, tags, overdue, dueDate range, completedDate range）

**Architecture:** 修改 `src/agent/tools.ts` 中 `todo_list` 的 `inputSchema` 和 `execute` 函数，筛选逻辑与 TodoTable UI 对齐

**Tech Stack:** TypeScript, Zod, Zustand

---

## Task 1: 更新 `todo_list` 工具

**Files:**
- Modify: `src/agent/tools.ts:152-181`

### Step 1: 更新 `todo_list` 的 `inputSchema`

**变更前：**
```ts
inputSchema: z.object({ status: z.string().optional() }),
```

**变更后：**
```ts
inputSchema: z.object({
  status: z.enum(['all', 'active', 'completed']).optional(),
  priority: z.enum(['all', 'high', 'medium', 'low']).optional(),
  tags: z.array(z.string()).optional(),
  overdue: z.enum(['all', 'yes', 'no']).optional(),
  dueDateStart: z.string().optional(),
  dueDateEnd: z.string().optional(),
  completedDateStart: z.string().optional(),
  completedDateEnd: z.string().optional(),
}),
```

### Step 2: 更新 `execute` 函数中的参数解析和筛选逻辑

**变更前 execute 函数参数解析：**
```ts
const { status } = input as { status?: string }
```

**变更后 execute 函数参数解析：**
```ts
const { status, priority, tags, overdue, dueDateStart, dueDateEnd, completedDateStart, completedDateEnd } = input as {
  status?: 'all' | 'active' | 'completed'
  priority?: 'all' | 'high' | 'medium' | 'low'
  tags?: string[]
  overdue?: 'all' | 'yes' | 'no'
  dueDateStart?: string
  dueDateEnd?: string
  completedDateStart?: string
  completedDateEnd?: string
}
```

### Step 3: 添加筛选逻辑

在 `execute` 函数中，遍历 todos 之前添加：

```ts
const now = Date.now()

// status 筛选
if (status === 'active') {
  todos = todos.filter((t: any) => !t.completed)
} else if (status === 'completed') {
  todos = todos.filter((t: any) => t.completed)
}

// priority 筛选
if (priority && priority !== 'all') {
  todos = todos.filter((t: any) => t.priority === priority)
}

// tags 筛选 (AND 逻辑)
if (tags && tags.length > 0) {
  const filtered: any[] = []
  for (const t of todos) {
    const tagIds = await db.getTodoTags(t.id)
    const todoTags = await db.getTagsByIds(tagIds)
    const todoTagNames = todoTags.map((tag: Tag) => tag.name)
    if (tags.every((tagName) => todoTagNames.includes(tagName))) {
      filtered.push(t)
    }
  }
  todos = filtered
}

// overdue 筛选
if (overdue === 'yes') {
  todos = todos.filter((t: any) => !t.completed && t.dueDate && t.dueDate < now)
} else if (overdue === 'no') {
  todos = todos.filter((t: any) => t.completed || !t.dueDate || t.dueDate >= now)
}

// dueDate 范围筛选
if (dueDateStart) {
  const start = new Date(dueDateStart).getTime()
  todos = todos.filter((t: any) => t.dueDate && t.dueDate >= start)
}
if (dueDateEnd) {
  const end = new Date(dueDateEnd).getTime() + 86400000
  todos = todos.filter((t: any) => t.dueDate && t.dueDate < end)
}

// completedDate 范围筛选
if (completedDateStart) {
  const start = new Date(completedDateStart).getTime()
  todos = todos.filter((t: any) => t.completedAt && t.completedAt >= start)
}
if (completedDateEnd) {
  const end = new Date(completedDateEnd).getTime() + 86400000
  todos = todos.filter((t: any) => t.completedAt && t.completedAt < end)
}
```

**注意：** `tags` 筛选需要查询数据库获取每个 todo 的标签，在循环中调用 `getTodoTags` 和 `getTagsByIds`，这会改变原有代码结构。

### Step 4: Build 验证

```bash
npm run build
```

预期：编译成功，无错误

### Step 5: Commit

```bash
git add src/agent/tools.ts
git commit -m "feat: todo_list supports full filters (priority, tags, overdue, date ranges)"
```
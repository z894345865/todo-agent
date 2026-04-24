# todo_list 工具筛选功能增强设计文档

> **Goal:** 为 `todo_list` 补充完整筛选参数，与 TodoTable UI 筛选功能对齐

## 1. 概述

当前 `todo_list` 仅支持 `status` 筛选（all/active/completed），缺少 UI 上已有的其他筛选维度。

本次新增筛选参数：priority、tags（数组）、overdue（含 all）、dueDateStart/End、completedDateStart/End。

## 2. Schema 变更

**变更前：**
```ts
inputSchema: z.object({ status: z.string().optional() })
```

**变更后：**
```ts
inputSchema: z.object({
  status: z.enum(['all', 'active', 'completed']).optional(),        // 默认 all
  priority: z.enum(['all', 'high', 'medium', 'low']).optional(),   // 默认 all
  tags: z.array(z.string()).optional(),                              // 标签列表，为空则不过滤，非空则任务包含所有这些标签
  overdue: z.enum(['all', 'yes', 'no']).optional(),                 // 默认 all
  dueDateStart: z.string().optional(),                               // 截止日期 >= 此值 (ISO date)
  dueDateEnd: z.string().optional(),                                 // 截止日期 <= 此值 (ISO date)
  completedDateStart: z.string().optional(),                         // 完成日期 >= 此值
  completedDateEnd: z.string().optional(),                           // 完成日期 <= 此值
})
```

## 3. 筛选逻辑

所有筛选条件为 **AND 组合** — 同时满足所有条件才返回。

| 参数 | 筛选规则 |
|------|---------|
| `status=active` | `t.completed === false` |
| `status=completed` | `t.completed === true` |
| `status=all` | 不过滤 |
| `priority=high/medium/low` | `t.priority === value` |
| `tags` | 默认为空列表 `[]`，不过滤；非空时任务必须拥有**所有**列表中的标签（AND 逻辑） |
| `overdue=all` | 不过滤 |
| `overdue=yes` | `!t.completed && t.dueDate && t.dueDate < now` |
| `overdue=no` | `!t.completed && t.dueDate && t.dueDate >= now`，或 `t.completed` |
| `dueDateStart` | `t.dueDate >= new Date(dueDateStart).getTime()` |
| `dueDateEnd` | `t.dueDate <= new Date(dueDateEnd).getTime() + 86400000`（包含当天） |
| `completedDateStart` | `t.completedAt >= new Date(completedDateStart).getTime()` |
| `completedDateEnd` | `t.completedAt <= new Date(completedDateEnd).getTime() + 86400000` |

## 4. 文件变更

- `src/agent/tools.ts` — 修改 `todo_list` 的 inputSchema 和 execute 函数

## 5. 默认值行为

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `status` | `all` | 不过滤 |
| `priority` | `all` | 不过滤 |
| `tags` | `[]` | 不过滤 |
| `overdue` | `all` | 不过滤 |
| `dueDateStart/dueDateEnd` | 无 | 不过滤；传了才生效 |
| `completedDateStart/completedDateEnd` | 无 | 不过滤；传了才生效 |

## 6. 向后兼容

- 不传任何参数时默认列出全部任务（与当前行为一致）
- 现有调用不受影响
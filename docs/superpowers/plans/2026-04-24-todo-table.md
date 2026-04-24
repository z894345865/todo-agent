# TODO 表格视图实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 TODO 列表从简单列表升级为带排序和筛选功能的表格视图，使用 @tanstack/react-table。

**Architecture:** 使用 @tanstack/react-table 的 useTable hook 定义列和数据，通过 SortingState 管理排序，手动实现筛选逻辑（AND 组合）。TodoEditModal 用现有组件（PrioritySelector、TagSelector）构建编辑表单。

**Tech Stack:** React, TypeScript, @tanstack/react-table, Zustand, idb

---

## Task 1: 安装依赖

**Files:**
- Modify: `package.json`

**Steps:**

- [ ] **Step 1: 安装 @tanstack/react-table**

Run: `cd /c/Users/89434/work/code/todo/todo-with-agent && npm install @tanstack/react-table`

- [ ] **Step 2: 验证安装**

Run: `npm run build 2>&1 | head -20`
Expected: 无新错误

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add @tanstack/react-table"
```

---

## Task 2: 创建 TodoEditModal 组件

**Files:**
- Create: `src/components/TodoEditModal.tsx`

**Steps:**

- [ ] **Step 1: 写组件代码**

```tsx
import { useState, useEffect } from 'react'
import { useTodoStore } from '../store'
import { db } from '../db'
import { PrioritySelector } from './PrioritySelector'
import { TagSelector } from './TagSelector'
import type { Tag, Priority } from '../types'

interface TodoEditModalProps {
  todoId: string
  onClose: () => void
}

export function TodoEditModal({ todoId, onClose }: TodoEditModalProps) {
  const store = useTodoStore((s) => s)
  const todo = store.todos.find((t) => t.id === todoId)

  const [text, setText] = useState(todo?.text ?? '')
  const [priority, setPriority] = useState<Priority | undefined>(todo?.priority)
  const [dueDate, setDueDate] = useState(
    todo?.dueDate ? new Date(todo.dueDate).toISOString().split('T')[0] : ''
  )
  const [description, setDescription] = useState(todo?.description ?? '')
  const [completed, setCompleted] = useState(todo?.completed ?? false)
  const [selectedTags, setSelectedTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadTags = async () => {
      if (!todoId) return
      const tagIds = await db.getTodoTags(todoId)
      const tags = await db.getTagsByIds(tagIds)
      setSelectedTags(tags)
      setLoading(false)
    }
    loadTags()
  }, [todoId])

  if (!todo) return null

  const handleSave = async () => {
    if (!text.trim()) return
    const updated = {
      ...todo,
      text: text.trim(),
      priority,
      dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
      description: description || undefined,
      completed,
    }
    await db.updateTodo(updated)
    await store.setTodoTags(todoId, selectedTags.map((t) => t.id))
    onClose()
  }

  const handleDelete = async () => {
    await store.delete(todoId)
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: '#fff', borderRadius: 12, width: 440, maxHeight: '80vh',
          overflowY: 'auto', display: 'flex', flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600 }}>编辑任务</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>

        {/* Form */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 名称 */}
          <div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>任务名称</div>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>

          {/* 优先级 */}
          <div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>优先级</div>
            <PrioritySelector value={priority} onChange={setPriority} />
          </div>

          {/* 截止日期 */}
          <div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>截止日期</div>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>

          {/* 标签 */}
          <div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>标签</div>
            {loading ? (
              <div style={{ color: '#888', fontSize: 13 }}>加载中...</div>
            ) : (
              <TagSelector selected={selectedTags} onChange={setSelectedTags} />
            )}
          </div>

          {/* 描述 */}
          <div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>描述</div>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="可选"
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>

          {/* 完成状态 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={completed} onChange={(e) => setCompleted(e.target.checked)} id="completed-check" />
            <label htmlFor="completed-check" style={{ fontSize: 14 }}>已完成</label>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
          <button
            onClick={handleDelete}
            style={{ padding: '8px 16px', background: '#fff', border: '1px solid #EF4444', borderRadius: 6, color: '#EF4444', cursor: 'pointer', fontSize: 13 }}
          >
            删除
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{ padding: '8px 16px', background: '#fff', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
            >
              取消
            </button>
            <button
              onClick={handleSave}
              style={{ padding: '8px 16px', background: '#007AFF', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 13 }}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 验证构建**

Run: `cd /c/Users/89434/work/code/todo/todo-with-agent && npm run build 2>&1 | head -30`
Expected: 无 TodoEditModal 错误

- [ ] **Step 3: Commit**

```bash
git add src/components/TodoEditModal.tsx
git commit -m "feat: add TodoEditModal component"
```

---

## Task 3: 创建 TodoTable 组件

**Files:**
- Create: `src/components/TodoTable.tsx`

**Steps:**

- [ ] **Step 1: 写组件代码**

```tsx
import { useState, useMemo } from 'react'
import { useTable, getCoreRowModel, getSortedRowModel, SortingState, ColumnDef } from '@tanstack/react-table'
import { useTodoStore } from '../store'
import { db } from '../db'
import { TagBadge } from './TagBadge'
import { TodoEditModal } from './TodoEditModal'
import type { Todo, Tag } from '../types'

const PRIORITY_ORDER: Record<string, number> = { high: 3, medium: 2, low: 1 }

export function TodoTable() {
  const todos = useTodoStore((s) => s.todos)
  const tags = useTodoStore((s) => s.tags)
  const complete = useTodoStore((s) => s.complete)
  const uncomplete = useTodoStore((s) => s.uncomplete)

  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])
  const [filterPriority, setFilterPriority] = useState<string>('全部')
  const [filterStatus, setFilterStatus] = useState<string>('全部')
  const [filterOverdue, setFilterOverdue] = useState<string>('全部')
  const [filterTag, setFilterTag] = useState<string>('全部')
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null)

  // 加载每个 todo 的 tags
  const [todoTagsMap, setTodoTagsMap] = useState<Record<string, Tag[]>>({})

  useMemo(() => {
    const load = async () => {
      const map: Record<string, Tag[]> = {}
      for (const t of todos) {
        const tagIds = await db.getTodoTags(t.id)
        const tagList = await db.getTagsByIds(tagIds)
        map[t.id] = tagList
      }
      setTodoTagsMap(map)
    }
    load()
  }, [todos])

  // 筛选逻辑
  const filteredTodos = useMemo(() => {
    return todos.filter((todo) => {
      if (filterPriority !== '全部' && todo.priority !== filterPriority) return false
      if (filterStatus === '进行中' && todo.completed) return false
      if (filterStatus === '已完成' && !todo.completed) return false
      const isOverdue = !todo.completed && todo.dueDate && todo.dueDate < Date.now()
      if (filterOverdue === '已逾期' && !isOverdue) return false
      if (filterOverdue === '未逾期' && isOverdue) return false
      if (filterTag !== '全部') {
        const todoTagNames = (todoTagsMap[todo.id] ?? []).map((t) => t.name)
        if (!todoTagNames.includes(filterTag)) return false
      }
      return true
    })
  }, [todos, filterPriority, filterStatus, filterOverdue, filterTag, todoTagsMap])

  // 排序逻辑
  const sortedTodos = useMemo(() => {
    const list = [...filteredTodos]
    const sortCol = sorting[0]?.id
    const desc = sorting[0]?.desc

    list.sort((a, b) => {
      if (!sortCol) return 0
      if (sortCol === 'text') return desc ? b.text.localeCompare(a.text) : a.text.localeCompare(b.text)
      if (sortCol === 'priority') {
        const pa = PRIORITY_ORDER[a.priority ?? ''] ?? 0
        const pb = PRIORITY_ORDER[b.priority ?? ''] ?? 0
        return desc ? pb - pa : pa - pb
      }
      if (sortCol === 'dueDate') {
        const da = a.dueDate ?? Number.MAX_SAFE_INTEGER
        const dbVal = b.dueDate ?? Number.MAX_SAFE_INTEGER
        return desc ? dbVal - da : da - dbVal
      }
      if (sortCol === 'createdAt') return desc ? b.createdAt - a.createdAt : a.createdAt - b.createdAt
      return 0
    })
    return list
  }, [filteredTodos, sorting])

  const columns = useMemo<ColumnDef<Todo>[]>(
    () => [
      {
        id: 'checkbox',
        header: '',
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.original.completed}
            onChange={() => row.original.completed ? uncomplete(row.original.id) : complete(row.original.id)}
          />
        ),
        size: 48,
      },
      {
        id: 'text',
        accessorKey: 'text',
        header: '任务名称',
        cell: ({ getValue }) => <span>{getValue() as string}</span>,
      },
      {
        id: 'priority',
        accessorKey: 'priority',
        header: '优先级',
        cell: ({ row }) => {
          const p = row.original.priority
          if (!p) return <span style={{ color: '#ccc' }}>—</span>
          const colors = { high: '#EF4444', medium: '#EAB308', low: '#22C55E' }
          return (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors[p] }} />
              {p === 'high' ? '高' : p === 'medium' ? '中' : '低'}
            </span>
          )
        },
        size: 80,
      },
      {
        id: 'tags',
        header: '标签',
        cell: ({ row }) => {
          const tids = (todoTagsMap[row.original.id] ?? []) as Tag[]
          return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {tids.map((t) => <TagBadge key={t.id} name={t.name} color={t.color} />)}
            </div>
          )
        },
        size: 160,
      },
      {
        id: 'dueDate',
        accessorKey: 'dueDate',
        header: '截止日期',
        cell: ({ row }) => {
          const d = row.original.dueDate
          if (!d) return <span style={{ color: '#ccc' }}>—</span>
          const isOverdue = !row.original.completed && d < Date.now()
          return (
            <span style={{ color: isOverdue ? '#EF4444' : 'inherit', fontSize: 12 }}>
              {isOverdue ? '⚠ ' : ''}{new Date(d).toLocaleDateString('zh-CN')}
            </span>
          )
        },
        size: 100,
      },
      {
        id: 'description',
        accessorKey: 'description',
        header: '描述',
        cell: ({ getValue }) => {
          const desc = getValue() as string | undefined
          if (!desc) return <span style={{ color: '#ccc' }}>—</span>
          return (
            <span
              title={desc}
              style={{ fontSize: 12, color: '#666', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
            >
              {desc}
            </span>
          )
        },
      },
    ],
    [todoTagsMap, complete, uncomplete]
  )

  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = useTable({
    data: sortedTodos,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 筛选栏 */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* 优先级筛选 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#666' }}>优先级</span>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }}>
            <option>全部</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </div>

        {/* 标签筛选 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#666' }}>标签</span>
          <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)} style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }}>
            <option>全部</option>
            {tags.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
        </div>

        {/* 状态筛选 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#666' }}>状态</span>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }}>
            <option>全部</option>
            <option>进行中</option>
            <option>已完成</option>
          </select>
        </div>

        {/* 逾期筛选 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#666' }}>逾期</span>
          <select value={filterOverdue} onChange={(e) => setFilterOverdue(e.target.value)} style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }}>
            <option>全部</option>
            <option>已逾期</option>
            <option>未逾期</option>
          </select>
        </div>
      </div>

      {/* 表格 */}
      <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
        <table {...getTableProps()} style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            {headerGroups.map((headerGroup) => (
              <tr {...headerGroup.getHeaderGroupProps()} style={{ background: '#f8f8f8' }}>
                {headerGroup.headers.map((header) => (
                  <th
                    {...header.getHeaderProps()}
                    onClick={header.column.getToggleSortingHandler()}
                    style={{
                      padding: '10px 12px', textAlign: 'left', fontWeight: 500, color: '#333',
                      borderBottom: '1px solid #eee', cursor: header.column.getCanSort() ? 'pointer' : 'default',
                      userSelect: 'none', width: header.getSize(),
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {header.column.columnDef.header as string}
                      {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? null}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody {...getTableBodyProps()}>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: '32px', textAlign: 'center', color: '#888' }}>
                  暂无任务
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                prepareRow(row)
                return (
                  <tr
                    {...row.getRowProps()}
                    onClick={() => setEditingTodoId(row.original.id)}
                    style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa', cursor: 'pointer' }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td {...cell.getCellProps()} style={{ padding: '10px 12px', borderBottom: '1px solid #f0f0f0' }}>
                        {cell.renderCell()}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 编辑弹窗 */}
      {editingTodoId && (
        <TodoEditModal todoId={editingTodoId} onClose={() => setEditingTodoId(null)} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: 验证构建**

Run: `cd /c/Users/89434/work/code/todo/todo-with-agent && npm run build 2>&1 | head -30`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/components/TodoTable.tsx
git commit -m "feat: add TodoTable component with sorting and filtering"
```

---

## Task 4: 更新 App.tsx 使用 TodoTable

**Files:**
- Modify: `src/App.tsx`

**Steps:**

- [ ] **Step 1: 更新 App.tsx**

将 `import { TodoList } from './components/TodoList'` 改为 `import { TodoTable } from './components/TodoTable'`。

将 `<TodoList />` 替换为 `<TodoTable />`。保留 `TodoInput`、`StatsPanel`、`ChatContainer`。

- [ ] **Step 2: 验证构建**

Run: `cd /c/Users/89434/work/code/todo/todo-with-agent && npm run build 2>&1 | head -30`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat(App): replace TodoList with TodoTable"
```

---

## Self-Review Checklist

**1. Spec Coverage:**
- ✅ 表格列：状态checkbox / 名称 / 优先级 / 标签 / 截止日期 / 描述
- ✅ 优先级彩色圆点
- ✅ TagBadge 显示多标签
- ✅ 逾期红色 + ⚠
- ✅ 描述截断 hover 显示
- ✅ 斑马纹行
- ✅ 筛选栏：优先级 + 标签 + 状态 + 逾期
- ✅ AND 组合筛选
- ✅ 点击表头排序（名称/优先级/截止日期/创建时间）
- ✅ 点击行打开编辑弹窗
- ✅ 编辑弹窗包含所有字段

**2. Placeholder Scan:**
- 无 TBD/TODO/placeholder

**3. Type Consistency:**
- `@tanstack/react-table` SortingState, ColumnDef, useTable API 一致
- Tag, Todo 类型与 types/index.ts 一致
- store 方法：complete, uncomplete, delete, setTodoTags 一致

**Plan ready.**

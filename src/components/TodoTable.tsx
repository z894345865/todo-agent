import { useState, useMemo, useEffect } from 'react'
import { useReactTable, getCoreRowModel, getSortedRowModel, SortingState, ColumnDef, flexRender } from '@tanstack/react-table'
import type { OnChangeFn } from '@tanstack/react-table'
import { useTodoStore } from '../store'
import { getTodoTags, getTagsByIds } from '../db'
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
  const [filterDueDateStart, setFilterDueDateStart] = useState<string>('')
  const [filterDueDateEnd, setFilterDueDateEnd] = useState<string>('')
  const [filterCompletedDateStart, setFilterCompletedDateStart] = useState<string>('')
  const [filterCompletedDateEnd, setFilterCompletedDateEnd] = useState<string>('')
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null)

  // 加载每个 todo 的 tags
  const [todoTagsMap, setTodoTagsMap] = useState<Record<string, Tag[]>>({})

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const map: Record<string, Tag[]> = {}
      for (const t of todos) {
        const tagIds = await getTodoTags(t.id)
        const tagList = await getTagsByIds(tagIds)
        if (cancelled) return
        map[t.id] = tagList
      }
      if (!cancelled) setTodoTagsMap(map)
    }
    load()
    return () => { cancelled = true }
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
      // 截止日期范围筛选
      if (filterDueDateStart || filterDueDateEnd) {
        if (!todo.dueDate) return false
        const start = filterDueDateStart ? new Date(filterDueDateStart).getTime() : 0
        const end = filterDueDateEnd ? new Date(filterDueDateEnd).getTime() + 86400000 : Number.MAX_SAFE_INTEGER
        if (todo.dueDate < start || todo.dueDate >= end) return false
      }
      // 完成日期范围筛选
      if (filterCompletedDateStart || filterCompletedDateEnd) {
        if (!todo.completedAt) return false
        const start = filterCompletedDateStart ? new Date(filterCompletedDateStart).getTime() : 0
        const end = filterCompletedDateEnd ? new Date(filterCompletedDateEnd).getTime() + 86400000 : Number.MAX_SAFE_INTEGER
        if (todo.completedAt < start || todo.completedAt >= end) return false
      }
      return true
    })
  }, [todos, filterPriority, filterStatus, filterOverdue, filterTag, filterDueDateStart, filterDueDateEnd, filterCompletedDateStart, filterCompletedDateEnd, todoTagsMap])

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
        header: () => null,
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.original.completed}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => { e.stopPropagation(); row.original.completed ? uncomplete(row.original.id) : complete(row.original.id) }}
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
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors[p as keyof typeof colors] }} />
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
          const tids = todoTagsMap[row.original.id] ?? []
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
        id: 'completedAt',
        accessorKey: 'completedAt',
        header: '完成日期',
        cell: ({ row }) => {
          const d = row.original.completedAt
          if (!d) return <span style={{ color: '#ccc' }}>—</span>
          return <span style={{ fontSize: 12, color: '#22C55E' }}>{new Date(d).toLocaleDateString('zh-CN')}</span>
        },
        size: 100,
      },
      {
        id: 'description',
        accessorKey: 'description',
        header: '描述',
        cell: ({ row }) => {
          const desc = row.original.description
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
      {
        id: 'createdAt',
        accessorKey: 'createdAt',
        header: '创建时间',
        cell: ({ row }) => <span style={{ fontSize: 12, color: '#888' }}>{new Date(row.original.createdAt).toLocaleDateString('zh-CN')}</span>,
        size: 100,
      },
    ],
    [todoTagsMap, complete, uncomplete]
  )

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    setSorting((prev) => (typeof updater === 'function' ? updater(prev) : updater))
  }

  const table = useReactTable({
    data: sortedTodos,
    columns,
    state: { sorting },
    onSortingChange: handleSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const headerGroups = table.getHeaderGroups()
  const rows = table.getRowModel().rows

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

        {/* 截止日期范围筛选 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#666' }}>截止日期</span>
          <input type="date" value={filterDueDateStart} onChange={(e) => setFilterDueDateStart(e.target.value)} style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
          <span style={{ fontSize: 12, color: '#666' }}>至</span>
          <input type="date" value={filterDueDateEnd} onChange={(e) => setFilterDueDateEnd(e.target.value)} style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
        </div>

        {/* 完成日期范围筛选 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#666' }}>完成日期</span>
          <input type="date" value={filterCompletedDateStart} onChange={(e) => setFilterCompletedDateStart(e.target.value)} style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
          <span style={{ fontSize: 12, color: '#666' }}>至</span>
          <input type="date" value={filterCompletedDateEnd} onChange={(e) => setFilterCompletedDateEnd(e.target.value)} style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
        </div>
      </div>

      {/* 表格 */}
      <div style={{ border: '1px solid #eee', borderRadius: 8, overflowX: 'auto', minWidth: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            {headerGroups.map((headerGroup) => (
              <tr key={headerGroup.id} style={{ background: '#f8f8f8' }}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    style={{
                      padding: '10px 12px', textAlign: 'left', fontWeight: 500, color: '#333',
                      borderBottom: '1px solid #eee', cursor: header.column.getCanSort() ? 'pointer' : 'default',
                      userSelect: 'none', width: header.getSize(),
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' ? ' ↑' : header.column.getIsSorted() === 'desc' ? ' ↓' : null}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: '32px', textAlign: 'center', color: '#888' }}>
                  暂无任务
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr
                  key={row.id}
                  onClick={() => setEditingTodoId(row.original.id)}
                  style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa', cursor: 'pointer' }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} style={{ padding: '10px 12px', borderBottom: '1px solid #f0f0f0' }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
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

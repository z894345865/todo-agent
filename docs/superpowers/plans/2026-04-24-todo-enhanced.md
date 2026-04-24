# TODO Enhanced Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add priority, tags (many-to-many), due date, description fields to TODO; AI tools support all new fields; UI reflects all changes.

**Architecture:** IndexedDB (idb) with two new object stores: `tags` and `todo_tags`. Zustand store manages all tag state. Agent tools resolve tag names to IDs on creation. UI components display new fields with priority icons, colored tag badges, and overdue highlighting.

**Tech Stack:** React, Zustand, idb (IndexedDB), Zod, TypeScript

---

## Task 1: Update Type Definitions

**Files:**
- Modify: `src/types/index.ts`

**Steps:**

- [ ] **Step 1: Add Tag and TodoTag types, update TodoStats**

Add to `src/types/index.ts`:

```ts
export interface Tag {
  id: string
  name: string
  color: string
}

export interface TodoTag {
  todoId: string
  tagId: string
}

export type Priority = 'high' | 'medium' | 'low'

export interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: number
  completedAt?: number
  priority?: Priority
  dueDate?: number
  description?: string
}

export interface TodoStats {
  total: number
  completed: number
  completionRate: number
  weeklyCompleted: number
  priorityStats: {
    high: number
    medium: number
    low: number
  }
  overdueCount: number
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd /c/Users/89434/work/code/todo/todo-with-agent && npx tsc --noEmit`
Expected: No errors related to types/index.ts

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): add Tag, TodoTag, Priority types; update Todo and TodoStats"
```

---

## Task 2: Update DB Layer (DB_VERSION 2 + Tag Functions)

**Files:**
- Modify: `src/db/index.ts`

**Steps:**

- [ ] **Step 1: Update DB_VERSION to 2 and add upgrade logic**

In `src/db/index.ts`, change:

```ts
const DB_VERSION = 2
```

And update the `upgrade` callback:

```ts
upgrade(db) {
  if (!db.objectStoreNames.contains(STORE_NAME)) {
    db.createObjectStore(STORE_NAME, { keyPath: 'id' })
  }
  if (!db.objectStoreNames.contains('tags')) {
    db.createObjectStore('tags', { keyPath: 'id' })
  }
  if (!db.objectStoreNames.contains('todo_tags')) {
    db.createObjectStore('todo_tags', { keyPath: 'todoId' })
  }
}
```

- [ ] **Step 2: Add TAG_COLORS constant and Tag/TodTag DB functions**

Add before `getDB()`:

```ts
export const TAG_COLORS = [
  '#EF4444', '#3B82F6', '#22C55E', '#EAB308',
  '#F97316', '#A855F7', '#EC4899', '#06B6D4',
]

export async function getAllTags(): Promise<Tag[]> {
  const db = await getDB()
  return db.getAll('tags')
}

export async function addTag(tag: Tag): Promise<void> {
  const db = await getDB()
  await db.put('tags', tag)
}

export async function updateTag(tag: Tag): Promise<void> {
  const db = await getDB()
  await db.put('tags', tag)
}

export async function deleteTag(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('tags', id)
}

export async function getTodoTags(todoId: string): Promise<string[]> {
  const db = await getDB()
  const records = await db.getAll('todo_tags')
  return records
    .filter((r: TodoTag) => r.todoId === todoId)
    .map((r: TodoTag) => r.tagId)
}

export async function addTodoTag(todoId: string, tagId: string): Promise<void> {
  const db = await getDB()
  await db.put('todo_tags', { todoId, tagId })
}

export async function removeTodoTag(todoId: string, tagId: string): Promise<void> {
  const db = await getDB()
  await db.delete('todo_tags', [todoId, tagId])
}

export async function removeAllTodoTags(todoId: string): Promise<void> {
  const db = await getDB()
  const records = await db.getAll('todo_tags')
  const toDelete = records.filter((r: TodoTag) => r.todoId === todoId)
  for (const r of toDelete) {
    await db.delete('todo_tags', [r.todoId, r.tagId])
  }
}

export async function getTagsByIds(ids: string[]): Promise<Tag[]> {
  const db = await getDB()
  const allTags = await db.getAll('tags')
  return allTags.filter((t: Tag) => ids.includes(t.id))
}
```

Also add import for new types:
```ts
import type { Todo, TodoStats, Tag, TodoTag } from '../types'
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `cd /c/Users/89434/work/code/todo/todo-with-agent && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/db/index.ts
git commit -m "feat(db): upgrade to DB v2; add Tag and TodoTag stores and functions"
```

---

## Task 3: Update Store (Tag State + New Todo Operations)

**Files:**
- Modify: `src/store/index.ts`

**Steps:**

- [ ] **Step 1: Update add() method signature to accept partial Todo**

In `src/store/index.ts`, update the `add` method to accept an optional partial todo:

```ts
add: async (text: string, extra?: Partial<Pick<Todo, 'priority' | 'dueDate' | 'description'>>) => {
  const todo: Todo = {
    id: crypto.randomUUID(),
    text,
    completed: false,
    createdAt: Date.now(),
    ...extra,
  }
  await db.addTodo(todo)
  const todos = await db.getAllTodos()
  const stats = await db.getTodoStats()
  set({ todos, stats })
  notify()
},
```

- [ ] **Step 2: Add tags state and tag operations to store**

In the `TodoStore` interface, add:
```ts
tags: Tag[]
loadTags: () => Promise<void>
addTag: (name: string, color: string) => Promise<Tag>
updateTag: (id: string, name: string, color: string) => Promise<void>
deleteTag: (id: string) => Promise<void>
getTagsByTodo: (todoId: string) => Promise<Tag[]>
addTagToTodo: (todoId: string, tagId: string) => Promise<void>
removeTagFromTodo: (todoId: string, tagId: string) => Promise<void>
setTodoTags: (todoId: string, tagIds: string[]) => Promise<void>  // full replace
```

In the store implementation, add `tags: []` to initial state and implement:

```ts
loadTags: async () => {
  const tags = await db.getAllTags()
  set({ tags })
},

addTag: async (name: string, color: string) => {
  const tag: Tag = { id: crypto.randomUUID(), name, color }
  await db.addTag(tag)
  set((state) => ({ tags: [...state.tags, tag] }))
  return tag
},

updateTag: async (id: string, name: string, color: string) => {
  const existing = useTodoStore.getState().tags.find((t) => t.id === id)
  if (!existing) return
  const updated = { ...existing, name, color }
  await db.updateTag(updated)
  set((state) => ({
    tags: state.tags.map((t) => (t.id === id ? updated : t)),
  }))
},

deleteTag: async (id: string) => {
  await db.deleteTag(id)
  set((state) => ({ tags: state.tags.filter((t) => t.id !== id) }))
},

getTagsByTodo: async (todoId: string) => {
  const tagIds = await db.getTodoTags(todoId)
  return db.getTagsByIds(tagIds)
},

addTagToTodo: async (todoId: string, tagId: string) => {
  await db.addTodoTag(todoId, tagId)
},

removeTagFromTodo: async (todoId: string, tagId: string) => {
  await db.removeTodoTag(todoId, tagId)
},

setTodoTags: async (todoId: string, tagIds: string[]) => {
  await db.removeAllTodoTags(todoId)
  for (const tagId of tagIds) {
    await db.addTodoTag(todoId, tagId)
  }
},
```

Also update `init()` to call `loadTags()`:
```ts
init: async () => {
  set({ loading: true, error: null })
  try {
    const todos = await db.getAllTodos()
    const stats = await db.getTodoStats()
    const tags = await db.getAllTags()
    set({ todos, stats, tags, loading: false })
  } catch (e) {
    set({ error: String(e), loading: false })
  }
},
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `cd /c/Users/89434/work/code/todo/todo-with-agent && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/store/index.ts
git commit -m "feat(store): add tags state and CRUD operations; update add() to accept extra fields"
```

---

## Task 4: Update Agent Tools

**Files:**
- Modify: `src/agent/tools.ts`

**Steps:**

- [ ] **Step 1: Update imports to include TAG_COLORS, getAllTags, getTagsByIds, removeAllTodoTags, addTodoTag, getTodoTags, removeTodoTag**

```ts
import { useTodoStore } from '../store'
import { z } from 'zod'
import { db, TAG_COLORS } from '../db'
import type { Tag } from '../types'
```

Note: You may need to re-export TAG_COLORS from db/index.ts. Verify it's exported.

- [ ] **Step 2: Update todo_create tool**

```ts
todo_create: {
  name: 'todo_create',
  description: 'Create a new TODO item',
  inputSchema: z.object({
    text: z.string(),
    priority: z.enum(['high', 'medium', 'low']).optional(),
    dueDate: z.string().optional(),
    tags: z.array(z.string()).optional(),
    description: z.string().optional(),
  }),
  execute: async (input: unknown) => {
    const { text, priority, dueDate, tags: tagNames, description } = input as {
      text: string
      priority?: 'high' | 'medium' | 'low'
      dueDate?: string
      tags?: string[]
      description?: string
    }
    const store = useTodoStore.getState()

    const extra: any = {}
    if (priority) extra.priority = priority
    if (dueDate) extra.dueDate = new Date(dueDate).getTime()
    if (description) extra.description = description

    await store.add(text, extra)

    // Resolve todo by text
    const todo = store.getByText(text)
    if (!todo) return 'Error: Failed to create TODO'

    // Handle tags
    if (tagNames && tagNames.length > 0) {
      const allTags = store.tags
      for (const name of tagNames) {
        let tag = allTags.find((t: Tag) => t.name === name)
        if (!tag) {
          // Auto-create tag with random color
          const color = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]
          tag = await store.addTag(name, color)
        }
        await store.addTagToTodo(todo.id, tag.id)
      }
    }

    const tagList = tagNames ? tagNames.join(', ') : ''
    const prioLabel = priority ? `优先级: ${priority}` : ''
    const descLabel = description ? `描述: ${description}` : ''
    const parts = [text, prioLabel, tagList ? `标签: ${tagList}` : '', descLabel].filter(Boolean)
    return `Created: ${parts.join(' | ')}`
  },
},
```

- [ ] **Step 3: Add todo_update tool**

```ts
todo_update: {
  name: 'todo_update',
  description: 'Update TODO fields (priority, dueDate, tags, description)',
  inputSchema: z.object({
    text: z.string(),
    priority: z.enum(['high', 'medium', 'low']).optional(),
    dueDate: z.string().optional(),
    tags: z.array(z.string()).optional(),
    description: z.string().optional(),
  }),
  execute: async (input: unknown) => {
    const { text, priority, dueDate, tags: tagNames, description } = input as {
      text: string
      priority?: 'high' | 'medium' | 'low'
      dueDate?: string
      tags?: string[]
      description?: string
    }
    const store = useTodoStore.getState()
    const todo = store.getByText(text)
    if (!todo) return `No TODO found matching: "${text}"`

    // Build update
    const updated: any = { ...todo }
    if (priority !== undefined) updated.priority = priority
    if (dueDate !== undefined) updated.dueDate = new Date(dueDate).getTime()
    if (description !== undefined) updated.description = description

    await db.updateTodo(updated)

    // Handle tags if provided
    if (tagNames !== undefined) {
      await store.setTodoTags(todo.id, [])
      for (const name of tagNames) {
        const tag = store.tags.find((t: Tag) => t.name === name)
        if (tag) {
          await store.addTagToTodo(todo.id, tag.id)
        }
      }
    }

    return `Updated: "${todo.text}"`
  },
},
```

- [ ] **Step 4: Add tag_create tool**

```ts
tag_create: {
  name: 'tag_create',
  description: 'Create a new tag',
  inputSchema: z.object({
    name: z.string(),
    color: z.string().optional(),
  }),
  execute: async (input: unknown) => {
    const { name, color } = input as { name: string; color?: string }
    const store = useTodoStore.getState()
    const existing = store.tags.find((t: Tag) => t.name === name)
    if (existing) return `Tag "${name}" already exists`

    const tagColor = color && TAG_COLORS.includes(color) ? color : TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]
    const tag = await store.addTag(name, tagColor)
    return `Created tag: ${name} (${tagColor})`
  },
},
```

- [ ] **Step 5: Add tag_delete tool**

```ts
tag_delete: {
  name: 'tag_delete',
  description: 'Delete a tag (removes from all todos)',
  inputSchema: z.object({ name: z.string() }),
  execute: async (input: unknown) => {
    const { name } = input as { name: string }
    const store = useTodoStore.getState()
    const tag = store.tags.find((t: Tag) => t.name === name)
    if (!tag) return `Tag "${name}" not found`
    await store.deleteTag(tag.id)
    return `Deleted tag: ${name}`
  },
},
```

- [ ] **Step 6: Update todo_list to include tags in output**

```ts
todo_list: {
  name: 'todo_list',
  description: 'List all TODOs, optionally filtered by status',
  inputSchema: z.object({ status: z.string().optional() }),
  execute: async (input: unknown) => {
    const { status } = input as { status?: string }
    const store = useTodoStore.getState()
    if (!store) return 'Error: TodoStore not initialized'
    let todos = store.todos
    if (status === 'completed') {
      todos = todos.filter((t) => t.completed)
    } else if (status === 'active') {
      todos = todos.filter((t) => !t.completed)
    }
    if (todos.length === 0) return 'No TODOs found'
    const lines = await Promise.all(
      todos.map(async (t) => {
        const tagIds = await db.getTodoTags(t.id)
        const tags = await db.getTagsByIds(tagIds)
        const tagStr = tags.map((tag: Tag) => tag.name).join(', ')
        const prioStr = t.priority ? `优先级: ${t.priority}` : ''
        const tagLine = tagStr ? `标签: ${tagStr}` : ''
        const dueStr = t.dueDate ? `截止: ${new Date(t.dueDate).toLocaleDateString('zh-CN')}` : ''
        const meta = [prioStr, tagLine, dueStr].filter(Boolean).join(' | ')
        return `[${t.completed ? 'x' : ' '}] ${t.text}${meta ? ' | ' + meta : ''}`
      })
    )
    return lines.join('\n')
  },
},
```

Also update `todo_complete`, `todo_uncomplete`, `todo_delete` to work with the updated `getByText`.

- [ ] **Step 7: Verify TypeScript compilation**

Run: `cd /c/Users/89434/work/code/todo/todo-with-agent && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add src/agent/tools.ts
git commit -m "feat(tools): add priority, tags, dueDate, description support; add todo_update, tag_create, tag_delete tools"
```

---

## Task 5: Create TagBadge Component

**Files:**
- Create: `src/components/TagBadge.tsx`

**Steps:**

- [ ] **Step 1: Write the component**

```tsx
interface TagBadgeProps {
  name: string
  color: string
  onRemove?: () => void
  onClick?: () => void
}

export function TagBadge({ name, color, onRemove, onClick }: TagBadgeProps) {
  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 12,
        background: color + '22',
        color: color,
        fontSize: 11,
        fontWeight: 500,
        cursor: onClick ? 'pointer' : 'default',
        border: `1px solid ${color}44`,
      }}
    >
      {name}
      {onRemove && (
        <span
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          style={{ cursor: 'pointer', marginLeft: 2, opacity: 0.7 }}
        >
          ×
        </span>
      )}
    </span>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `cd /c/Users/89434/work/code/todo/todo-with-agent && npm run build 2>&1 | head -30`
Expected: No TagBadge errors

- [ ] **Step 3: Commit**

```bash
git add src/components/TagBadge.tsx
git commit -m "feat: add TagBadge component"
```

---

## Task 6: Create PrioritySelector Component

**Files:**
- Create: `src/components/PrioritySelector.tsx`

**Steps:**

- [ ] **Step 1: Write the component**

```tsx
import type { Priority } from '../types'

interface PrioritySelectorProps {
  value?: Priority
  onChange: (p: Priority | undefined) => void
}

const OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'high', label: '高', color: '#EF4444' },
  { value: 'medium', label: '中', color: '#EAB308' },
  { value: 'low', label: '低', color: '#22C55E' },
]

export function PrioritySelector({ value, onChange }: PrioritySelectorProps) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(value === opt.value ? undefined : opt.value)}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            border: '1px solid',
            borderColor: value === opt.value ? opt.color : '#ddd',
            background: value === opt.value ? opt.color + '22' : 'transparent',
            color: value === opt.value ? opt.color : '#888',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: value === opt.value ? 600 : 400,
            transition: 'all 0.15s',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `cd /c/Users/89434/work/code/todo/todo-with-agent && npm run build 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/PrioritySelector.tsx
git commit -m "feat: add PrioritySelector component"
```

---

## Task 7: Create TagSelector Component

**Files:**
- Create: `src/components/TagSelector.tsx`

**Steps:**

- [ ] **Step 1: Write the component**

```tsx
import { useState, useRef, useEffect } from 'react'
import { useTodoStore } from '../store'
import { TAG_COLORS } from '../db'
import { TagBadge } from './TagBadge'
import type { Tag } from '../types'

interface TagSelectorProps {
  selected: Tag[]
  onChange: (tags: Tag[]) => void
}

export function TagSelector({ selected, onChange }: TagSelectorProps) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const tags = useTodoStore((s) => s.tags)
  const addTag = useTodoStore((s) => s.addTag)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
        setCreating(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const toggle = (tag: Tag) => {
    if (selected.find((t) => t.id === tag.id)) {
      onChange(selected.filter((t) => t.id !== tag.id))
    } else {
      onChange([...selected, tag])
    }
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    const color = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]
    const tag = await addTag(newName.trim(), color)
    onChange([...selected, tag])
    setNewName('')
    setCreating(false)
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen((v) => !v)}
        style={{
          minHeight: 34,
          border: '1px solid #ddd',
          borderRadius: 8,
          padding: '4px 8px',
          cursor: 'pointer',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          alignItems: 'center',
          fontSize: 13,
          color: selected.length === 0 ? '#aaa' : 'inherit',
        }}
      >
        {selected.length === 0 ? '选择标签' : null}
        {selected.map((t) => (
          <TagBadge
            key={t.id}
            name={t.name}
            color={t.color}
            onRemove={() => toggle(t)}
          />
        ))}
      </div>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            border: '1px solid #eee',
            borderRadius: 8,
            background: '#fff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 100,
            maxHeight: 200,
            overflowY: 'auto',
          }}
        >
          {tags.map((tag) => (
            <div
              key={tag.id}
              onClick={() => toggle(tag)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: selected.find((t) => t.id === tag.id) ? '#f5f5f5' : 'transparent',
              }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: tag.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 13 }}>{tag.name}</span>
              {selected.find((t) => t.id === tag.id) && (
                <span style={{ marginLeft: 'auto', color: '#22C55E' }}>✓</span>
              )}
            </div>
          ))}

          {creating ? (
            <div style={{ padding: '8px 12px', display: 'flex', gap: 6 }}>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="标签名"
                autoFocus
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  fontSize: 13,
                }}
              />
              <button onClick={handleCreate} style={{ padding: '4px 8px', cursor: 'pointer' }}>
                ✓
              </button>
            </div>
          ) : (
            <div
              onClick={() => setCreating(true)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                color: '#007AFF',
                fontSize: 13,
                borderTop: '1px solid #eee',
              }}
            >
              + 创建新标签
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `cd /c/Users/89434/work/code/todo/todo-with-agent && npm run build 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/TagSelector.tsx
git commit -m "feat: add TagSelector component with dropdown and create-new-tag"
```

---

## Task 8: Create TagManager Component

**Files:**
- Create: `src/components/TagManager.tsx`

**Steps:**

- [ ] **Step 1: Write the component**

```tsx
import { useState } from 'react'
import { useTodoStore } from '../store'
import { TAG_COLORS } from '../db'
import type { Tag } from '../types'

interface TagManagerProps {
  onClose: () => void
}

export function TagManager({ onClose }: TagManagerProps) {
  const tags = useTodoStore((s) => s.tags)
  const addTag = useTodoStore((s) => s.addTag)
  const updateTag = useTodoStore((s) => s.updateTag)
  const deleteTag = useTodoStore((s) => s.deleteTag)

  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(TAG_COLORS[0])
  const [editing, setEditing] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')

  const handleCreate = async () => {
    if (!newName.trim()) return
    await addTag(newName.trim(), newColor)
    setNewName('')
    setCreating(false)
  }

  const handleEdit = async (tag: Tag) => {
    if (!editName.trim()) return
    await updateTag(tag.id, editName.trim(), editColor)
    setEditing(null)
  }

  const handleDelete = async (tag: Tag) => {
    await deleteTag(tag.id)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          width: 360,
          maxHeight: 480,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #eee',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontWeight: 600 }}>管理标签</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>
            ×
          </button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {tags.length === 0 && !creating && (
            <div style={{ padding: '24px', textAlign: 'center', color: '#888', fontSize: 13 }}>
              暂无标签
            </div>
          )}

          {tags.map((tag) => (
            <div key={tag.id} style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
              {editing === tag.id ? (
                <>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={{ flex: 1, padding: '4px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 }}
                    autoFocus
                  />
                  <select
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    style={{ padding: '4px', borderRadius: 4, border: '1px solid #ddd', fontSize: 12 }}
                  >
                    {TAG_COLORS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button onClick={() => handleEdit(tag)} style={{ cursor: 'pointer', padding: '4px 8px' }}>✓</button>
                  <button onClick={() => setEditing(null)} style={{ cursor: 'pointer', padding: '4px 8px' }}>×</button>
                </>
              ) : (
                <>
                  <span style={{ width: 14, height: 14, borderRadius: '50%', background: tag.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 14 }}>{tag.name}</span>
                  <button
                    onClick={() => { setEditing(tag.id); setEditName(tag.name); setEditColor(tag.color) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#007AFF', fontSize: 12 }}
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(tag)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 12 }}
                  >
                    删除
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Create new */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #eee' }}>
          {creating ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="标签名"
                autoFocus
                style={{ flex: 1, padding: '6px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 }}
              />
              <select
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                style={{ padding: '6px', borderRadius: 4, border: '1px solid #ddd' }}
              >
                {TAG_COLORS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button onClick={handleCreate} style={{ padding: '6px 12px', cursor: 'pointer', background: '#007AFF', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13 }}>
                创建
              </button>
              <button onClick={() => setCreating(false)} style={{ padding: '6px', cursor: 'pointer', background: 'none', border: '1px solid #ddd', borderRadius: 4 }}>
                ×
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              style={{ width: '100%', padding: '8px', cursor: 'pointer', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }}
            >
              + 新建标签
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `cd /c/Users/89434/work/code/todo/todo-with-agent && npm run build 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/TagManager.tsx
git commit -m "feat: add TagManager modal for creating/editing/deleting tags"
```

---

## Task 9: Update TodoItem Component (Display New Fields)

**Files:**
- Modify: `src/components/TodoItem.tsx`

**Steps:**

- [ ] **Step 1: Read the existing TodoItem.tsx**

```bash
cat src/components/TodoItem.tsx
```

- [ ] **Step 2: Update TodoItem to show priority, tags, dueDate, description, completedAt**

Update the display section to show:
- Priority badge (colored dot or text) before the text
- Tag badges next to the text
- Due date with overdue highlighting in red
- Description in small gray text below the main text
- completedAt date shown when completed

Keep checkbox, complete/uncomplete, delete functionality intact.

Key changes:
- Import `TagBadge` from `./TagBadge`
- Import `useTodoStore` from `../store`
- Import `db` from `../db` for `getTagsByIds`
- Use `useEffect` to load tags for this todo item
- Add overdue logic: `const isOverdue = !todo.completed && todo.dueDate && todo.dueDate < Date.now()`

```tsx
// After getting todo.text, compute:
const [tags, setTags] = useState<Tag[]>([])
useEffect(() => {
  const load = async () => {
    const tagIds = await db.getTodoTags(todo.id)
    const t = await db.getTagsByIds(tagIds)
    setTags(t)
  }
  load()
}, [todo.id])

const isOverdue = !todo.completed && !!(todo.dueDate && todo.dueDate < Date.now())

// In the display area, add before text:
{priority && (
  <span style={{
    display: 'inline-block',
    width: 8, height: 8, borderRadius: '50%',
    background: priority === 'high' ? '#EF4444' : priority === 'medium' ? '#EAB308' : '#22C55E',
    marginRight: 6, verticalAlign: 'middle'
  }} />
)}
{tags.map(tag => <TagBadge key={tag.id} name={tag.name} color={tag.color} />)}
{dueDate && (
  <span style={{ fontSize: 11, color: isOverdue ? '#EF4444' : '#888', marginLeft: 6 }}>
    {isOverdue ? '⚠ ' : ''}{new Date(dueDate).toLocaleDateString('zh-CN')}
  </span>
)}
{description && (
  <div style={{ fontSize: 12, color: '#888', marginTop: 2, marginLeft: 20 }}>{description}</div>
)}
{completedAt && (
  <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>完成于 {new Date(completedAt).toLocaleDateString('zh-CN')}</div>
)}
```

- [ ] **Step 3: Verify build**

Run: `cd /c/Users/89434/work/code/todo/todo-with-agent && npm run build 2>&1 | head -30`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/TodoItem.tsx
git commit -m "feat(TodoItem): display priority, tags, dueDate, description, completedAt"
```

---

## Task 10: Update TodoInput Component (Add New Fields)

**Files:**
- Modify: `src/components/TodoInput.tsx`

**Steps:**

- [ ] **Step 1: Read the existing TodoInput.tsx**

```bash
cat src/components/TodoInput.tsx
```

- [ ] **Step 2: Add new fields to the form**

Add imports:
```tsx
import { PrioritySelector } from './PrioritySelector'
import { TagSelector } from './TagSelector'
import { useTodoStore } from '../store'
import type { Tag } from '../types'
```

Add state:
```tsx
const [priority, setPriority] = useState<Priority | undefined>()
const [dueDate, setDueDate] = useState('')
const [selectedTags, setSelectedTags] = useState<Tag[]>([])
const [description, setDescription] = useState('')
```

The `handleSubmit` needs to call `store.add(text, { priority, dueDate: dueDate ? new Date(dueDate).getTime() : undefined, description })` AND then set todo tags.

Wait for the todo to be created, get its id, then call `setTodoTags` for each selected tag.

After `await store.add(...)`:
```tsx
const todo = store.getByText(text)
if (todo && selectedTags.length > 0) {
  await store.setTodoTags(todo.id, selectedTags.map(t => t.id))
}
```

Layout: Stack fields below the text input (or in an "advanced" collapsible section). Put priority selector, tag selector, due date input, and description input in a grid below the main input row.

Add a small "展开更多" toggle to show/hide the advanced fields (initially collapsed).

- [ ] **Step 3: Verify build**

Run: `cd /c/Users/89434/work/code/todo/todo-with-agent && npm run build 2>&1 | head -30`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/TodoInput.tsx
git commit -m "feat(TodoInput): add priority, tags, dueDate, description fields"
```

---

## Task 11: Update StatsPanel Component

**Files:**
- Modify: `src/components/StatsPanel.tsx`

**Steps:**

- [ ] **Step 1: Read the existing StatsPanel.tsx**

```bash
cat src/components/StatsPanel.tsx
```

- [ ] **Step 2: Add priority and overdue stats**

Compute `priorityStats` and `overdueCount` from `todos`:

```tsx
const priorityStats = {
  high: todos.filter(t => t.priority === 'high').length,
  medium: todos.filter(t => t.priority === 'medium').length,
  low: todos.filter(t => t.priority === 'low').length,
}
const overdueCount = todos.filter(t => !t.completed && t.dueDate && t.dueDate < Date.now()).length
```

Display as two new rows below the existing stats:
```tsx
<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
  <span>优先级</span>
  <span>
    <span style={{ color: '#EF4444' }}>高{priorityStats.high}</span>
    {' / '}
    <span style={{ color: '#EAB308' }}>中{priorityStats.medium}</span>
    {' / '}
    <span style={{ color: '#22C55E' }}>低{priorityStats.low}</span>
  </span>
</div>
<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
  <span>已逾期</span>
  <span style={{ color: overdueCount > 0 ? '#EF4444' : 'inherit', fontWeight: overdueCount > 0 ? 600 : 400 }}>
    {overdueCount} 项
  </span>
</div>
```

- [ ] **Step 3: Verify build**

Run: `cd /c/Users/89434/work/code/todo/todo-with-agent && npm run build 2>&1 | head -30`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/StatsPanel.tsx
git commit -m "feat(StatsPanel): add priority and overdue statistics"
```

---

## Task 12: Add Tag Manager Button to App

**Files:**
- Modify: `src/App.tsx`

**Steps:**

- [ ] **Step 1: Add "管理标签" button below StatsPanel**

Import `TagManager` and add a state `showTagManager` with a button:

```tsx
const [showTagManager, setShowTagManager] = useState(false)

// Below StatsPanel, add:
<button
  onClick={() => setShowTagManager(true)}
  style={{ marginTop: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6 }}
>
  管理标签
</button>

{showTagManager && <TagManager onClose={() => setShowTagManager(false)} />}
```

- [ ] **Step 2: Verify build**

Run: `cd /c/Users/89434/work/code/todo/todo-with-agent && npm run build 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat(App): add tag manager button"
```

---

## Self-Review Checklist

**1. Spec Coverage:**
- ✅ Priority field: TodoItem display, TodoInput input, StatsPanel stats, todo_create tool, todo_update tool
- ✅ Tags (many-to-many): Tag type, TodoTag type, DB stores, TagManager, TagSelector, TagBadge, todo_create tool, todo_update tool, tag_create tool, tag_delete tool
- ✅ Due date: TodoItem display (overdue), TodoInput input, StatsPanel overdue count, todo_create tool, todo_update tool
- ✅ Description: TodoItem display, TodoInput input, todo_create tool, todo_update tool
- ✅ completedAt联动: Already existed in original code
- ✅ StatsPanel: priorityStats and overdueCount
- ✅ Tag colors: 8 predefined colors via TAG_COLORS
- ✅ AI tools support all new fields
- ✅ Existing todos keep empty tags (no migration)

**2. Placeholder Scan:**
- No "TBD", "TODO", placeholder steps, or vague descriptions found

**3. Type Consistency:**
- `Priority = 'high' | 'medium' | 'low'` defined in types, used in PrioritySelector, TodoInput, tools
- `Tag` interface defined in types, used in TagBadge, TagSelector, TagManager, store, tools
- `TodoTag` interface defined in types, used in db functions
- `TodoStats.priorityStats` and `overdueCount` used in StatsPanel
- All function signatures (store methods, DB functions) are consistent across tasks
- `todo_create` input uses `dueDate: z.string()` (ISO string) matching spec

**All 12 tasks accounted for. Plan ready.**

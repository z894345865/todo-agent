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
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

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
        onClick={(e) => e.stopPropagation()}
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
                  {deleteConfirm === tag.id ? (
                    <>
                      <span style={{ fontSize: 12, color: '#888' }}>确认?</span>
                      <button onClick={() => handleDelete(tag)} style={{ color: '#EF4444', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>是</button>
                      <button onClick={() => setDeleteConfirm(null)} style={{ color: '#888', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>否</button>
                    </>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(tag.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 12 }}
                    >
                      删除
                    </button>
                  )}
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

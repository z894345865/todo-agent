import { useTodoStore } from '../store'

export function StatsPanel() {
  const stats = useTodoStore((s) => s.stats)
  const todos = useTodoStore((s) => s.todos)

  const priorityStats = {
    high: todos.filter(t => t.priority === 'high').length,
    medium: todos.filter(t => t.priority === 'medium').length,
    low: todos.filter(t => t.priority === 'low').length,
  }
  const overdueCount = todos.filter(t => !t.completed && t.dueDate && t.dueDate < Date.now()).length

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #ddd',
        borderRadius: 8,
        padding: 16,
        marginBottom: 24,
      }}
    >
      <h3 style={{ marginBottom: 12, fontSize: 14, color: '#666' }}>今日统计</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Stat label="总任务" value={stats.total} />
        <Stat label="已完成" value={stats.completed} />
        <Stat label="完成率" value={`${stats.completionRate}%`} />
        <Stat label="本周完成" value={stats.weeklyCompleted} />
      </div>
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
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 24, fontWeight: 600 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#999' }}>{label}</div>
    </div>
  )
}
import { useTodoStore } from '../store'

export function StatsPanel() {
  const stats = useTodoStore((s) => s.stats)

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
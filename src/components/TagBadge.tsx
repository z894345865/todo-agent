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
        background: color + '22',  // 22 = ~13% opacity
        color: color,
        fontSize: 11,
        fontWeight: 500,
        cursor: onClick ? 'pointer' : 'default',
        border: `1px solid ${color}44`,  // 44 = ~27% opacity
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

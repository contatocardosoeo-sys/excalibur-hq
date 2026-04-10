interface EmptyStateProps {
  icon: string
  title: string
  description?: string
}

export default function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>{icon}</div>
      <div style={{ fontSize: 14, color: '#9ca3af', fontWeight: 600 }}>{title}</div>
      {description && (
        <div style={{ fontSize: 11, color: '#4b5563', marginTop: 6 }}>{description}</div>
      )}
    </div>
  )
}

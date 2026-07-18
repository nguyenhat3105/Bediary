/**
 * Role model:
 * - ADMIN: system admin account only.
 * - PARENT: ba mẹ, full control inside a baby journal.
 * - CAREGIVER: người chăm sóc, can log care activities and upload memories.
 * - VIEWER: người thân, can view and interact lightly.
 */
export function useRole() {
  let role = 'VIEWER'
  try {
    const user = JSON.parse(localStorage.getItem('bediary_user') || '{}')
    role = user?.role || 'VIEWER'
  } catch {
    /* fallback to VIEWER */
  }

  const isSystemAdmin = role === 'ADMIN'
  const isParent = role === 'PARENT'
  const isCaregiver = role === 'CAREGIVER'
  const isViewer = role === 'VIEWER'
  const canManage = isParent || isSystemAdmin
  const canLog = isParent || isCaregiver || isSystemAdmin

  const label = isSystemAdmin ? 'Quản trị hệ thống' : isParent ? 'Ba mẹ' : isCaregiver ? 'Người chăm sóc' : 'Người thân'
  const emoji = isSystemAdmin ? '🛡️' : isParent ? '👑' : isCaregiver ? '🤲' : '🤝'

  const badgeStyle = isSystemAdmin
    ? { background: '#FFF3E0', color: '#E65100', border: '1px solid #FFCC80' }
    : isParent
      ? { background: '#FFF0F5', color: '#FF5C8A', border: '1px solid #FFD6E4' }
      : isCaregiver
        ? { background: '#F3EEFF', color: '#7C3AED', border: '1px solid #DDD6FE' }
        : { background: '#EFF6FF', color: '#3B82F6', border: '1px solid #BFDBFE' }

  return {
    role,
    isAdmin: isSystemAdmin,
    isSystemAdmin,
    isParent,
    isCaregiver,
    isViewer,
    canManage,
    canLog,
    label,
    emoji,
    badgeStyle,
  }
}

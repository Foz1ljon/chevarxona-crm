import type { H3Event } from 'h3'
import { ActivityLog } from '../models/ActivityLog'
import type { SessionUser } from './auth'

interface LogInput {
  action: string
  entity: string
  entityId?: string
  summary?: string
  meta?: Record<string, unknown>
}

/**
 * Fire-and-forget audit write. Logging must never break the request that
 * triggered it, so failures are swallowed after a console warning.
 */
export function logActivity(event: H3Event, actor: SessionUser | null, input: LogInput) {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? ''

  ActivityLog.create({
    actor: actor?.id ?? null,
    actorName: actor?.fullName ?? 'System',
    actorRole: actor?.roleKey ?? 'SYSTEM',
    action: input.action,
    entity: input.entity,
    entityId: input.entityId ?? '',
    summary: input.summary ?? '',
    meta: input.meta ?? {},
    ip
  }).catch((error) => {
    console.warn('[activity-log] failed to persist entry:', error?.message ?? error)
  })
}

import pg from 'pg'
import { env } from '../config/env.js'

export const pool = new pg.Pool({ connectionString: env.databaseUrl })

// Keep DATE columns as plain 'YYYY-MM-DD' strings so the frontend can format
// them without timezone drift (see src/lib/format.js).
pg.types.setTypeParser(1082, (value) => value)

pool.on('error', (error) => {
  console.error('Unexpected database error', error)
})

// Thin wrapper so services do not import the pool directly.
export function query(text, params) {
  return pool.query(text, params)
}

// Every outbound notification is recorded, so the dashboard can show what was
// delivered, failed, or skipped (for example when an integration is not set up).
export function recordMessage({
  registrationId = null,
  waitlistId = null,
  channel,
  type,
  recipient = null,
  status,
  error = null,
}) {
  return query(
    `INSERT INTO messages_log (registration_id, waitlist_id, channel, type, recipient, status, error)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [registrationId, waitlistId, channel, type, recipient, status, error],
  )
}

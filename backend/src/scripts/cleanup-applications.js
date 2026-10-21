// Retention job for application, waitlist and contact data.
//
//   npm run retention:privacy             # delete personal data past its limit
//   npm run retention:privacy -- --dry-run  # report what would be deleted
//
// The privacy policy promises:
//   * application details: up to 12 months after the job closes;
//   * waitlist entries: up to 12 months from sign-up;
//   * contact messages: up to 12 months.
//
// Deleting an application also removes its recording from disk, its message
// logs and its seat, exactly like the admin privacy-deletion action. Schedule
// this job monthly alongside `npm run retention:voice` (see DEPLOYMENT.md).
import fs from 'node:fs/promises'
import path from 'node:path'
import { env } from '../config/env.js'
import { pool } from '../db/database.js'

const dryRun = process.argv.includes('--dry-run')
const uploadDir = path.resolve(env.uploadDir)
const RETENTION_MONTHS = 12

const registrations = await pool.query(
  `SELECT r.id, r.offer_id, r.voice_path
   FROM registrations r
   JOIN offers o ON o.id = r.offer_id
   WHERE (o.closes_at IS NOT NULL AND o.closes_at < CURRENT_DATE - INTERVAL '12 months')
      OR (o.closes_at IS NULL AND o.status = 'closed' AND o.updated_at < now() - INTERVAL '12 months')
   ORDER BY r.id`,
)

const waitlist = await pool.query(
  `SELECT id FROM waitlist
   WHERE created_at < now() - INTERVAL '12 months'
   ORDER BY id`,
)

const contactMessages = await pool.query(
  `SELECT id FROM contact_messages
   WHERE created_at < now() - INTERVAL '12 months'
   ORDER BY id`,
)

console.log(`Cutoff: ${RETENTION_MONTHS} months`)
console.log(
  `Records to remove: ${registrations.rowCount} application(s), ` +
  `${waitlist.rowCount} waitlist entr${waitlist.rowCount === 1 ? 'y' : 'ies'}, ` +
  `${contactMessages.rowCount} contact message(s)`,
)

let removedApplications = 0
let removedRecordings = 0
let removedWaitlist = 0
let removedContacts = 0

for (const row of registrations.rows) {
  const client = await pool.connect()
  try {
    if (dryRun) {
      console.log(`  would remove application #${row.id}${row.voice_path ? ` and ${row.voice_path}` : ''}`)
      removedApplications += 1
      if (row.voice_path) removedRecordings += 1
      continue
    }

    await client.query('BEGIN')
    if (row.voice_path) {
      const file = path.join(uploadDir, path.basename(row.voice_path))
      try {
        await fs.rm(file, { force: true })
        removedRecordings += 1
      } catch (error) {
        if (error.code !== 'ENOENT') throw error
        removedRecordings += 1
      }
    }
    await client.query('DELETE FROM messages_log WHERE registration_id = $1', [row.id])
    await client.query(
      `UPDATE offers
       SET seats_taken = GREATEST(seats_taken - 1, 0),
           status = CASE
             WHEN status = 'soldout' AND GREATEST(seats_taken - 1, 0) < seats_total THEN 'active'
             ELSE status
           END,
           updated_at = now()
       WHERE id = $1`,
      [row.offer_id],
    )
    await client.query('DELETE FROM registrations WHERE id = $1', [row.id])
    await client.query('COMMIT')
    removedApplications += 1
    console.log(`  removed application #${row.id}`)
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // already committed or rolled back
    }
    console.error(`  failed for application #${row.id}: ${error.message}`)
  } finally {
    client.release()
  }
}

for (const row of waitlist.rows) {
  if (dryRun) {
    console.log(`  would remove waitlist #${row.id}`)
    removedWaitlist += 1
    continue
  }
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM messages_log WHERE waitlist_id = $1', [row.id])
    await client.query('DELETE FROM waitlist WHERE id = $1', [row.id])
    await client.query('COMMIT')
    removedWaitlist += 1
    console.log(`  removed waitlist #${row.id}`)
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // already committed or rolled back
    }
    console.error(`  failed for waitlist #${row.id}: ${error.message}`)
  } finally {
    client.release()
  }
}

for (const row of contactMessages.rows) {
  if (dryRun) {
    console.log(`  would remove contact message #${row.id}`)
    removedContacts += 1
    continue
  }
  try {
    await pool.query('DELETE FROM contact_messages WHERE id = $1', [row.id])
    removedContacts += 1
    console.log(`  removed contact message #${row.id}`)
  } catch (error) {
    console.error(`  failed for contact message #${row.id}: ${error.message}`)
  }
}

console.log(
  `${dryRun ? 'Would remove' : 'Removed'} ${removedApplications} application(s) ` +
  `(${removedRecordings} recording(s)), ${removedWaitlist} waitlist entr${removedWaitlist === 1 ? 'y' : 'ies'}, ` +
  `${removedContacts} contact message(s).`,
)
await pool.end()

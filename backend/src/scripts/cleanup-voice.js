// Retention job for voice notes.
//
//   npm run retention:voice             # delete recordings older than the cutoff
//   npm run retention:voice -- --dry-run  # report what would be deleted
//
// Voice recordings are personal data, so they are removed once they are no
// longer needed. The registration row is kept; only the file and its
// `voice_path` are cleared. Schedule this daily (cron, Render cron job, ...).
import fs from 'node:fs/promises'
import path from 'node:path'
import { env } from '../config/env.js'
import { pool, query } from '../db/database.js'

const dryRun = process.argv.includes('--dry-run')
const cutoffDays = env.voiceRetentionDays
const uploadDir = path.resolve(env.uploadDir)

const { rows } = await query(
  `SELECT id, voice_path, created_at
   FROM registrations
   WHERE voice_path IS NOT NULL
     AND created_at < now() - ($1 || ' days')::interval
   ORDER BY id`,
  [String(cutoffDays)],
)

console.log(`Cutoff: ${cutoffDays} days (before ${new Date(Date.now() - cutoffDays * 86400000).toISOString()})`)
console.log(`Recordings to remove: ${rows.length}`)

let removed = 0
for (const row of rows) {
  const file = path.join(uploadDir, row.voice_path)
  try {
    if (!dryRun) await fs.rm(file)
    removed += 1
    console.log(`  ${dryRun ? 'would remove' : 'removed'} #${row.id} ${row.voice_path}`)
  } catch (error) {
    if (error.code === 'ENOENT') {
      removed += 1
      console.log(`  missing on disk, clearing row: #${row.id} ${row.voice_path}`)
    } else {
      console.error(`  failed for #${row.id}: ${error.message}`)
      continue
    }
  }
  if (!dryRun) {
    await query('UPDATE registrations SET voice_path = NULL WHERE id = $1', [row.id])
  }
}

console.log(`${dryRun ? 'Would clear' : 'Cleared'} ${removed} recording${removed === 1 ? '' : 's'}.`)
await pool.end()

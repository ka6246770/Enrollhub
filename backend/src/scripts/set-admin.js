// Creates or updates the admin account.
//
//   npm run admin:set -- admin@example.com "a strong password"
//
// Falls back to ADMIN_EMAIL / ADMIN_PASSWORD from the environment when the
// arguments are omitted.
import bcrypt from 'bcryptjs'
import { assertRequiredEnv } from '../config/env.js'
import { pool, query } from '../db/database.js'

const [, , emailArg, passwordArg] = process.argv
const email = (emailArg || process.env.ADMIN_EMAIL || '').trim().toLowerCase()
const password = passwordArg || process.env.ADMIN_PASSWORD || ''

assertRequiredEnv()

if (!email || !password) {
  console.error('Usage: npm run admin:set -- <email> <password>')
  process.exit(1)
}
if (password.length < 8) {
  console.error('Use a password of at least 8 characters.')
  process.exit(1)
}

const passwordHash = await bcrypt.hash(password, 12)
await query(
  `INSERT INTO admins (email, password_hash) VALUES ($1, $2)
   ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
  [email, passwordHash],
)

console.log(`✓ admin ready: ${email}`)
await pool.end()

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertRequiredEnv } from '../config/env.js'
import { directPool } from './database.js'

const here = path.dirname(fileURLToPath(import.meta.url))

assertRequiredEnv()

const sql = await readFile(path.join(here, 'schema.sql'), 'utf8')
const pool = directPool()
await pool.query(sql)

console.log('✓ schema applied')
await pool.end()

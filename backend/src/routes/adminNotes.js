import { Router } from 'express'
import { z } from 'zod'
import { query } from '../db/database.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

// Private notes are written only from the signed-in dashboard. They never
// appear on a public status page, in an email, or in a tracking response.
export const adminNotesRouter = Router()

adminNotesRouter.use(requireAdmin)

const noteSchema = z.object({
  body: z.string().trim().min(1, 'Write a note first.').max(1000, 'A note can be at most 1000 characters.'),
})

function parseId(value) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

function mapNote(row) {
  return {
    id: row.id,
    registrationId: row.registration_id,
    author: row.author,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

adminNotesRouter.get('/registrations/:id/notes', async (req, res, next) => {
  try {
    const registrationId = parseId(req.params.id)
    if (!registrationId) return res.status(400).json({ message: 'Invalid registration id.' })

    const { rows: registrations } = await query('SELECT 1 FROM registrations WHERE id = $1', [registrationId])
    if (registrations.length === 0) return res.status(404).json({ message: 'Registration not found.' })

    const { rows } = await query(
      `SELECT id, registration_id, author, body, created_at, updated_at
       FROM registration_notes
       WHERE registration_id = $1
       ORDER BY created_at DESC, id DESC`,
      [registrationId],
    )
    res.json(rows.map(mapNote))
  } catch (error) {
    next(error)
  }
})

adminNotesRouter.post('/registrations/:id/notes', async (req, res, next) => {
  try {
    const registrationId = parseId(req.params.id)
    if (!registrationId) return res.status(400).json({ message: 'Invalid registration id.' })

    const { body } = noteSchema.parse(req.body)
    const author = String(req.session.admin.email || 'Admin')

    // INSERT ... SELECT keeps the existence check and the write in one round
    // trip; a missing registration returns no row instead of an FK error.
    const { rows } = await query(
      `INSERT INTO registration_notes (registration_id, author, body)
       SELECT id, $2, $3 FROM registrations WHERE id = $1
       RETURNING id, registration_id, author, body, created_at, updated_at`,
      [registrationId, author, body],
    )
    if (!rows[0]) return res.status(404).json({ message: 'Registration not found.' })
    res.status(201).json(mapNote(rows[0]))
  } catch (error) {
    next(error)
  }
})

adminNotesRouter.patch('/notes/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id)
    if (!id) return res.status(400).json({ message: 'Invalid note id.' })

    const { body } = noteSchema.parse(req.body)
    const { rows } = await query(
      `UPDATE registration_notes
       SET body = $2, updated_at = now()
       WHERE id = $1
       RETURNING id, registration_id, author, body, created_at, updated_at`,
      [id, body],
    )
    if (!rows[0]) return res.status(404).json({ message: 'Note not found.' })
    res.json(mapNote(rows[0]))
  } catch (error) {
    next(error)
  }
})

adminNotesRouter.delete('/notes/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id)
    if (!id) return res.status(400).json({ message: 'Invalid note id.' })

    const { rowCount } = await query('DELETE FROM registration_notes WHERE id = $1', [id])
    if (rowCount === 0) return res.status(404).json({ message: 'Note not found.' })
    res.status(204).end()
  } catch (error) {
    next(error)
  }
})

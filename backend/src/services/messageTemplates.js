import { render, templateDefinitions } from '../config/templates.js'
import { query } from '../db/database.js'

// The live message texts. The database is the source of truth so the owner can
// edit a text from the dashboard and have the very next message use it;
// config/templates.js supplies the defaults and the required variables.
//
// Reads are cached in-process for the life of the request cycle because every
// send would otherwise cost a query. `saveTemplate` clears the cache, so an
// edit is picked up immediately without restarting the API.

const definitions = new Map(templateDefinitions.map((definition) => [definition.key, definition]))
const defaultBodies = new Map(templateDefinitions.map((definition) => [definition.key, definition.body]))

// undefined = not read yet, Map = the rows we found (possibly empty).
let cache

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 })
}

async function loadRows() {
  if (cache) return cache

  const rows = new Map()
  try {
    const result = await query('SELECT key, body, updated_at FROM message_templates')
    for (const row of result.rows) {
      if (definitions.has(row.key) && row.body) rows.set(row.key, row)
    }
  } catch (error) {
    // A missing table or database must not stop the site from sending messages.
    console.warn(`[templates] could not read message_templates, using the built-in texts: ${error.message}`)
  }

  cache = rows
  return rows
}

// The text for one key: the edited version if there is one, the default if not.
export async function getTemplateBody(key) {
  const rows = await loadRows()
  return rows.get(key)?.body ?? defaultBodies.get(key) ?? ''
}

// Renders one text with real values, e.g. renderTemplate('accepted', { name, offer }).
export async function renderTemplate(key, vars = {}) {
  return render(await getTemplateBody(key), vars)
}

// Sample values for the dashboard preview. One place, so the preview always
// matches what the API would render.
export const SAMPLE_VALUES = {
  name: 'Amina',
  offer: 'Your offer',
  age: '27',
  language: 'English',
  level: 'Intermediate',
  residence: 'Cairo',
  email: 'amina@example.com',
  phone: '+20 100 000 0000',
  message: 'I would like to know more about the schedule.',
}

// Fills a text with the sample values. Used for the dashboard preview.
export function renderPreview(body) {
  return render(body, SAMPLE_VALUES)
}

// Everything the dashboard needs to show one editor per template.
export async function listTemplates() {
  const rows = await loadRows()
  return templateDefinitions.map((definition) => ({
    key: definition.key,
    label: definition.label,
    channel: definition.channel,
    where: definition.where,
    body: rows.get(definition.key)?.body ?? definition.body,
    variables: definition.variables,
    required: definition.required,
    updatedAt: rows.get(definition.key)?.updated_at ?? null,
  }))
}

// Checks an edit before it is stored. Rejects an empty body, a body that is too
// long, a variable that does not exist, and a body that dropped a variable the
// message needs ({name} and {offer} in most of them). Throws with `status: 400`
// (or `404` for an unknown key) so the route can pass the message straight on.
export function validateTemplateBody(key, body) {
  const definition = definitions.get(key)
  if (!definition) throw Object.assign(new Error('Unknown message text.'), { status: 404 })

  const value = String(body ?? '').trim()
  if (value.length === 0) throw badRequest('The message cannot be empty.')
  if (value.length > 4000) throw badRequest('Keep the message under 4000 characters.')

  const used = [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1])
  const unknown = [...new Set(used)].filter((token) => !definition.variables.includes(token))
  if (unknown.length > 0) {
    throw badRequest(
      `${unknown.map((token) => `{${token}}`).join(', ')} cannot be used here. Available: ${definition.variables.map((token) => `{${token}}`).join(', ')}.`,
    )
  }

  const missing = definition.required.filter((token) => !used.includes(token))
  if (missing.length > 0) {
    throw badRequest(
      `Keep ${missing.map((token) => `{${token}}`).join(' and ')} so the message still has the details it needs.`,
    )
  }

  return value
}

// Stores an edit and clears the cache so the next message uses it.
export async function saveTemplate(key, body) {
  const value = validateTemplateBody(key, body)
  await query(
    `INSERT INTO message_templates (key, body)
     VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET body = EXCLUDED.body, updated_at = now()`,
    [key, value],
  )
  cache = undefined
  return value
}

// Used by db:seed. Never overwrites an edited text, and leaves updated_at null
// so the dashboard can tell a seeded default from something the owner edited.
export async function seedTemplates() {
  let inserted = 0
  for (const definition of templateDefinitions) {
    const { rowCount } = await query(
      `INSERT INTO message_templates (key, body)
       VALUES ($1, $2)
       ON CONFLICT (key) DO NOTHING`,
      [definition.key, definition.body],
    )
    inserted += rowCount
  }
  cache = undefined
  return inserted
}

export { templateDefinitions }

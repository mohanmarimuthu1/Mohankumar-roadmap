import { supabase } from './supabase'
import { wipeUserData } from './seed'

/**
 * Export / import of everything a user owns.
 *
 * Rows are exported verbatim (ids included) so that completion state, notes and
 * gym history survive a round trip. Every id column in the database is an
 * auto-generated bigint, so on import the ids are dropped and reassigned by
 * Postgres; foreign keys are rewritten through the resulting mapping, which
 * keeps the file portable between accounts.
 */

export const BACKUP_VERSION = 1

// Insert order matters: parents before children.
const TABLES = [
  { name: 'phases', parents: {} },
  { name: 'task_groups', parents: { phase_id: 'phases' } },
  { name: 'tasks', parents: { group_id: 'task_groups' } },
  { name: 'habits', parents: {} },
  { name: 'habit_log', parents: { habit_id: 'habits' } },
  { name: 'rules', parents: {} },
  { name: 'gym_days', parents: {} },
  { name: 'exercises', parents: { day_id: 'gym_days' } },
  { name: 'gym_logs', parents: { exercise_id: 'exercises' } },
  { name: 'neu_sections', parents: {} },
  { name: 'neu_items', parents: { section_id: 'neu_sections' } },
  { name: 'resources', parents: {} },
]

const CHUNK = 500

export async function exportAll(userId) {
  const payload = {
    version: BACKUP_VERSION,
    exported_at: new Date().toISOString(),
    tables: {},
  }

  for (const { name } of TABLES) {
    const { data, error } = await supabase.from(name).select('*').eq('user_id', userId)
    if (error) throw new Error(`exporting ${name}: ${error.message}`)
    payload.tables[name] = data ?? []
  }

  return payload
}

export function downloadJson(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/** Replaces all of a user's data with the contents of a backup file. */
export async function importAll(userId, payload) {
  if (!payload || typeof payload !== 'object' || !payload.tables) {
    throw new Error('That file is not a Mohan Roadmap backup.')
  }
  if (payload.version !== BACKUP_VERSION) {
    throw new Error(`Unsupported backup version: ${payload.version}`)
  }

  await wipeUserData(userId)

  const idMap = new Map() // table -> Map(oldId -> newId)

  for (const { name, parents } of TABLES) {
    const rows = payload.tables[name] ?? []
    if (!rows.length) {
      idMap.set(name, new Map())
      continue
    }

    const prepared = rows.map((row) => {
      // `id` is a generated identity column -- let Postgres assign a fresh one.
      const next = { ...row, user_id: userId }
      delete next.id
      delete next.created_at

      for (const [field, parentTable] of Object.entries(parents)) {
        const mapped = idMap.get(parentTable)?.get(row[field])
        if (mapped === undefined) {
          throw new Error(`Backup is inconsistent: ${name}.${field} points at a missing row.`)
        }
        next[field] = mapped
      }
      return next
    })

    // PostgREST returns the inserted rows in the order they were sent, which is
    // what lets the new ids be paired back up with the ids from the file.
    const localMap = new Map()
    for (let i = 0; i < prepared.length; i += CHUNK) {
      const slice = prepared.slice(i, i + CHUNK)
      const { data, error } = await supabase.from(name).insert(slice).select('id')
      if (error) throw new Error(`importing ${name}: ${error.message}`)
      if (!data || data.length !== slice.length) {
        throw new Error(`importing ${name}: expected ${slice.length} rows back, got ${data?.length ?? 0}.`)
      }
      data.forEach((inserted, idx) => localMap.set(rows[i + idx].id, inserted.id))
    }

    idMap.set(name, localMap)
  }

  await supabase
    .from('user_settings')
    .upsert({ user_id: userId, seeded_at: new Date().toISOString() }, { onConflict: 'user_id' })
}

import { supabase } from './supabase'
import seedData from './seed.json'

/**
 * First-login seeding.
 *
 * `user_settings.seeded_at` is the marker: it is written last, so a run that
 * dies halfway leaves the flag unset and the next login retries. Retries are
 * made safe by wiping any partial rows before inserting (the top-level tables
 * cascade to their children).
 */

const OWNED_TABLES = [
  'tasks',
  'task_groups',
  'phases',
  'habit_log',
  'habits',
  'rules',
  'gym_logs',
  'exercises',
  'gym_days',
  'neu_items',
  'neu_sections',
  'resources',
]

async function insertRows(table, rows) {
  if (!rows.length) return []
  const { data, error } = await supabase.from(table).insert(rows).select('id')
  if (error) throw new Error(`seeding ${table}: ${error.message}`)
  return data
}

/** Deletes every row this user owns. Also used by "Reset to defaults". */
export async function wipeUserData(userId) {
  for (const table of OWNED_TABLES) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId)
    // Children are cascaded by their parents, so a missing-row result is fine;
    // a real failure (permissions, network) still surfaces.
    if (error) throw new Error(`clearing ${table}: ${error.message}`)
  }
}

/** Writes the default template into a user's account. Assumes an empty slate. */
export async function seedUser(userId, data = seedData) {
  const own = (row) => ({ ...row, user_id: userId })

  // ---------------------------------------------------------------- roadmap
  const phases = await insertRows(
    'phases',
    (data.phases ?? []).map((p, i) =>
      own({ code: p.code, name: p.name, weeks: p.weeks ?? '', tag: p.tag ?? '', order_idx: i })
    )
  )

  const groupRows = []
  ;(data.phases ?? []).forEach((phase, phaseIdx) => {
    ;(phase.groups ?? []).forEach((group, groupIdx) => {
      groupRows.push(own({ phase_id: phases[phaseIdx].id, title: group.title, order_idx: groupIdx }))
    })
  })
  const groups = await insertRows('task_groups', groupRows)

  const taskRows = []
  let cursor = 0
  ;(data.phases ?? []).forEach((phase) => {
    ;(phase.groups ?? []).forEach((group) => {
      const groupId = groups[cursor++].id
      ;(group.tasks ?? []).forEach((title, taskIdx) => {
        taskRows.push(own({ group_id: groupId, title, order_idx: taskIdx }))
      })
    })
  })
  await insertRows('tasks', taskRows)

  // ----------------------------------------------------------------- habits
  const habitRows = []
  for (const cadence of ['daily', 'weekly', 'monthly']) {
    ;(data.habits?.[cadence] ?? []).forEach((name, i) => {
      habitRows.push(own({ name, cadence, order_idx: i }))
    })
  }
  await insertRows('habits', habitRows)

  await insertRows(
    'rules',
    (data.rules ?? []).map((text, i) => own({ text, order_idx: i }))
  )

  // -------------------------------------------------------------------- gym
  const gymDays = await insertRows(
    'gym_days',
    (data.gym_days ?? []).map((d, i) => own({ name: d.name, focus: d.focus ?? '', order_idx: i }))
  )

  const exerciseRows = []
  ;(data.gym_days ?? []).forEach((day, dayIdx) => {
    ;(day.exercises ?? []).forEach((ex, exIdx) => {
      exerciseRows.push(
        own({
          day_id: gymDays[dayIdx].id,
          name: ex.name,
          sets: ex.sets ?? 3,
          reps: ex.reps ?? '',
          rest_seconds: ex.rest_seconds ?? 60,
          notes: ex.notes ?? '',
          order_idx: exIdx,
        })
      )
    })
  })
  await insertRows('exercises', exerciseRows)

  // -------------------------------------------------------------------- NEU
  const sections = await insertRows(
    'neu_sections',
    (data.neu_sections ?? []).map((s, i) => own({ title: s.title, order_idx: i }))
  )

  const itemRows = []
  ;(data.neu_sections ?? []).forEach((section, sectionIdx) => {
    ;(section.items ?? []).forEach((text, itemIdx) => {
      itemRows.push(own({ section_id: sections[sectionIdx].id, text, order_idx: itemIdx }))
    })
  })
  await insertRows('neu_items', itemRows)

  // -------------------------------------------------------------- resources
  const byCategory = {}
  await insertRows(
    'resources',
    (data.resources ?? []).map((r) => {
      const category = r.category ?? 'General'
      const order_idx = (byCategory[category] = (byCategory[category] ?? -1) + 1)
      return own({ category, name: r.name, url: r.url, order_idx })
    })
  )
}

/**
 * Called once after login. Returns true if a seed actually ran.
 */
export async function ensureSeeded(userId) {
  const { data: settings, error } = await supabase
    .from('user_settings')
    .select('seeded_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(`reading settings: ${error.message}`)
  if (settings?.seeded_at) return false

  // A previous attempt may have died partway through.
  await wipeUserData(userId)
  await seedUser(userId)

  const { error: markError } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, seeded_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (markError) throw new Error(`marking seeded: ${markError.message}`)

  return true
}

/** Reset to defaults, from Settings. */
export async function resetToDefaults(userId) {
  await wipeUserData(userId)
  await seedUser(userId)
  await supabase
    .from('user_settings')
    .upsert({ user_id: userId, seeded_at: new Date().toISOString() }, { onConflict: 'user_id' })
}

export { seedData }

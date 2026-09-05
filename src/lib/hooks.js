import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { supabase, isConfigured } from './supabase'
import { ensureSeeded } from './seed'
import { computeStreak, lastNDays, periodKey, todayKey } from './dates'

/* ------------------------------------------------------------------ auth */

const AuthContext = createContext({
  session: null,
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
})

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false)
      return
    }

    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null)
      setLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    async signInWithGoogle() {
      if (!isConfigured) throw new Error('Supabase is not configured')
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      })
      if (error) throw error
    },
    async signOut() {
      if (!isConfigured) return
      await supabase.auth.signOut()
    },
  }

  return createElement(AuthContext.Provider, { value }, children)
}

export function useAuth() {
  return useContext(AuthContext)
}

/* --------------------------------------------------------------- storage */

/** Small localStorage-backed state, used for UI prefs like edit mode. */
export function useLocalState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw === null ? initial : JSON.parse(raw)
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* quota / private mode -- non-fatal */
    }
  }, [key, value])

  return [value, setValue]
}

const EditModeContext = createContext([false, () => {}])

export function EditModeProvider({ children }) {
  const state = useLocalState('roadmap:edit-mode', false)
  return createElement(EditModeContext.Provider, { value: state }, children)
}

export function useEditMode() {
  return useContext(EditModeContext)
}

/* ----------------------------------------------------------------- query */

/**
 * Minimal async-state helper shared by every data hook below: runs `fetcher`,
 * tracks loading/error, and hands back a `refresh`. Results arriving after the
 * hook unmounts (or after a newer run started) are dropped.
 */
function useQuery(fetcher, deps = [], { enabled = true } = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState(null)
  const runId = useRef(0)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const run = useCallback(async () => {
    if (!enabled) {
      setLoading(false)
      return
    }
    const id = ++runId.current
    setLoading(true)
    try {
      const result = await fetcher()
      if (mounted.current && id === runId.current) {
        setData(result)
        setError(null)
      }
    } catch (err) {
      if (mounted.current && id === runId.current) setError(err)
    } finally {
      if (mounted.current && id === runId.current) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps])

  useEffect(() => {
    run()
  }, [run])

  return { data, loading, error, refresh: run, setData }
}

function unwrap({ data, error }) {
  if (error) throw new Error(error.message)
  return data ?? []
}

const byOrder = (a, b) => (a.order_idx ?? 0) - (b.order_idx ?? 0)

/* ------------------------------------------------------------------ seed */

/** Runs first-login seeding once per session, before the app renders data. */
export function useSeedGate(userId) {
  const [state, setState] = useState({ ready: false, seeded: false, error: null })
  const started = useRef(null)

  useEffect(() => {
    if (!userId || started.current === userId) return
    started.current = userId

    ensureSeeded(userId)
      .then((seeded) => setState({ ready: true, seeded, error: null }))
      .catch((error) => setState({ ready: false, seeded: false, error }))
  }, [userId])

  return state
}

/* --------------------------------------------------------------- roadmap */

export function useRoadmap() {
  const { user } = useAuth()

  const query = useQuery(
    async () => {
      const phases = unwrap(
        await supabase
          .from('phases')
          .select(
            'id, code, name, weeks, tag, order_idx, task_groups(id, title, order_idx, phase_id, tasks(id, title, notes, done, order_idx, group_id))'
          )
          .order('order_idx')
      )

      // PostgREST does not guarantee ordering of deeply embedded rows, so the
      // nested levels are sorted here.
      return phases.map((phase) => ({
        ...phase,
        task_groups: [...(phase.task_groups ?? [])].sort(byOrder).map((group) => ({
          ...group,
          tasks: [...(group.tasks ?? [])].sort(byOrder),
        })),
      }))
    },
    [user?.id],
    { enabled: Boolean(user) }
  )

  const phases = query.data ?? []

  const stats = useMemo(() => {
    const perPhase = phases.map((phase) => {
      const tasks = (phase.task_groups ?? []).flatMap((g) => g.tasks ?? [])
      const done = tasks.filter((t) => t.done).length
      return { id: phase.id, total: tasks.length, done, ratio: tasks.length ? done / tasks.length : 0 }
    })

    const total = perPhase.reduce((n, p) => n + p.total, 0)
    const done = perPhase.reduce((n, p) => n + p.done, 0)
    const currentIdx = Math.max(
      0,
      perPhase.findIndex((p) => p.ratio < 1)
    )

    return {
      perPhase: Object.fromEntries(perPhase.map((p) => [p.id, p])),
      total,
      done,
      ratio: total ? done / total : 0,
      currentPhase: phases[perPhase.findIndex((p) => p.ratio < 1) === -1 ? phases.length - 1 : currentIdx],
    }
  }, [phases])

  const patchTask = useCallback(
    (taskId, patch) => {
      query.setData((current) =>
        (current ?? []).map((phase) => ({
          ...phase,
          task_groups: phase.task_groups.map((group) => ({
            ...group,
            tasks: group.tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task)),
          })),
        }))
      )
    },
    [query]
  )

  const toggleTask = useCallback(
    async (task) => {
      const done = !task.done
      patchTask(task.id, { done })
      const { error } = await supabase
        .from('tasks')
        .update({ done, completed_at: done ? new Date().toISOString() : null })
        .eq('id', task.id)
      if (error) {
        patchTask(task.id, { done: task.done })
        throw new Error(error.message)
      }
    },
    [patchTask]
  )

  const saveNotes = useCallback(
    async (taskId, notes) => {
      patchTask(taskId, { notes })
      const { error } = await supabase.from('tasks').update({ notes }).eq('id', taskId)
      if (error) throw new Error(error.message)
    },
    [patchTask]
  )

  return { phases, stats, loading: query.loading, error: query.error, refresh: query.refresh, toggleTask, saveNotes }
}

/* ---------------------------------------------------------------- habits */

const STREAK_WINDOW_DAYS = 400

export function useHabits() {
  const { user } = useAuth()

  const query = useQuery(
    async () => {
      const [habits, logs, rules] = await Promise.all([
        supabase.from('habits').select('*').order('order_idx').then(unwrap),
        supabase
          .from('habit_log')
          .select('habit_id, log_date')
          .gte('log_date', lastNDays(STREAK_WINDOW_DAYS).at(-1))
          .then(unwrap),
        supabase.from('rules').select('*').order('order_idx').then(unwrap),
      ])
      return { habits, logs, rules }
    },
    [user?.id],
    { enabled: Boolean(user) }
  )

  const habits = query.data?.habits ?? []
  const logs = query.data?.logs ?? []
  const rules = query.data?.rules ?? []

  const byCadence = useMemo(
    () => ({
      daily: habits.filter((h) => h.cadence === 'daily').sort(byOrder),
      weekly: habits.filter((h) => h.cadence === 'weekly').sort(byOrder),
      monthly: habits.filter((h) => h.cadence === 'monthly').sort(byOrder),
    }),
    [habits]
  )

  /** Set of `${habit_id}|${log_date}` for O(1) "is this period done" checks. */
  const logKeys = useMemo(() => new Set(logs.map((l) => `${l.habit_id}|${l.log_date}`)), [logs])

  const isDone = useCallback(
    (habit, date = new Date()) => logKeys.has(`${habit.id}|${periodKey(habit.cadence, date)}`),
    [logKeys]
  )

  const streak = useMemo(() => {
    const dailyIds = new Set(byCadence.daily.map((h) => h.id))
    const dailyLogDates = logs.filter((l) => dailyIds.has(l.habit_id)).map((l) => l.log_date)
    return computeStreak(dailyLogDates, dailyIds.size)
  }, [byCadence.daily, logs])

  const toggleHabit = useCallback(
    async (habit, date = new Date()) => {
      const key = periodKey(habit.cadence, date)
      const done = logKeys.has(`${habit.id}|${key}`)

      // optimistic
      query.setData((current) => ({
        ...current,
        logs: done
          ? current.logs.filter((l) => !(l.habit_id === habit.id && l.log_date === key))
          : [...current.logs, { habit_id: habit.id, log_date: key }],
      }))

      const { error } = done
        ? await supabase.from('habit_log').delete().eq('habit_id', habit.id).eq('log_date', key)
        : await supabase
            .from('habit_log')
            .insert({ habit_id: habit.id, log_date: key, user_id: user.id })

      if (error) {
        query.refresh()
        throw new Error(error.message)
      }
    },
    [logKeys, query, user?.id]
  )

  const dailyProgress = useMemo(() => {
    const total = byCadence.daily.length
    const done = byCadence.daily.filter((h) => isDone(h)).length
    return { done, total, ratio: total ? done / total : 0 }
  }, [byCadence.daily, isDone])

  return {
    habits,
    byCadence,
    rules,
    logs,
    isDone,
    toggleHabit,
    streak,
    dailyProgress,
    loading: query.loading,
    error: query.error,
    refresh: query.refresh,
  }
}

/* ------------------------------------------------------------------- gym */

export function useGym() {
  const { user } = useAuth()

  const query = useQuery(
    async () => {
      const [days, logs] = await Promise.all([
        supabase
          .from('gym_days')
          .select('id, name, focus, order_idx, exercises(id, name, sets, reps, rest_seconds, notes, order_idx, day_id)')
          .order('order_idx')
          .then(unwrap),
        supabase
          .from('gym_logs')
          .select('id, exercise_id, log_date, set_idx, weight, reps')
          .gte('log_date', lastNDays(120).at(-1))
          .order('log_date', { ascending: false })
          .then(unwrap),
      ])

      return {
        days: days.map((d) => ({ ...d, exercises: [...(d.exercises ?? [])].sort(byOrder) })),
        logs,
      }
    },
    [user?.id],
    { enabled: Boolean(user) }
  )

  const days = query.data?.days ?? []
  const logs = query.data?.logs ?? []

  const logsByExercise = useMemo(() => {
    const map = new Map()
    for (const log of logs) {
      if (!map.has(log.exercise_id)) map.set(log.exercise_id, [])
      map.get(log.exercise_id).push(log)
    }
    return map
  }, [logs])

  /** Sets logged for an exercise on a given date, ordered by set index. */
  const setsFor = useCallback(
    (exerciseId, date = todayKey()) =>
      (logsByExercise.get(exerciseId) ?? [])
        .filter((l) => l.log_date === date)
        .sort((a, b) => a.set_idx - b.set_idx),
    [logsByExercise]
  )

  /** The most recent session before `date` -- the progression reference. */
  const lastSessionFor = useCallback(
    (exerciseId, date = todayKey()) => {
      const previous = (logsByExercise.get(exerciseId) ?? []).filter((l) => l.log_date < date)
      if (!previous.length) return null
      const lastDate = previous[0].log_date
      return {
        date: lastDate,
        sets: previous.filter((l) => l.log_date === lastDate).sort((a, b) => a.set_idx - b.set_idx),
      }
    },
    [logsByExercise]
  )

  const logSet = useCallback(
    async ({ exerciseId, setIdx, weight, reps, date = todayKey() }) => {
      const row = {
        user_id: user.id,
        exercise_id: exerciseId,
        log_date: date,
        set_idx: setIdx,
        weight: weight === '' || weight === null ? null : Number(weight),
        reps: reps === '' || reps === null ? null : Number(reps),
      }
      const { error } = await supabase
        .from('gym_logs')
        .upsert(row, { onConflict: 'exercise_id,log_date,set_idx' })
      if (error) throw new Error(error.message)
      await query.refresh()
    },
    [query, user?.id]
  )

  const clearSet = useCallback(
    async ({ exerciseId, setIdx, date = todayKey() }) => {
      const { error } = await supabase
        .from('gym_logs')
        .delete()
        .eq('exercise_id', exerciseId)
        .eq('log_date', date)
        .eq('set_idx', setIdx)
      if (error) throw new Error(error.message)
      await query.refresh()
    },
    [query]
  )

  /** date -> set of gym_day ids trained that day, derived from logged sets. */
  const trainedDays = useMemo(() => {
    const exerciseToDay = new Map()
    for (const day of days) for (const ex of day.exercises) exerciseToDay.set(ex.id, day.id)

    const map = new Map()
    for (const log of logs) {
      const dayId = exerciseToDay.get(log.exercise_id)
      if (!dayId) continue
      if (!map.has(log.log_date)) map.set(log.log_date, new Set())
      map.get(log.log_date).add(dayId)
    }
    return map
  }, [days, logs])

  return {
    days,
    logs,
    setsFor,
    lastSessionFor,
    logSet,
    clearSet,
    trainedDays,
    loading: query.loading,
    error: query.error,
    refresh: query.refresh,
  }
}

/* ------------------------------------------------------------------- NEU */

export function useNeu() {
  const { user } = useAuth()

  const query = useQuery(
    async () => {
      const sections = unwrap(
        await supabase
          .from('neu_sections')
          .select('id, title, order_idx, neu_items(id, text, done, order_idx, section_id)')
          .order('order_idx')
      )
      return sections.map((s) => ({ ...s, neu_items: [...(s.neu_items ?? [])].sort(byOrder) }))
    },
    [user?.id],
    { enabled: Boolean(user) }
  )

  const sections = query.data ?? []

  const toggleItem = useCallback(
    async (item) => {
      const done = !item.done
      query.setData((current) =>
        (current ?? []).map((section) => ({
          ...section,
          neu_items: section.neu_items.map((i) => (i.id === item.id ? { ...i, done } : i)),
        }))
      )
      const { error } = await supabase
        .from('neu_items')
        .update({ done, completed_at: done ? new Date().toISOString() : null })
        .eq('id', item.id)
      if (error) {
        query.refresh()
        throw new Error(error.message)
      }
    },
    [query]
  )

  return { sections, toggleItem, loading: query.loading, error: query.error, refresh: query.refresh }
}

/* ------------------------------------------------------------- resources */

export function useResources() {
  const { user } = useAuth()

  const query = useQuery(
    async () =>
      unwrap(
        await supabase.from('resources').select('*').order('category').order('order_idx')
      ),
    [user?.id],
    { enabled: Boolean(user) }
  )

  const resources = query.data ?? []

  const grouped = useMemo(() => {
    const map = new Map()
    for (const r of resources) {
      if (!map.has(r.category)) map.set(r.category, [])
      map.get(r.category).push(r)
    }
    return [...map.entries()].map(([category, items]) => ({ category, items: items.sort(byOrder) }))
  }, [resources])

  return { resources, grouped, loading: query.loading, error: query.error, refresh: query.refresh }
}

/* ------------------------------------------------------------------ live */

export const LIVE_CATEGORIES = [
  { key: 'news', label: 'News' },
  { key: 'models', label: 'Models' },
  { key: 'papers', label: 'Papers' },
  { key: 'repos', label: 'Repos' },
  { key: 'hn', label: 'HN' },
]

const AUTO_REFRESH_MS = 5 * 60 * 1000

export function useNews(category, { limit = 40 } = {}) {
  const { user } = useAuth()

  const query = useQuery(
    async () =>
      unwrap(
        await supabase
          .from('news_articles')
          .select('*')
          .eq('category', category)
          .order('published_at', { ascending: false })
          .limit(limit)
      ),
    [user?.id, category, limit],
    { enabled: Boolean(user) }
  )

  const { refresh } = query

  // Poll every 5 minutes, but only while the tab is visible.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    const interval = setInterval(tick, AUTO_REFRESH_MS)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [refresh])

  // Live-update on inserts from the refresh function.
  useEffect(() => {
    if (!isConfigured) return
    const channel = supabase
      .channel(`news:${category}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'news_articles', filter: `category=eq.${category}` },
        () => refresh()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [category, refresh])

  return { articles: query.data ?? [], loading: query.loading, error: query.error, refresh }
}

/** Top N items across every category, for the Today feed. */
export function useTopNews(limit = 5) {
  const { user } = useAuth()

  return useQuery(
    async () =>
      unwrap(
        await supabase
          .from('news_articles')
          .select('*')
          .order('published_at', { ascending: false })
          .limit(limit)
      ),
    [user?.id, limit],
    { enabled: Boolean(user) }
  )
}

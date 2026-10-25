// Saved records: store keys, the merge of a sighting, counts, shape, retention, and the lineage of a branch.

import type { SandboxTunerApplied, SandboxTunerCounts, SandboxTunerLatest, SandboxTunerLineage, SandboxTunerRecord } from '../types'
import { isGuardedPath, normalHost } from './names'
import { isCount, isListOf, isPlainObject, isText } from './shapes'
import type { Sighting } from './sightings'

// Writers keep independent records.
export const WRITER_PREFIX = 'writer:'
export const HIDDEN_PREFIX = 'hidden:'
export const JOURNAL_PREFIX = 'applied:'
export const LINEAGE_PREFIX = 'lineage:'
// One key per session in which Allow and Deny refuse after a sighting that could not be saved. It holds the time of
// the refusal.
export const REFUSAL_PREFIX = 'refusal:'
// The most refusals that the store keeps, the newest (newestRefusals), and the most that a module instance holds of its
// own. A module instance also holds every refusal that the store keeps.
export const REFUSAL_LIMIT = 200
const JOURNAL_LIMIT = 50
// The most steps that a view follows up from a branch to the sessions that it started from.
const LINEAGE_LIMIT = 10
// The most branch records that the store keeps (keptBranches).
const BRANCH_LIMIT = 200

const RECORD_LIMIT = 300
const RECORD_AGE_MS = 30 * 24 * 60 * 60 * 1000
const PORT_LIMIT = 5
const PROGRAM_LIMIT = 3
const SESSION_LIMIT = 20
const COUNTERS = ['blocked', 'refused', 'listed', 'inferred'] as const
const KINDS: ReadonlySet<unknown> = new Set(['host', 'path'])

export function recordKey(sighting: Pick<Sighting, 'kind' | 'target'>): string {
  return `${sighting.kind}:${sighting.target}`
}

function joinNewest<T>(list: readonly T[], item: T, limit: number): T[] {
  return [...list.filter(value => value !== item), item].slice(-limit)
}

/** Distinct values, the newer record's last so that the cut keeps them: a value in both takes its newer place. */
function mergeNewest<T>(older: readonly T[], newer: readonly T[], limit: number): T[] {
  const joined = [...older, ...newer]
  return joined.filter((value, index) => joined.lastIndexOf(value) === index).slice(-limit)
}

export function mergeSighting(record: SandboxTunerRecord | undefined, sighting: Sighting, sessionId: string | null, now: number): SandboxTunerRecord {
  const base: SandboxTunerRecord = record ?? {
    key: recordKey(sighting),
    kind: sighting.kind,
    target: sighting.target,
    counts: { blocked: 0, refused: 0, listed: 0, inferred: 0 },
    ports: [],
    sample: '',
    seenWith: [],
    sessions: [],
    firstSeen: now,
    lastSeen: now,
    isHidden: false,
  }
  return {
    ...base,
    counts: {
      ...base.counts,
      [sighting.counter]: base.counts[sighting.counter] + 1,
      refused: base.counts.refused + (sighting.reason === 'refused' ? 1 : 0),
    },
    ports: sighting.ports.reduce((list, port) => joinNewest(list, port, PORT_LIMIT), base.ports),
    seenWith: sighting.program === '' ? base.seenWith : joinNewest(base.seenWith, sighting.program, PROGRAM_LIMIT),
    sessions: sessionId === null ? base.sessions : joinNewest(base.sessions, sessionId, SESSION_LIMIT),
    // A folder keeps a protected or key file as its sample, so a later write beside it cannot bring Allow back.
    sample: base.kind === 'path' && isGuardedPath(base.sample) && !isGuardedPath(sighting.detail) ? base.sample : sighting.detail,
    lastSeen: now,
  }
}

export function sightingTotal(counts: SandboxTunerCounts): number {
  return counts.blocked + counts.listed + counts.inferred
}

export function allowCount(counts: SandboxTunerCounts): number {
  return sightingTotal(counts) - counts.refused
}

export function isRecord(value: unknown): value is SandboxTunerRecord {
  if (!isPlainObject(value) || !isPlainObject(value.counts)) return false
  const counts = value.counts
  return (
    KINDS.has(value.kind) &&
    isText(value.target) &&
    value.key === `${String(value.kind)}:${value.target}` &&
    COUNTERS.every(name => isCount(counts[name])) &&
    isListOf(value.ports, isCount) &&
    isText(value.sample) &&
    isListOf(value.seenWith, isText) &&
    isListOf(value.sessions, isText) &&
    isCount(value.firstSeen) &&
    isCount(value.lastSeen) &&
    typeof value.isHidden === 'boolean'
  )
}

/** The record keys omitted from the display after 30 days or beyond the 300 newest targets. */
export function staleKeys(records: readonly SandboxTunerRecord[], now: number): string[] {
  const fresh = records.filter(record => now - record.lastSeen <= RECORD_AGE_MS)
  const kept = new Set([...fresh].sort((a, b) => b.lastSeen - a.lastSeen).slice(0, RECORD_LIMIT).map(record => record.key))
  return records.filter(record => !kept.has(record.key)).map(record => record.key)
}

/** The records that the display shows at `now`: each seen within 30 days, at most the 300 newest. */
export function shownRecords(records: readonly SandboxTunerRecord[], now: number): SandboxTunerRecord[] {
  const stale = new Set(staleKeys(records, now))
  return records.filter(record => !stale.has(record.key))
}

/**
 * A session that a view shows with scope session, and up to when: the current session with no end (`until` Infinity)
 * and each target that a record names it in (`keys` null), then each session that it branched from, up to the time of
 * that branch, with the targets that the branch record holds (lineageStep).
 */
export type Lineage = { session: string; until: number; keys: ReadonlySet<string> | null }

/** Whether a value is the record of the /branch that started `session` (LINEAGE_PREFIX). */
export function isLineage(value: unknown, session: string): value is SandboxTunerLineage {
  return isPlainObject(value) && value.session === session && isText(value.parent) && isCount(value.at) && isListOf(value.keys, isText)
}

/**
 * The next step of a lineage up: the session that the branch of the last session started from, with the targets that
 * it saw by that branch, up to the time of that branch or of any branch below it, whichever is first. Null after 10
 * steps, and when the step leads to a session of the lineage again.
 */
export function lineageStep(lineage: readonly Lineage[], branch: SandboxTunerLineage): Lineage | null {
  const last = lineage[lineage.length - 1]
  if (last === undefined || lineage.length > LINEAGE_LIMIT || lineage.some(item => item.session === branch.parent)) return null
  return { session: branch.parent, until: Math.min(last.until, branch.at), keys: new Set(branch.keys) }
}

/**
 * The targets that a record of `session` names by `at`, the time of a /branch from that session, each once and sorted:
 * what the branch record of that /branch keeps, so that a target record holds no time for each session. A record first
 * seen after `at` saw `session` after it too. A record that names other sessions keeps no time of `session`, so it
 * counts when it was first seen by `at`.
 */
export function keysSeenBy(records: readonly SandboxTunerRecord[], session: string, at: number): string[] {
  return [...new Set(records.filter(record => record.sessions.includes(session) && record.firstSeen <= at).map(record => record.key))].sort()
}

/**
 * The sessions whose branch records the store keeps after the /branch that started `current`: every one while there
 * are 200 or fewer. Past 200, the oldest go first, but never the record of `current` or of a branch that a target record
 * or an Undo journal entry names (`named`), nor the 9 records above each of those, which its view walks (lineageStep).
 * So more than 200 stay when those alone pass 200.
 */
export function keptBranches(branches: readonly SandboxTunerLineage[], named: ReadonlySet<string>, current: string): Set<string> {
  const kept = new Set(branches.map(branch => branch.session))
  if (kept.size <= BRANCH_LIMIT) return kept
  const bySession = new Map(branches.map(branch => [branch.session, branch]))
  const needed = new Set<string>()
  // Each walk takes all its steps: another walk can reach a record with fewer steps left.
  const keep = (session: string) => {
    let next = bySession.get(session)
    for (let step = 0; next !== undefined && step < LINEAGE_LIMIT; step += 1, next = bySession.get(next.parent)) needed.add(next.session)
  }
  keep(current)
  for (const branch of branches) if (named.has(branch.session)) keep(branch.session)
  const oldest = branches.filter(branch => !needed.has(branch.session))
    .sort((a, b) => a.at - b.at || (a.session < b.session ? -1 : a.session > b.session ? 1 : 0))
  for (const branch of oldest.slice(0, kept.size - BRANCH_LIMIT)) kept.delete(branch.session)
  return kept
}

/**
 * The sessions of the saved refusals (`saved`: each session and the time that its REFUSAL_PREFIX key holds), the newest
 * first. A time that is not valid counts as the oldest. Equal times go by session id, as in keptBranches.
 */
export function newestRefusals(saved: ReadonlyMap<string, unknown>): string[] {
  const timeOf = (value: unknown) => (isCount(value) ? value : -1)
  return [...saved].map(([session, at]) => ({ session, at: timeOf(at) }))
    .sort((a, b) => b.at - a.at || (a.session < b.session ? 1 : a.session > b.session ? -1 : 0))
    .map(item => item.session)
}

/** Whether a session of the lineage saw a target: by a record that names it, or by the branch record of the step. */
function isSeenBy(record: SandboxTunerRecord, { session, keys }: Lineage): boolean {
  return keys === null ? record.sessions.includes(session) : keys.has(record.key)
}

/** Every writer's record of each target that a session of the lineage saw by its time: so the counts keep every session. */
export function seenIn(records: readonly SandboxTunerRecord[], lineage: readonly Lineage[]): SandboxTunerRecord[] {
  const keys = new Set(records.filter(record => lineage.some(item => isSeenBy(record, item))).map(record => record.key))
  return records.filter(record => keys.has(record.key))
}

/** The journal entries that a press of a session of the lineage saved by its time. An entry of Sandbox Tuner 1.1.3 names no session. */
export function appliedIn(journal: readonly SandboxTunerApplied[], lineage: readonly Lineage[]): SandboxTunerApplied[] {
  return journal.filter(entry => lineage.some(item => entry.session === item.session && entry.appliedAt <= item.until))
}

/** The 50 newest history entries plus every unresolved edit, oldest first. */
export function journalOf(entries: readonly SandboxTunerApplied[]): SandboxTunerApplied[] {
  const sorted = [...entries].sort((a, b) => a.appliedAt - b.appliedAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const unresolved = (entry: SandboxTunerApplied) => entry.applyState === 'pending' || isUndoUnresolved(entry)
  const history = sorted.filter(entry => !unresolved(entry)).slice(-JOURNAL_LIMIT)
  return sorted.filter(entry => unresolved(entry) || history.includes(entry))
}

/** An unconfirmed removal retains its retry action. */
export function isUndoUnresolved(entry: SandboxTunerApplied): boolean {
  return entry.undoState === 'pending' || entry.undoState === 'retry'
}

export function hasLaterOwner(journal: readonly SandboxTunerApplied[], entry: SandboxTunerApplied): boolean {
  return journal.some(item => item.id !== entry.id && item.file === entry.file && item.settingsKey === entry.settingsKey &&
    (entry.settingsKey === 'sandbox.filesystem.allowWrite' ? item.entry === entry.entry : normalHost(item.entry) === normalHost(entry.entry)) &&
    item.appliedAt >= entry.appliedAt)
}

export function isPressedAgain(journal: readonly SandboxTunerApplied[], written: SandboxTunerApplied): boolean {
  return hasLaterOwner(journal, written) || journal.some(item => item.id === written.id && item.undoneAt !== written.undoneAt)
}

/** True when a press changed settings for the target of the latest block at or after that block. */
export function isFixedSince(journal: readonly SandboxTunerApplied[], latest: SandboxTunerLatest): boolean {
  return journal.some(entry => entry.applyState !== 'pending' && entry.recordKey === latest.recordKey && entry.appliedAt >= latest.at)
}

/** Combine independent writers without losing a protected sample or inferred evidence. */
export function aggregateRecords(records: readonly SandboxTunerRecord[]): SandboxTunerRecord[] {
  const result = new Map<string, SandboxTunerRecord>()
  for (const record of [...records].sort((a, b) => a.lastSeen - b.lastSeen)) {
    const previous = result.get(record.key)
    if (previous === undefined) { result.set(record.key, record); continue }
    result.set(record.key, {
      ...record,
      counts: {
        blocked: previous.counts.blocked + record.counts.blocked,
        refused: previous.counts.refused + record.counts.refused,
        listed: previous.counts.listed + record.counts.listed,
        inferred: previous.counts.inferred + record.counts.inferred,
      },
      sample: isGuardedPath(previous.sample) ? previous.sample : record.sample,
      ports: mergeNewest(previous.ports, record.ports, PORT_LIMIT),
      seenWith: mergeNewest(previous.seenWith, record.seenWith, PROGRAM_LIMIT),
      sessions: mergeNewest(previous.sessions, record.sessions, SESSION_LIMIT),
      firstSeen: Math.min(previous.firstSeen, record.firstSeen),
    })
  }
  return [...result.values()]
}

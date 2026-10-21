// The diagnostic form: the mod, the event, and the cause.

import type { SandboxTunerScope } from '../types'

const MOD = 'sandbox-tuner'

export function diagnostic(event: string, detail: string | null, cause: string): string {
  return `${MOD}: ${event}${detail === null ? '' : ` (${detail})`}: ${cause}`
}

export function causeOf(error: unknown): string {
  return error instanceof Error && error.message !== '' ? error.message : String(error)
}

/** A failure that names a saved key, which can name a target of another session. */
export class KeyFailure extends Error {
  readonly reason: string

  constructor(reason: string, key: string) {
    super(`${reason}: ${key}`)
    this.reason = reason
  }
}

/**
 * The cause of a failure as the band, the pane, and the report show it. With scope session, a failure that names a
 * saved key leaves the key out, so that no target of another session shows. The debug log keeps the full cause.
 */
export function shownCause(scope: SandboxTunerScope, error: unknown): string {
  return scope === 'session' && error instanceof KeyFailure ? `${error.reason} (the debug log names its key)` : causeOf(error)
}

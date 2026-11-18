// Reads the Bash and Monitor calls of transcript rows, and their stored results, into the call and outcome of one call.

import { EXIT_CODE } from './sightings'
import type { BashCall, BashOutcome } from './sightings'

type Tool = 'Bash' | 'Monitor'
/** One tool call of a request row: its tool use id, its tool, and the input that Claude gave it. */
export type ToolUse = { id: string; tool: Tool; input: Record<string, unknown> }
/** One tool result of a result row: the tool use id of its call, the text that Claude read, and whether the call failed. */
export type ToolResult = { id: string; text: string; isError: boolean }

// The text that starts the result of a background Bash call, and of a Monitor launch, with the id of the task.
const BACKGROUND_TEXT = /^Command running in background with ID: ([\w-]+)/
const MONITOR_TEXT = /^Monitor started \(task ([\w-]+)/

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

/** The Bash and Monitor calls among the blocks of a request row. */
export function toolUsesOf(content: readonly unknown[]): ToolUse[] {
  return content.flatMap(block => {
    if (!isObject(block) || block.type !== 'tool_use' || typeof block.id !== 'string' || !isObject(block.input)) return []
    return block.name === 'Bash' || block.name === 'Monitor' ? [{ id: block.id, tool: block.name, input: block.input }] : []
  })
}

/** The text of a tool result's content: the string, or its text blocks joined with a newline. */
function contentText(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content.flatMap(block => (isObject(block) && block.type === 'text' && typeof block.text === 'string' ? [block.text] : [])).join('\n')
}

/** The tool results among the blocks of a result row. */
export function toolResultsOf(content: readonly unknown[]): ToolResult[] {
  return content.flatMap(block => {
    if (!isObject(block) || block.type !== 'tool_result' || typeof block.tool_use_id !== 'string') return []
    return [{ id: block.tool_use_id, text: contentText(block.content), isError: block.is_error === true }]
  })
}

/**
 * The record that the transcript stored for call `id`, in the messages that `$.session.messages()` returned: the
 * `result` of its tool use or of its tool result, when it is an object. A failed call stores its error text, and a call
 * inside a Code Mode script stores nothing.
 */
export function storedResult(messages: readonly unknown[], id: string): Record<string, unknown> | undefined {
  for (const message of messages) {
    if (!isObject(message)) continue
    for (const summary of [message.toolUses, message.toolResults].flatMap(list => (Array.isArray(list) ? list : []))) {
      if (isObject(summary) && summary.tool_use_id === id && isObject(summary.result)) return summary.result
    }
  }
  return undefined
}

/**
 * The Bash or Monitor call `id` among the tool uses of the messages that `$.session.messages()` returned, with the id of
 * its message (`anchor`) when the read gave one: a read that names a range does. Undefined for a call of another tool,
 * a call with no input, and a call that the messages do not hold.
 */
export function storedUse(messages: readonly unknown[], id: string): { use: ToolUse; anchor: string | undefined } | undefined {
  for (const message of messages) {
    if (!isObject(message) || !Array.isArray(message.toolUses)) continue
    for (const summary of message.toolUses) {
      if (!isObject(summary) || summary.tool_use_id !== id) continue
      if ((summary.tool !== 'Bash' && summary.tool !== 'Monitor') || !isObject(summary.input)) return undefined
      return { use: { id, tool: summary.tool, input: summary.input }, anchor: typeof message.uuid === 'string' ? message.uuid : undefined }
    }
  }
  return undefined
}

/** The id of the task that the result text of a confirmed launch names: of a Bash call that asked for the background, or of a Monitor. */
function taskOfText(use: ToolUse, result: ToolResult): string | undefined {
  if (use.tool === 'Monitor') return MONITOR_TEXT.exec(result.text)?.[1]
  return use.input.run_in_background === true ? BACKGROUND_TEXT.exec(result.text)?.[1] : undefined
}

/**
 * Whether the call needs the record that the transcript stored for it. A failed call counts from its text alone (see
 * callOf), and so does a launch whose text names its task. A call with no command, and a Monitor that watches a
 * WebSocket, count nothing. A Bash call that succeeded keeps its sandbox report in the error output of its record,
 * apart from the text, and a Monitor launch keeps its task id there.
 */
export function needsResult(use: ToolUse, result: ToolResult): boolean {
  if (result.isError || typeof use.input.command !== 'string' || (use.tool === 'Monitor' && use.input.ws !== undefined)) return false
  return taskOfText(use, result) === undefined
}

/**
 * The call and its outcome, as `readCall` takes them, from the input, the result row, and the stored record (`stored`,
 * when there is one). Null when the call counts nothing: it has no command, its record says that it was interrupted,
 * it is a Bash call that failed with a text that does not start with `Exit code N`, or it is a Monitor that watches a
 * WebSocket, failed, or started no task. A failed call stores no record: only a command that ran gives an exit code,
 * and an interrupted, refused, or rejected call gives none. Without a stored record, a Bash call that succeeded has no
 * error output, so its sandbox report is unknown, and its text names a task only when the call asked for the background.
 */
export function callOf(use: ToolUse, result: ToolResult, stored: Record<string, unknown> | undefined): { call: BashCall; outcome: BashOutcome } | null {
  const { input } = use
  if (typeof input.command !== 'string' || stored?.interrupted === true) return null
  const allowedDomains = Array.isArray(input.allowed_domains) ? input.allowed_domains.filter((entry): entry is string => typeof entry === 'string') : []
  if (use.tool === 'Monitor') {
    const taskId = text(stored?.taskId) ?? taskOfText(use, result)
    if (input.ws !== undefined || result.isError || taskId === undefined) return null
    return { call: { command: input.command, isBackground: true, isUnsandboxed: false, allowedDomains }, outcome: { isDenied: false, isError: false, backgroundTaskId: taskId, text: '', stderr: '' } }
  }
  const call: BashCall = { command: input.command, isBackground: input.run_in_background === true, isUnsandboxed: input.dangerouslyDisableSandbox === true, allowedDomains }
  if (result.isError) return EXIT_CODE.test(result.text) ? { call, outcome: { isDenied: false, isError: true, text: result.text, stderr: '' } } : null
  const backgroundTaskId = stored === undefined ? taskOfText(use, result) : text(stored.backgroundTaskId)
  const isUnsandboxed = typeof stored?.dangerouslyDisableSandbox === 'boolean' ? stored.dangerouslyDisableSandbox : undefined
  const stderr = typeof stored?.stderr === 'string' ? stored.stderr : ''
  return { call, outcome: { isDenied: false, isError: false, backgroundTaskId, isUnsandboxed, text: result.text, stderr } }
}

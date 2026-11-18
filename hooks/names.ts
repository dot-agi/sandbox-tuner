// Naming rules for hosts, write folders, and commands.

type HostPort = { host: string; port: number | null }

const LABEL = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/
// IPv4 also accepts fewer components, octal digits, and hexadecimal components.
const IPV4 = /^(?:\d+|0x[0-9a-f]*)(?:\.(?:\d+|0x[0-9a-f]*)){0,3}$/i
const LOCAL_NAMESPACES = ['localhost', 'local', 'home.arpa', 'internal']
// Under HOME, `<root>/<name>/...` gives the cache folder `<root>/<name>` of any tool.
const NAMED_CACHE_ROOTS: readonly (readonly string[])[] = [['.cache'], ['Library', 'Caches']]
// Under HOME, `<cache>/...` gives `<cache>`: package caches that hold downloads only.
const PACKAGE_CACHES: readonly (readonly string[])[] = [
  ['.npm', '_cacache'],
  ['.cargo', 'registry'],
  ['.cargo', 'git'],
  ['.gradle', 'caches'],
  ['.m2', 'repository'],
  ['.local', 'share', 'pnpm', 'store'],
  ['Library', 'pnpm', 'store'],
]
const TEMP_ROOTS: readonly (readonly string[])[] = [
  ['', 'var', 'folders'],
  ['', 'private', 'var', 'folders'],
]
const TEMP_MARKERS: ReadonlySet<string> = new Set(['T', 'C'])
// The temp folder that every app shares. A folder strictly inside it is a temp folder. /tmp itself is too broad.
export const TMP = '/tmp'
const COMMAND_LIMIT = 120
// What the engine refuses in a text: control characters other than tab, newline, and carriage return, a lone
// surrogate, and its own placeholder character.
const UNDRAWABLE = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f\ud800-\udfff\u{10eeee}]/gu
const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/
// An assignment whose value holds no quote, substitution, brace, or escape: it ends at the next space.
const PLAIN_ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=[^'"`$(){}\\]*$/
// A file name: at most 255 characters, the most a file system takes.
const PROGRAM_NAME = /^[\w.+-]{1,255}$/
// Programs that only read: a permission error of one names a place that it read, never a folder that it wrote.
const READ_ONLY_PROGRAMS: ReadonlySet<string> = new Set(['ls', 'cat', 'head', 'tail', 'grep', 'rg', 'find', 'stat', 'file', 'wc', 'du', 'df', 'tree'])
// The operators that join the commands of one command line.
const COMMAND_SEPARATOR = /&&|\|\||[;|&\n]/g
// The characters outside quotes after which a word starts: a blank or an operator. A `#` there starts a comment. A
// parenthesis is not one of them: it is a form that the scanner does not read (UNCERTAIN_FORMS).
const WORD_BREAK: ReadonlySet<string> = new Set([' ', '\t', '\n', ';', '&', '|', '<', '>'])
// Where the scanner reads a character: outside quotes, in double quotes, or in a command substitution outside quotes.
type Place = 'bare' | 'double' | 'substitution'
// The forms that the scanner cannot read with certainty, each with the places where it starts. A command line that
// holds one is not read-only (isReadOnlyCommand), so Sandbox Tuner guesses from it as from any other command. Outside
// single quotes and comments, each form is tested where it can start.
const UNCERTAIN_FORMS: readonly { form: RegExp; places: readonly Place[] }[] = [
  // A backslash-newline: the shell joins the two lines, so a `#` after it can start a comment.
  { form: /\\\n/y, places: ['bare', 'double', 'substitution'] },
  // A here-document, `<<` but not `<<<`: its lines are text, not commands.
  { form: /(?<!<)<<(?!<)/y, places: ['bare', 'substitution'] },
  // An ANSI-C quote, `$'...'`: a backslash in it keeps a `'` in the quote.
  { form: /\$'/y, places: ['bare', 'substitution'] },
  // A parenthesis outside `$(...)`: a subshell, a function, an array, an extended glob, a process substitution (`<(`,
  // `>(`, or zsh's `=(`), or a zsh glob flag or qualifier. A process substitution, or a qualifier such as
  // `*(e:'cmd':)`, runs a command.
  { form: /[()]/y, places: ['bare'] },
  // A `${...}` that does not end, or whose text before the first `}` holds a quote, a backslash, a backtick, a brace, a
  // parenthesis, or a newline. bash ends `${x:-{a} b}` at the first `}`, zsh at the second, and zsh reads the `(e)` of
  // `${(e)x}` as a flag that runs the value. Any other `${...}` ends at its first `}`, and the scanner reads it as one word.
  { form: /\$\{(?![^'"`\\{}()\n]*\})/y, places: ['bare', 'double', 'substitution'] },
  // A `#` at the start of a word in a command substitution: the comment that it starts can hold the `)` that seems to
  // end the substitution, or a quote.
  { form: /(?<=[\s;&|<>()`])#/y, places: ['substitution'] },
]
// The start of an error line that a program printed: its name, or its path, then a colon.
const ERROR_PROGRAM = /^(\S+?): /
// Protected names that hold in any folder: settings or code in them can run outside the sandbox.
export const CLAUDE_PROTECTED: ReadonlySet<string> = new Set(['settings.json', 'settings.local.json', 'skills', 'agents', 'commands', 'hooks', 'workflows', 'scheduled_tasks.json'])
const GIT_PROTECTED: ReadonlySet<string> = new Set(['hooks', 'config'])
const EDITOR_FOLDERS: ReadonlySet<string> = new Set(['.vscode', '.idea'])
const MCP_FILE = '.mcp.json'
// Shell startup files and the git configuration.
const STARTUP_FILES: ReadonlySet<string> = new Set(['.bashrc', '.bash_profile', '.bash_login', '.bash_logout', '.profile', '.zshrc', '.zshenv', '.zprofile', '.zlogin', '.zlogout', '.gitconfig'])
/** Every protected place that a folder can hold, as a path from that folder. */
export const PROTECTED_PLACES: readonly string[] = [
  ...[...CLAUDE_PROTECTED].map(name => `.claude/${name}`),
  ...[...GIT_PROTECTED].map(name => `.git/${name}`),
  ...EDITOR_FOLDERS,
  MCP_FILE,
  ...STARTUP_FILES,
]
const KEY_FILE = /\.(?:pem|key)$/i

/** A host as the sandbox compares it: lowercase, one trailing dot cut. */
export function normalHost(host: string): string {
  const lower = host.toLowerCase()
  return lower.endsWith('.') ? lower.slice(0, -1) : lower
}

/** The host and port of `host:port`, `[v6]:port`, or a bare host. */
export function splitHost(text: string): HostPort {
  const isBracketed = text.startsWith('[')
  const end = isBracketed ? text.indexOf(']') + 1 : text.lastIndexOf(':')
  const hasPort = end > 0 && /^:\d+$/.test(text.slice(end))
  return {
    host: normalHost(hasPort || isBracketed ? text.slice(0, end) : text),
    port: hasPort ? Number(text.slice(end + 1)) : null,
  }
}

/** True for a DNS name of two or more labels that is no IP literal and no local name. */
export function isDnsName(host: string): boolean {
  const labels = host.split('.')
  return (
    host.length <= 253 &&
    labels.length >= 2 &&
    !IPV4.test(host) &&
    !LOCAL_NAMESPACES.some(name => host === name || host.endsWith(`.${name}`)) &&
    labels.every(label => label.length <= 63 && LABEL.test(label))
  )
}

/** Whether a settings host entry covers the host on every given port. A record keeps at most five ports, so an earlier port can be missing. */
export function hostMatches(entry: string, host: string, ports: readonly number[]): boolean {
  const pattern = splitHost(entry.trim())
  const isPortMatch = pattern.port === null || (ports.length > 0 && ports.every(port => port === pattern.port))
  if (!isPortMatch) return false
  if (pattern.host === '*') return true
  if (pattern.host.startsWith('*.')) return host.endsWith(pattern.host.slice(1))
  return pattern.host === host
}

/** True when `path` is `folder` or lies inside it. */
export function isUnder(path: string, folder: string): boolean {
  const base = folder.replace(/\/+$/, '')
  return path === base || path.startsWith(`${base}/`)
}

/** `path` made absolute from `base` when relative, with `.`, `..`, and empty segments resolved, as the sandbox resolves it. */
export function absolutePath(path: string, base: string): string {
  const parts: string[] = []
  for (const part of (path.startsWith('/') ? path : `${base}/${path}`).split('/')) {
    if (part === '..') parts.pop()
    else if (part !== '' && part !== '.') parts.push(part)
  }
  return `/${parts.join('/')}`
}

/**
 * The folders of a PATH value as the shell spells them, each made absolute: an empty or relative entry (an empty PATH
 * too) starts at the working directory. The spelling stays, because the system follows a link before a `..` after it.
 */
export function pathFolders(value: string | undefined, cwd: string): string[] {
  return value === undefined ? [] : value.split(':').map(entry => (entry.startsWith('/') ? entry : `${cwd}/${entry}`))
}

/** A path that a protected name covers in any folder, in any letter case: many file systems ignore case. */
export function isProtectedName(path: string): boolean {
  const parts = path.toLowerCase().split('/')
  const last = parts.at(-1) ?? ''
  const follows = (segment: string, names: ReadonlySet<string>) => parts.some((part, index) => part === segment && names.has(parts[index + 1] ?? ''))
  return follows('.claude', CLAUDE_PROTECTED) || follows('.git', GIT_PROTECTED) || parts.some(part => EDITOR_FOLDERS.has(part)) || last === MCP_FILE || STARTUP_FILES.has(last)
}

/** A key or certificate file, by its name, in any letter case. */
export function isKeyFile(path: string): boolean {
  return KEY_FILE.test(path)
}

/** A denied path whose name alone rules out Allow for its folder: a protected name or a key file. */
export function isGuardedPath(path: string): boolean {
  return isProtectedName(path) || isKeyFile(path)
}

/** `~/...` for a path under HOME, else the path. */
export function displayPath(path: string, home: string | undefined): string {
  return home !== undefined && isUnder(path, home) ? `~${path.slice(home.length)}` : path
}

function startsWithParts(parts: readonly string[], prefix: readonly string[]): boolean {
  return prefix.every((part, index) => parts[index] === part)
}

/** How many leading parts name the macOS per-user temp (T) or cache (C) folder, or null. */
function sharedFolderLength(parts: readonly string[]): number | null {
  const root = TEMP_ROOTS.find(prefix => startsWithParts(parts, prefix) && TEMP_MARKERS.has(parts[prefix.length + 2] ?? ''))
  return root === undefined ? null : root.length + 3
}

/**
 * How many leading parts name the cache or temp folder that holds the path, or null. A folder (`isFolder`) can be that
 * cache or temp folder itself.
 */
function cacheLength(parts: readonly string[], home: string | undefined, isFolder: boolean): number | null {
  // An empty, `.`, or `..` segment makes the text name another folder (`~/.cache/..` is HOME), so no cache holds it.
  if (parts.slice(1).some(part => part === '' || part === '.' || part === '..')) return null
  // The parts that a path must have past the cache folder: a file lies in it, a folder can be it.
  const past = isFolder ? 0 : 1
  const shared = sharedFolderLength(parts)
  if (shared !== null) return parts.length >= shared + past ? shared : null
  const homeParts = home?.split('/')
  if (homeParts === undefined || !startsWithParts(parts, homeParts)) return null
  const rest = parts.slice(homeParts.length)
  // `<root>/<name>/...`: a file directly in a root names no cache.
  const named = NAMED_CACHE_ROOTS.find(root => startsWithParts(rest, root) && rest.length >= root.length + 1 + past)
  if (named !== undefined) return homeParts.length + named.length + 1
  const store = PACKAGE_CACHES.find(cache => startsWithParts(rest, cache) && rest.length >= cache.length + past)
  return store === undefined ? null : homeParts.length + store.length
}

/**
 * The cache or temp folder that holds a denied path, or null when none does. A folder that a command tried to create
 * (`isFolder`) can be its own cache folder, such as `~/.cache/tool` from `mkdir ~/.cache/tool`.
 */
export function cacheFolder(path: string, home: string | undefined, isFolder = false): string | null {
  const parts = path.split('/')
  const length = cacheLength(parts, home, isFolder)
  return length === null ? null : parts.slice(0, length).join('/')
}

/**
 * The folder target of a denied path: its cache or temp folder, else the folder that holds it. A folder that a command
 * tried to create (`isFolder`) is its own target when no cache folder holds it.
 */
export function folderTarget(path: string, home: string | undefined, isFolder = false): string {
  return cacheFolder(path, home, isFolder) ?? (isFolder ? path : path.slice(0, path.lastIndexOf('/')) || '/')
}

/**
 * Whether a folder lies strictly inside `tmp`: /tmp as spelled, or where a press found it. It compares spellings, as
 * cacheLength does, so a spelling with an empty, `.`, or `..` segment names no temp folder. `tmp` holds no temp folder
 * when it holds HOME or HOME holds it, in any letter case: many file systems ignore case.
 */
export function isTempFolder(folder: string, home: string | undefined, tmp = TMP): boolean {
  if (folder.split('/').slice(1).some(part => part === '' || part === '.' || part === '..')) return false
  const [foldedHome, foldedTmp] = [home?.toLowerCase(), tmp.toLowerCase()]
  if (foldedHome !== undefined && (isUnder(foldedHome, foldedTmp) || isUnder(foldedTmp, foldedHome))) return false
  return folder !== tmp && isUnder(folder, tmp)
}

/** True for the macOS per-user temp or cache folder, or a folder strictly inside /tmp: every app of the person shares it. */
export function isSharedFolder(path: string): boolean {
  const parts = path.split('/')
  return sharedFolderLength(parts) === parts.length || isTempFolder(path, undefined)
}

/** The text cut to at most `limit` characters, with `…` when cut, never between the two halves of one character. */
export function cutText(text: string, limit: number): string {
  if (text.length <= limit) return text
  const end = /[\ud800-\udbff]/.test(text.charAt(limit - 2)) ? limit - 2 : limit - 1
  return `${text.slice(0, end)}…`
}

/** The text with each character that the engine refuses to show replaced by `�`. */
export function plainText(text: string): string {
  return text.replace(UNDRAWABLE, '\ufffd')
}

/** A command as one line of at most 120 characters. */
export function commandLine(command: string): string {
  return cutText(plainText(command.replace(/\s+/g, ' ').trim()), COMMAND_LIMIT)
}

/**
 * The program name of a command, for `seenWith`, or '' when none is sure. A quoted or substituted assignment value
 * can hold spaces, so the word after it may be part of that value, such as a token: no name is taken then.
 */
export function programName(command: string): string {
  const words = command.trim().replace(/^(?:cd\s+\S+\s*&&\s*)+/, '').split(/\s+/)
  const index = words.findIndex(word => !ASSIGNMENT.test(word))
  if (index === -1 || !words.slice(0, index).every(word => PLAIN_ASSIGNMENT.test(word))) return ''
  const [word = ''] = words.slice(index, index + 1)
  const program = word.slice(word.lastIndexOf('/') + 1)
  return PROGRAM_NAME.test(program) ? program : ''
}

/** Whether a form that the scanner cannot read with certainty (UNCERTAIN_FORMS) starts at `index`, in `place`. */
function isUncertainAt(command: string, index: number, place: Place): boolean {
  return UNCERTAIN_FORMS.some(({ form, places }) => {
    form.lastIndex = index
    return places.includes(place) && form.test(command)
  })
}

/**
 * The index just past the end of the command substitution whose backtick or `(` of `$(` is at `start`, -1 when it does
 * not end, or null when a form that the scanner cannot read with certainty (UNCERTAIN_FORMS) starts before its end. A
 * `$(` ends at the `)` that matches it outside quotes, and a backtick at the next backtick. A backslash keeps the next
 * character from ending it, and so does a `${...}`.
 */
function substitutionEnd(command: string, start: number): number | null {
  const isBacktick = command.charAt(start) === '`'
  // The `(` at `start` is open.
  let depth = 1
  let quote = ''
  for (let index = start + 1; index < command.length; index += 1) {
    const char = command.charAt(index)
    if (quote === "'") {
      if (char === "'") quote = ''
      continue
    }
    if (isUncertainAt(command, index, quote === '"' ? 'double' : 'substitution')) return null
    // A `${...}` that is not uncertain ends at its first `}`.
    if (char === '$' && command.charAt(index + 1) === '{') index = command.indexOf('}', index)
    else if (char === '\\') index += 1
    else if (isBacktick) {
      if (char === '`') return index + 1
    } else if (quote === '"') {
      if (char === '"') quote = ''
    } else if (char === "'" || char === '"') quote = char
    else if (char === '(') depth += 1
    else if (char === ')') {
      depth -= 1
      if (depth === 0) return index + 1
    }
  }
  return -1
}

// What does not end before the end of a part of a command line: a quote, a command substitution, or nothing ('').
type Open = '' | 'quote' | 'substitution'
// A part of a command line as wordsHidden shows it, the start and the end of each comment in it, and what does not end.
type HiddenPart = { shown: string; comments: [number, number][]; open: Open }

/**
 * The text of `command` from `from` to `to` as wordsHidden shows it in `shown`, or null when a form that the scanner
 * cannot read with certainty (UNCERTAIN_FORMS) starts in it. Outside quotes, a character is in `place`: `bare` on the
 * command line, `substitution` in the text of a command substitution. From a substitution that does not end before
 * `to`, the text stays as it is.
 */
function hiddenPart(command: string, from: number, to: number, place: 'bare' | 'substitution'): HiddenPart | null {
  let shown = ''
  const comments: [number, number][] = []
  let quote = ''
  // Whether the next character starts a word.
  let wordStart = true
  for (let index = from; index < to; index += 1) {
    const char = command.charAt(index)
    if (quote === "'") {
      if (char === "'") quote = ''
      shown += char === "'" ? char : ' '
      continue
    }
    if (isUncertainAt(command, index, quote === '"' ? 'double' : place)) return null
    if (char === '`' || (char === '$' && command.charAt(index + 1) === '(')) {
      const end = substitutionEnd(command, char === '$' ? index + 1 : index)
      if (end === null) return null
      if (end < 0 || end > to) return { shown: shown + command.slice(index, to), comments, open: 'substitution' }
      const text = substitutionShown(command, index, end)
      if (text === null) return null
      shown += text
      index = end - 1
      wordStart = false
      continue
    }
    if (char === '$' && command.charAt(index + 1) === '{') {
      // A `${...}` that is not uncertain ends at its first `}`.
      const end = command.indexOf('}', index) + 1
      shown += ' '.repeat(end - index)
      index = end - 1
      wordStart = false
      continue
    }
    if (char === '\\') {
      shown += index + 1 < to ? '\\ ' : '\\'
      index += 1
      wordStart = false
      continue
    }
    if (quote === '"') {
      if (char === '"') quote = ''
      shown += char === '"' ? char : ' '
      continue
    }
    // In a substitution, a `#` at the start of a word is uncertain (UNCERTAIN_FORMS): only the command line has comments.
    if (char === '#' && wordStart) {
      // The comment ends before the newline, which the next step reads as an operator.
      const newline = command.indexOf('\n', index)
      const end = newline < 0 || newline > to ? to : newline
      shown += ' '.repeat(end - index)
      comments.push([index, end])
      index = end - 1
      continue
    }
    if (char === "'" || char === '"') quote = char
    shown += char
    wordStart = WORD_BREAK.has(char)
  }
  return { shown, comments, open: quote === '' ? '' : 'quote' }
}

/**
 * The command substitution from its `$` or backtick at `start` to `end` as wordsHidden shows it, or null when a form
 * that the scanner cannot read with certainty (UNCERTAIN_FORMS) starts in it. The shell runs its text as a command with
 * its own quotes, so the rules of the command line show that text, with `substitution` as the place outside quotes. The
 * substitution stays as it is when a quote or a substitution in its text does not end there. A backtick pair that holds
 * a backslash stays as it is too: there the shell takes a backslash away before a `$`, a backtick, or a backslash, then
 * reads the command, so a quote can differ from the quote that it seems.
 */
function substitutionShown(command: string, start: number, end: number): string | null {
  const text = command.slice(start, end)
  const isBacktick = text.startsWith('`')
  if (isBacktick && text.includes('\\')) return text
  const from = start + (isBacktick ? 1 : 2)
  const part = hiddenPart(command, from, end - 1, 'substitution')
  if (part === null) return null
  return part.open === '' ? command.slice(start, from) + part.shown + command.slice(end - 1, end) : text
}

/**
 * A command line as the shell reads it, in two forms of its length. In `shown`, each character that a quote or a
 * backslash makes part of a word, and each character of a comment, is replaced by a space: a `|`, `;`, `&`, newline, or
 * `>` there joins no command and sends nothing into a file. In `bare`, only each character of a comment is replaced.
 * Outside quotes, a `#` at the start of a word (WORD_BREAK) starts a comment that ends at the end of the line: a quote,
 * a backslash, or a substitution in it is part of the comment. Inside double quotes, a backslash keeps the next
 * character in the quote. The text of a command substitution, `$(...)` or a backtick pair outside single quotes, is a
 * command that the shell runs, with its own quotes: the same rules show it (substitutionShown), so an operator outside
 * its quotes counts, and one inside them does not. After it, the quote before it goes on. A `${...}` outside single
 * quotes is part of one word up to its first `}`: nothing in it starts a comment or breaks the word, so it is replaced
 * in `shown`. From a substitution that does not end, and in a line whose quote does not close, the text stays as it is.
 * A line that holds a form that the scanner cannot read with certainty (UNCERTAIN_FORMS) gives null.
 */
function wordsHidden(command: string): { shown: string; bare: string } | null {
  const part = hiddenPart(command, 0, command.length, 'bare')
  if (part === null) return null
  if (part.open === 'quote') return { shown: command, bare: command }
  const bare = part.comments.reduce((text, [start, end]) => text.slice(0, start) + ' '.repeat(end - start) + text.slice(end), command)
  return { shown: part.shown, bare }
}

/**
 * Whether every program of a command line only reads (READ_ONLY_PROGRAMS), and the line sends no output into a file.
 * Only an operator outside quotes and comments splits the line (wordsHidden). A part that holds only a comment, or a
 * `cd`, changes nothing. A command whose program name is not sure counts as one that can write, and so does a line that
 * holds a form that the scanner cannot read with certainty (UNCERTAIN_FORMS).
 */
export function isReadOnlyCommand(command: string): boolean {
  const hidden = wordsHidden(command)
  if (hidden === null) return false
  const { shown, bare } = hidden
  if (shown.includes('>')) return false
  const parts: string[] = []
  let start = 0
  for (const separator of shown.matchAll(COMMAND_SEPARATOR)) {
    parts.push(bare.slice(start, separator.index))
    start = separator.index + separator[0].length
  }
  parts.push(bare.slice(start))
  const programs = parts.filter(part => part.trim() !== '').map(programName).filter(program => program !== 'cd')
  return programs.length > 0 && programs.every(program => READ_ONLY_PROGRAMS.has(program))
}

/** Whether an error line starts with the name or the path of a program that only reads, as `ls: /path: ...` does. */
export function isReadOnlyLine(line: string): boolean {
  const [, program = ''] = ERROR_PROGRAM.exec(line) ?? []
  return READ_ONLY_PROGRAMS.has(program.slice(program.lastIndexOf('/') + 1))
}

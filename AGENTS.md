# Agent instructions for Sandbox Tuner

Sandbox Tuner is a Claude Code mod. It explains sandbox blocks and turns recurring blocks into reviewed, undoable edits of the user settings file.

## Install and update

Install with Claude Code 2.1.292 or later. The second part turns on auto-update. It runs only when the install succeeds and the marketplace entry exists:

```sh
claude plugin install sandbox-tuner --marketplace dot-agi/sandbox-tuner --scope user --json \
  && f="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/settings.json" \
  && jq -e --arg name sandbox-tuner '.extraKnownMarketplaces[$name].source' "$f" > /dev/null \
  && tmp=$(mktemp "$f.XXXXXX") \
  && { jq --arg name sandbox-tuner '.extraKnownMarketplaces[$name].autoUpdate = true' "$f" > "$tmp" && mv "$tmp" "$f" || { rm -f "$tmp"; false; }; }
```

Claude Code 2.1.288 to 2.1.291 has no `--marketplace` option. Add the marketplace first, then run the auto-update part above:

```sh
claude plugin marketplace add dot-agi/sandbox-tuner --scope user --json \
  && claude plugin install sandbox-tuner@sandbox-tuner --scope user --json
```

Auto-update runs only in interactive sessions. In a headless job, update at the start, before the session that uses the mod:

```sh
claude plugin update sandbox-tuner@sandbox-tuner --json
```

Check the result. The first command prints the installed version. The second prints the latest release:

```sh
claude plugin list --json | jq -r '.[] | select(.id == "sandbox-tuner@sandbox-tuner") | "\(.version) enabled=\(.enabled)"' \
  && git ls-remote --tags --refs https://github.com/dot-agi/sandbox-tuner 'sandbox-tuner--v*' | sed 's/.*--v//' | sort -V | tail -n 1
```

- On a host with no SSH key for GitHub, set `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` in the environment of every `claude` command and session.
- New code loads in the next session, or after `/reload-plugins`. An agent cannot type `/reload-plugins`, so start a new session.
- Running `install` again does not update. Use `update`.
- The `mv` replaces the settings file, with mode 600. If `settings.json` is a symbolic link, edit its target instead.

## Layout

| Path | Content |
| --- | --- |
| `.claude-plugin/plugin.json` | The manifest, the `types` contract, and the `minimumSightings`, `linkCheckMinutes`, and `scope` options. |
| `.claude-plugin/marketplace.json` | The one-plugin marketplace. |
| `hooks/hooks.json` | Names the hooks module, `./register.tsx`. |
| `hooks/register.tsx` | Every hook and every `$` call: recording, loading, presses, band, pane, and command. |
| `hooks/views.tsx` | The band tree, the pane tree, and the text report. |
| `hooks/words.ts` | The sentences of the band, the pane, the report, the command, and the notices. |
| `hooks/verdicts.ts` | The verdict of each target against the current settings. |
| `hooks/settings-file.ts` | Parses, edits, and serializes the user settings file, formats and parses the record of its lock file, and checks the shape of a journal entry. |
| `hooks/sightings.ts` | Reads one Bash call into sightings. |
| `hooks/records.ts` | The saved records and the journal: store keys, merge, shape, retention, the band's fixed-since rule, and the lineage of a branch. |
| `hooks/names.ts` | The naming rules for hosts, paths, cache folders, protected names, and commands. |
| `hooks/shapes.ts` | JSON shape checks. |
| `hooks/diagnostics.ts` | The diagnostic form, and the cause that the band, the pane, and the report show with `scope: session`. |
| `types/index.d.ts` | The shared types and the `$.state` contract. |
| `tests/` | Local test files (`*.test.ts`) for the test kit. Git does not track them. |

## Commands

Run them from the repository folder:

- Validate: `claude plugin validate .` (the marketplace) and `claude plugin validate .claude-plugin/plugin.json` (the plugin and its hooks module)
- Test: `claude plugin test .` (it needs at least one `*.test.ts` file under the folder)
- Type check: `tsc -p .`, after Claude Code wrote `.claude-plugin/types/` and `tsconfig.json` (see CONTRIBUTING.md)

## Conventions

- The pure modules take no `$`. They take every input as an argument.
- Every `$` call is in `hooks/register.tsx`, written in full. `$` goes only to top-level functions of that file and to `read` and `update`.
- Every sentence of the band, the pane, the report, the command, and the notices comes from `hooks/words.ts`. The cause of a diagnostic is written where the failure happens.
- Every failure path gives a diagnostic of the form `sandbox-tuner: <event> (<detail>): <cause>`, built by `diagnostic` in `hooks/diagnostics.ts`.
- Session values live in `$.state`. Values that outlive the session live in `$.store`, independent keys for each target and writer, separate Hide preferences, one key per journal entry, one key per branch, and one key per session in which Allow and Deny refuse after a sighting that could not be saved (`refusal:`, the 200 newest, loaded at `session.start` and at each switch, and read for the session at each switch and press). Claude Code resets `$.state` at `/clear`, `/resume`, and `/branch`, so a value that must cross that switch lives outside it, in the `register` closure or at the top of the module, such as the branches that could not keep a refusal (`unrestored`) and the branch records that wait in the queue (`waiting`). During the dispatch of `classic.SessionStart`, with the settings hooks beneath it, `$.session.id()` still names the session before at `/resume` and `/branch`, so read the current session with `sessionNow`. With managed settings or a Team or Enterprise sign-in, Claude Code's built-in guard keeps every `classic.*` event from mods, so `classic.SessionStart` may never come. So `session.end` with reason `clear` or `resume` keeps the switch (`pending`), and `settleSwitch` settles it once `$.session.id()` names another session: at the start of each hook, press, and timer, and at a poll of the session id. It never runs in a `ui.render` hook. While the id still names the session that ended, `sessionNow` rejects, so nothing counts for either session. An Allow or a Deny that starts then refuses with either scope (`runFix`), also when the switch settles while it waits in the queue. A settled `/resume` cannot be told from `/branch`, so it inherits nothing, and a session new to the process keeps the refusal of a session that ended with incomplete evidence. The module remembers only the 200 sessions that the process ran last since it loaded (`known`), so an older one counts as new. A refusal holds while the store keeps it. A press checks the refusal of its session in the store and in the module, as well as `$.state`: a press that settles a switch reads the `$.state` of before the switch. The module holds its own refusals (`incomplete`, at most 200) and every refusal that the store kept at the last load (`stored`): the bound of `incomplete` never drops one of `stored`. `classic.SessionStart` stays the main path: it takes the switch, and changes nothing for a `/clear` or `/resume` that `settleSwitch` settled already. Never delete another writer’s mutable evidence. Refresh durable evidence before a settings edit.
- A `ui.render` hook never writes state. One dispatch reads `$.state` at one moment, so never `read` a value right after you `update` it in the same dispatch.
- Compare paths only after `absolutePath` in `hooks/names.ts` resolved them. A folder Allow is rated again where the folder and every guarded place really lie (`checkRealFolder`), because a spelling can hide a link. The link walk skips the data folders of the config folder, and reads only two levels of each installed plugin and VS Code extension (`guardedWalks` in `hooks/verdicts.ts`).
- The pane keeps its drawing under the engine's text bound: each list stops at 25 rows or at the text budget in `hooks/views.tsx`.

## Rules

- Never write the settings file outside the `onPress` handler of a Sandbox Tuner Button.
- Never give a band Button a hotkey: a digit typed into an empty prompt would press it.
- Never suggest a write folder outside the cache and temp folders that `hooks/names.ts` names.
- Never offer, write, or suggest a command exclusion. Tools can execute model-written code through plugins, extensions, aliases, or hooks.
- Check each edit against the settings file snapshot read by the shared edit path before writing.
- Never suggest a wildcard, an IP address, a local host name, a protected or credentials path, a system folder, a folder on `PATH`, or a shell, interpreter, wrapper, opener, or runner.
- Never change a tool call, a tool result, or what the model reads.
- Never make a network request or start a process.
- Write a failing test before each change. Tests stub every `$` call and run no real command.
- Test the parsers, the verdicts, the state changes, and each main path a person takes. Run drawing tests on `terminal` and `desktop`. Keep the suite under one minute.
- Never commit a test file.
- If a hook or the sandbox blocks an action, stop and report it. Do not route around it.
- Use general examples only. Do not use hosts, paths, or names from a user's machine.

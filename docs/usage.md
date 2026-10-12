# Sandbox Tuner usage guide

Sandbox Tuner watches Bash results and confirmed shell Monitor launches of your Claude Code sessions for sandbox blocks. It explains the latest block in a band above the prompt, and it ranks the hosts and write folders that keep coming back in a pane. When a target recurs, it shows the exact settings change and its effect, and it writes that change only when you press a Button.

Requires Claude Code 2.1.288 or later with the sandbox enabled on macOS, Linux, or WSL2. Tested with Claude Code 2.1.296.

The sandbox applies to Bash commands. Sandbox Tuner does not observe Write or WebFetch tool blocks, or collect later background output.

## Sightings

A sighting is one observation of one target in a Bash call or confirmed shell Monitor launch. Sandbox Tuner counts three kinds:

| Sighting | Where it comes from |
| --- | --- |
| Blocked | A line of the `<sandbox_violations>` report that Claude Code adds to a Bash result: a refused network connection, or a refused file write. |
| Listed | A host that Claude named in the `allowed_domains` of a command that ran. In auto mode, Claude is asked to name each host that your allowlist does not cover. Sandbox Tuner skips a wildcard entry, such as `*.example.org`. Outside auto mode the list opens nothing, but it still shows that the command needs the host. |
| From error text | A permission error (`Operation not permitted`, `Read-only file system`) that names an absolute path or a simple relative path such as `.git/hooks/example`, in a sandboxed command that ran and whose sandbox report names no file. |

A target is one of these:

- A host, such as `registry.npmjs.org`.
- A write folder: the cache or temp folder of the denied path, such as `~/.cache/<tool>` for `~/.cache/<tool>/a/b`, else the folder that holds the denied file.

One call counts once per target and kind of sighting, even when several report lines name the target. So one call can count a host twice: once as listed and once as blocked. A refusal among those lines counts as a refusal. A refusal stays in the counts, such as `Seen 3 times`, but does not count toward `minimumSightings`. The Waiting line shows the count that does, such as `(0 so far)`.

A target keeps at most five distinct ports. Each Claude Code process saves its own record of a target, and in that record a new port pushes out the oldest one. To combine the records, Sandbox Tuner keeps the ports of the most recently updated record first, then the newest ports of the older records. So across sessions, the five kept ports are not always the five most recent ones. The pane, the report, and the checks against port-specific settings entries use only the kept ports.

One call counts at most three write folders. A further write folder in that call gets no count and no explanation. Sandbox Tuner reads only the last 200,000 characters of the output and of the error output of a call.

A host, path, or reason longer than 4,096 characters, or with a control character, is not counted: no real one is like that.

The pane and the report show at most the 300 newest targets seen within 30 days. The pane applies this limit each time it draws, so a new target can push the oldest one out of the list. Older targets stay saved: the limit applies only to what the pane and the report show.

## The band

On the terminal and in the desktop app, the band above the prompt explains the latest block of the session:

1. What was blocked, for which command, and why. For example: `Sandbox blocked example.org:443 for "curl -sI https://example.org". The host is not on your sandbox allowlist, so Claude must list it on each command.`
2. How often: `Seen 3 times in 2 sessions.`
3. The verdict, and the exact change and effect of each fix that it offers.
4. Its Buttons.

| Button | Shown when | What it does |
| --- | --- | --- |
| Allow | The target recurred enough and no rule refuses it | Adds the entry to your user settings file. |
| Deny | You refused the host at the network prompt, and no lock applies | Adds the host to `sandbox.network.deniedDomains`. |
| Open Sandbox Tuner | Always | Opens the pane. |
| Dismiss | Always | Hides the band for this target for the rest of the session. Dismissing another target replaces it. |

The band's Buttons have no hotkeys, so a number that you type alone into an empty prompt never presses one. Click a Button, or press Ctrl+X, then Tab, to give the band the focus, then Tab to the Button and Enter.
Ctrl+X, then Tab is Claude Code's own focus chord. Release Ctrl before Tab: many terminals read Ctrl+Tab as next tab.
In Emacs terminals, click the band's Button, or rebind `abovePrompt:focus` with [`/keybindings`](https://code.claude.com/docs/en/keybindings#above-prompt-actions).

The band hides once a press fixed its block. If the same target is blocked again after the fix, the band shows the block again and says that the cause is elsewhere.

Recognized read, Mach lookup, and socket report operations receive session-only explanations without Allow or saved counters. Unknown report operations are labeled unclassified.

The band yields to a survey. Other plugins keep their band rows below it.

## The pane

Run `/sandbox-tuner`, or press **Open Sandbox Tuner** in the band. The pane shows:

- The path of your user settings file.
- A line when the sandbox is off in this session.
- The last notice, and the last background problem when there is one.
- **Hosts** and **Write folders**. Each target shows its counts, its verdict, and its Buttons. Targets with a fix ready come first, then targets that wait for more sightings, then targets with no settings fix, then targets that your settings already allow.
- **Hidden**: the targets that you hid, each with **Unhide**. Hide a target that you never want to open. A target that your settings already allow has no **Hide**.
- **Applied**: the changes that Sandbox Tuner made, newest first, each with **Undo**. It keeps the 50 newest changes, plus each change whose addition or removal is unconfirmed.

Each list shows at most 25 rows, then `+<n> more`. A list also ends early when its next row would pass Sandbox Tuner's own text budget of 90,000 characters for the pane. That budget leaves room under the 100,000 characters that Claude Code draws in one drawing. The Applied list gets its room first. Use **Older changes** and **Newer changes** to reach every retained change, including changes beyond the row or text limit.

Esc closes the pane. Tab moves between its Buttons, Enter presses one, and the arrow keys scroll. Run `/sandbox-tuner` again to load the targets that other sessions saved.

## The `/sandbox-tuner` command

In an interactive session, `/sandbox-tuner` opens the pane and prints one line, such as `sandbox-tuner: 1 fix ready, 4 targets. The pane is open.` It runs at once, even while Claude works.

In `claude -p "/sandbox-tuner"`, it prints a text report with the same ranking. The report lists at most 25 targets in each section. When a surface cannot place the pane, the command prints the report and the reason. The command never writes settings.

## Verdicts

| Verdict | Meaning |
| --- | --- |
| Ready | The target has at least `minimumSightings` sightings, not counting network-prompt refusals. **Allow** shows its exact change and effect. |
| Waiting | The target has not recurred enough. A host that you refused at the network prompt offers **Deny**. |
| Covered | Your settings already allow the target. The row names the settings that allow it. |
| No fix | Sandbox Tuner offers no **Allow**, and the row says why. |

Sandbox Tuner offers no **Allow** for:

- Folders with any inferred sighting, including saved records mixed with explicit reports.
- IP addresses and local host names.
- A host that your settings already refuse.
- Any host while your organization's managed settings lock the network allowlist (`allowManagedDomainsOnly`). **Deny** is not offered there either, because the sandbox refuses unlisted hosts anyway.
- Paths whose settings or code can run outside the sandbox: Claude Code's config folder and any folder that holds it, the `.claude` settings files and folders, `.mcp.json`, `.git/hooks`, `.git/config`, `~/.config/git`, shell startup files, `.gitconfig`, `.vscode`, `.idea`, and a `.git` or `.claude` folder outside the working directory.
- Credentials folders such as `~/.ssh` and `~/.aws`, and `.pem` or `.key` files.
- These protected names and key files in any letter case, because many file systems ignore case: `.GIT/config` is `.git/config` on macOS.
- A cache folder where a blocked write named one of the protected files above or a key file. That write keeps the folder closed, whatever later writes name.
- System and software-install folders such as `/usr` and `/opt/homebrew`.
- A folder on your `PATH`, or a folder that holds one. An empty or relative `PATH` entry counts from the working directory.
- A folder that is too broad, such as your home folder.
- A folder name with `*`, `?`, or `[`.
- A folder in the working directory, where sandboxed commands can already write.
- A path under one of your `denyWrite` entries, Read or Edit deny rules, or other read rules. Uncertain denial patterns also withhold Allow, as does the read block of `permissions.blockReadsOutsideWorkingDirectories`.
- Any folder that is no cache or temp folder. Sandbox Tuner suggests `~/.cache/<tool>`, `~/Library/Caches/<app>`, the package caches of npm, Cargo, Gradle, Maven, and pnpm, and the macOS per-user temp and cache folders only.

Sandbox Tuner reads the paths of sandbox entries, such as `sandbox.filesystem.allowWrite`, `denyWrite`, `denyRead`, and credentials files, the way the sandbox does: `~/` is your home folder, `/` and `//` start an absolute path, and any other entry is relative to the config folder (`~/.claude` by default) in user settings or to the project root in project and local settings. A relative sandbox entry in command-line or managed settings has no known anchor: Sandbox Tuner ignores it as a grant and treats it as a denial of every folder. It resolves `.` and `..` in each entry before it compares.

Read and Edit rules in `permissions` use other anchors, as in Claude Code: `//` starts an absolute path, `~/` is your home folder, a single `/` is relative to the folder of the settings file (the config folder for user settings, the project root for project and local settings), and any other path is relative to the working directory. So `Edit(/cache/**)` in user settings names `~/.claude/cache`, and `Edit(//cache/**)` names `/cache`. A denial path with no `/` other than a trailing `/**`, such as `Read(.env)`, can match that name in any folder under the working directory. In command-line or managed settings, a single-`/` rule has no known anchor: such a denial withholds every folder fix, and such an Edit grant counts as no coverage.

Sandbox Tuner does not offer command exclusions. Tools can execute code the model writes through plugins, extensions, aliases, or hooks, even during inspection commands. When a block identifies a host or cache folder, Sandbox Tuner explains the block and offers that narrower fix when eligible.

Existing command exclusions remain in your settings. To remove one, edit your user settings file directly. Sandbox Tuner does not keep command targets or Undo entries for exclusions.

## The option

| Option | Default | Range | Meaning |
| --- | --- | --- | --- |
| `minimumSightings` | 3 | 1 to 100 | How many times a host or write folder must recur before Sandbox Tuner offers Allow. Network-prompt refusals stay in the counts but do not count toward it. |

Set it with `/plugin configure sandbox-tuner@sandbox-tuner`, or in `/config`.

## What a write changes

Each press changes one string in one of these keys of your user settings file: `~/.claude/settings.json`, or `settings.json` in the folder that `CLAUDE_CONFIG_DIR` names. A relative `CLAUDE_CONFIG_DIR` counts from the session's project root, which `/cd` or a worktree move can change, so set it to an absolute path.

| Fix | Key | Effect |
| --- | --- | --- |
| Allow a host | `sandbox.network.allowedDomains` | Sandboxed commands in every project reach the host on any port, with no prompt and no per-command list, and can send it data. |
| Deny a host | `sandbox.network.deniedDomains` | The sandbox refuses the host in every project, without a prompt. |
| Allow a write folder | `sandbox.filesystem.allowWrite` | Sandboxed commands can write anywhere under it, and programs that run outside the sandbox may later load what they wrote. |

Allow, Deny, and Undo use one edit path that reads and parses the settings file first. Before adding an entry, Sandbox Tuner checks both that exact file snapshot and the settings Claude Code has loaded. A new credential or denial in the file blocks an unsafe grant even if Claude Code has not loaded it yet. Undo validates the same snapshot and removes only its recorded entry.

When adding a write folder, Sandbox Tuner also finds where the folder really lies, links followed, and computes the verdict again at that place. It finds the real places of your home folder, the config folder, the working directory, the credentials folders, the `PATH` folders, and the protected places the same way, one name at a time, so a link cannot put one of them inside a cache folder. The protected places are the settings files in the config folder, and in your home folder, the working directory, the project folder, and every folder above them, the `.claude` settings files and folders, `.git/hooks`, `.git/config`, `.mcp.json`, `.vscode`, `.idea`, the shell startup files, and `.gitconfig`. It also walks the guarded folders and follows each link it finds there, nested links too. In the config folder, it walks only where code or settings that run outside the sandbox live: the top level of the config folder; `hooks`, `commands`, `agents`, `skills`, `output-styles`, and `workflows`; the top two levels of each installed plugin (`plugins/cache/<marketplace>/<plugin>/<version>`), of each plugin marketplace (`plugins/marketplaces/<name>`, without its `.git` folder), and of each plugin data folder (`plugins/data/<plugin>`); and the top two levels of `local`, where a local install of Claude Code lives. It skips the data folders, such as transcripts (`projects`), `todos`, `shell-snapshots`, `logs`, `debug`, `statsig`, `cache`, `backups`, and `file-history`. In the `.vscode` folder of your home folder, it walks the top two levels of each installed VS Code extension (`.vscode/extensions/<extension>`), and the rest of that folder whole. It walks every other guarded folder whole, a `.vscode` folder in a project too. One walk reads the protected places, and one reads the credentials folders. Each walk reads at most 1,000 folders and 25,000 entries, detects cycles, and writes nothing when it cannot finish or cannot read a folder. When one of them is a link to a missing place, or the file system refuses to say where one lies, it writes nothing. Hard links remain outside its reach. A link made after these checks is found only at the start of a later interactive session, which warns and does not take the grant back (see Known limits). It refuses to write a file that is not valid JSON, or a key whose value has another type. It saves a copy of the previous file to `backups/settings.json.sandbox-tuner.bak` in the same config folder. Right before the write, it reads the file again and stops when another session or program changed it. Then it writes the file and reads it back. A toast names the change and the copy. The copy holds the text before the latest write only.

A file that is not in the 2-space JSON format that Claude Code writes is saved in that format. The change text of **Allow** and **Deny**, and the text beside **Undo**, say so before you press.

Before writing settings, Sandbox Tuner saves a pending Undo entry. If that save fails, it leaves settings unchanged. An uncertain addition appears as **addition unconfirmed** with **Undo**. An unconfirmed addition stays in the Applied list after a reload, beyond the 50 newest changes. Reopening the pane checks whether each entry is present. An absent or unreadable addition stays unconfirmed until it is found or you press **Undo**. A later grant takes ownership of the entry.

**Retry Undo** remains available when a removal is unconfirmed, or when another session or program puts the entry back before Sandbox Tuner confirms the removal. An unconfirmed removal also stays after a reload, beyond the 50 newest changes. Each retry reads the Undo journal again and refuses to remove an entry that a later grant owns. Opening the pane again checks each unconfirmed removal without editing settings.

**Undo** removes exactly the entry that the press added, and the empty objects that the press created. It keeps every other edit.

Claude Code applies most settings edits to the running session. Two seconds after a write, Sandbox Tuner reads the file again and checks that the entry is still as the press left it, and the band and the pane draw again, so they show the setting that Claude Code applied. Claude Code offers no way to lock a file, so another session that saves the file at the same moment can take the change back. A toast and the pane's notice then say so.

## Surfaces

| Surface | Band | Pane | `/sandbox-tuner` |
| --- | --- | --- | --- |
| Terminal | Yes | Yes | Opens the pane |
| Desktop app | Yes | Yes | Opens the pane |
| VS Code and the mobile app | No | When the surface places panes | Opens the pane, or prints the report |
| `claude -p` | No | No | Prints the report |

Sandbox Tuner records sightings on every surface.

## Notices and diagnostics

Each problem reads `sandbox-tuner: <event> (<detail>): <cause>`. Command results and toasts receive the plugin name from Claude Code; their text omits that repeated prefix. A problem with a press shows in red in the band or the pane. A background problem shows in the pane after `Last background problem:`. Each one also goes to the debug log: run `claude --debug` and look for lines that contain `sandbox-tuner:`. Sandbox Tuner cuts a debug line longer than 4,096 characters and ends it with `…`. In the band and the pane, Sandbox Tuner cuts a problem text at 10,000 characters and ends it with `…`. A control character in a problem text, a command, or the path of the settings file shows as `�`, because a drawing cannot hold it.

| Notice | What to do |
| --- | --- |
| `... is not valid JSON (...). Nothing was written. Fix the file, then press again.` | Fix the JSON syntax of your user settings file. The reason in parentheses shows `…` in place of the file text that the JSON parser quotes, so that no secret from `env` reaches the debug log. |
| `... is a string, not an array of strings. Nothing was written.` | Make that key a list of strings. |
| `... could not save a copy of ... Nothing was written.` | Make the `backups` folder of your config folder writable. |
| `... could not confirm that ... is unchanged since Sandbox Tuner read it ...` | Another session or program saved the settings file during the press, so Sandbox Tuner left it as it is. Press again. |
| `... could not write ... Copy it back if ... is now damaged.` | If your settings file is damaged, copy the named backup over it. |
| `... does not hold the new text after the write ...` | Another program changed the file. The previous file is in the copy. Check the file, then press again. |
| `... could not save the Undo journal ... Nothing was written to ...` | Settings are unchanged. Resolve the storage failure before pressing again. |
| `... is saved, but Sandbox Tuner could not update its Undo journal ...` | The pending entry keeps Undo. Open the pane again to check it. |
| `... could not mark "..." as undone ...` | Sandbox Tuner could not save the Undo state. Check the named entry. Press **Undo** again. |
| `... is already in ..., but Claude Code has not applied it yet ...` | Run `/status` to check that the session loads user settings, and look for a ConfigChange hook that blocks the change. Then press again. |
| `... leads to ... Nothing was written.` | The folder is a link. The rest of the line is the verdict at its real place. |
| A verdict sentence, then `Nothing was written.`, after a folder **Allow** | A link puts a credentials folder or a protected place inside the folder. The sentence names the verdict. |
| `... name one place on a file system that ignores letter case ...` | A guarded folder or a `PATH` folder differs from the folder only in letter case. On a file system that ignores case, such as the macOS default, both are one place. Nothing was written. |
| `... is no longer in ...: another session or program saved the file at the same moment ...`, or `... is again in ...` after Undo | Two writes crossed, and the other one took the change back. Retry Allow or Deny. For Undo, press **Retry Undo**. |
| `... could not check ... after the write ...` (debug log only) | Sandbox Tuner could not read the file two seconds after the write to check the entry. Look at the file. |
| `... could not check where ... leads ...` | Sandbox Tuner could not find the real place of the folder, or of a credentials folder, protected place, or `PATH` folder, such as a link to a missing place. It wrote nothing. Fix or remove that link, or add the entry by hand. With `guarded directory traversal limit exceeded`, the places that one link walk reads hold more than 1,000 folders or 25,000 entries, such as a large `skills` folder in the config folder, a large credentials folder, or very many installed plugins and VS Code extensions: see Known limits. |
| `session.start: ... leads to ..., which lies inside "..."`, or `... holds "..."` (a toast, and the debug log) | A link, a guarded folder, or a `PATH` folder leads into a folder that Allow opened, or to a folder that holds it, so sandboxed commands can change what it names. Press **Undo** for each named entry in the pane, or remove the link. When the Applied list has no working Undo for an entry, for example when a restored backup brought back an entry after its Undo, the toast names its settings file instead: remove the entry from that file by hand. Sandbox Tuner checks this at the start of each interactive session, also after `/clear`, `/resume`, or `/branch`, while the entry is still in your settings file. |
| `... could not finish the link check of the folders that Allow opened ...` | At session start, Sandbox Tuner could not follow the named links, or one walk read more than 1,000 folders or 25,000 entries, or could not read a folder. It warned about what it found before. Fix or remove the named links. A link that the check did not reach can still lead into such a folder. |
| `... could not check the folders that Allow opened ...` (debug log only) | At session start, Sandbox Tuner could not read its Undo journal, the settings file, or your settings, so it did not check the folders that Allow opened. |
| `... the pane is not placed: ...` | The app does not place panes. Run `/sandbox-tuner` in the terminal or a newer desktop app. |
| `... skipped a sandbox report line of an unknown form ...` | Your Claude Code build writes sandbox reports in a format that Sandbox Tuner does not know. Update Sandbox Tuner, or report the line. Sandbox Tuner quotes at most 80 characters of a line that starts like a report line. Of any other line, it gives only the length, because that line can be command output that imitates a report. |
| `... skipped a <sandbox_violations> block that does not end the text of a failed call ...` (debug log only) | Output followed that block, so the command printed it, and Sandbox Tuner did not count it. If it was a real sandbox report, your Claude Code build adds text after its report that Sandbox Tuner does not know: update Sandbox Tuner, or report it. Sandbox Tuner quotes nothing of the block, because the command can print one. |
| `... could not show the notice "..." ...` (debug log only) | The press finished, but its notice could not be shown. The debug line holds the notice. |
| `Nothing applied: ...` | Your settings changed after the drawing. The rest of the line is the current verdict. |

## Known limits

- **The link check before a folder Allow has blind spots.** Before a folder Allow, Sandbox Tuner follows each link that it finds in the guarded folders. In Claude Code's config folder (`~/.claude`), it reads only where code or settings that run outside the sandbox live: the top level, `hooks`, `commands`, `agents`, `skills`, `output-styles`, `workflows`, the plugins, and `local`. It skips the data folders, such as transcripts (`projects`), `todos`, `shell-snapshots`, `logs`, `debug`, `statsig`, `cache`, `backups`, and `file-history`, and the `.git` folder of each plugin marketplace. It reads only the top two levels of each installed plugin, plugin marketplace, and plugin data folder, of `local`, and of each VS Code extension in `~/.vscode/extensions`. A link in a skipped folder, or deeper in a plugin, in `local`, or in an extension, does not stop a folder Allow. Neither does a hard link, or a link made after the check. At the start of each interactive session, also after `/clear`, `/resume`, or `/branch`, while a folder that Allow opened is still in your settings file, Sandbox Tuner walks the same guarded folders again, once for all such folders, and finds where the `PATH` folders lie. A toast then names each link, guarded folder, or `PATH` folder that leads into such a folder, or to a folder that holds it, names each such folder, and points to Undo, or to the settings file to edit by hand when the Applied list has no working Undo for the folder. Like Allow, it ignores letter case, so it can also warn about a folder whose name differs only in case. The walk does not enter such a folder. This check warns and does not take the grant back. It skips the same folders, finds no hard link, and sees a link made during a session only at the next session start. With `claude --resume`, the same toast can show twice when saved data loads slowly. A link that it cannot follow, and a walk that cannot finish, such as one that reads more than 1,000 folders or 25,000 entries, show in the pane after `Last background problem:`. The toasts still name what it found before. Read the change before you press.
- **A large guarded folder makes folder Allow refuse.** Sandbox Tuner walks the protected places and the credentials folders in two walks. Each walk reads at most 1,000 folders and 25,000 entries. A walk that needs to read more, or cannot read a folder, refuses the grant. A large `skills` folder, a credentials folder with many files, or very many installed plugins and VS Code extensions can cause `guarded directory traversal limit exceeded`. If you trust the folder, add it to `sandbox.filesystem.allowWrite` in your user settings file by hand.
- **Wildcard rules and rules with no known anchor make Sandbox Tuner cautious.** It counts an `Edit(<folder>/**)` allow rule as cover only when the folder has no wildcard. So it can offer Allow for a folder that a wildcard Edit rule already opens. A deny rule with a wildcard, in `permissions.deny` or in `sandbox.filesystem`, withholds Allow for every folder under the folder that holds its first wildcard. For example, `Read(~/**/*.key)` withholds Allow for every folder in your home folder. In command-line or managed settings, a rule path that starts with a single `/`, and a relative `sandbox.filesystem` entry, have no known anchor. Such an Edit allow rule or `allowWrite` entry counts as no cover. Such a deny rule or `denyWrite` or `denyRead` entry withholds Allow for every folder.
- **Paths from error text can be wrong.** When no sandbox report names a file, Sandbox Tuner takes the path from a permission error such as `Operation not permitted`. Punctuation in the error can cut the path short. A relative path counts from the session working directory, which can differ from the folder where the command ran. The error can also come from a blocked read. So a folder with any such sighting never gets Allow, even when sandbox reports name it too. Its counts and explanation remain.
- **A failed command can forge a sandbox report.** Claude Code adds the sandbox report of a failed command at the end of the command's output, and can add a proxy note after it. So Sandbox Tuner reads only the `<sandbox_violations>` block that ends that output, before any proxy note. It skips a block that other output follows, and writes a debug line. But a command that prints a block as its last output, for example from a file, and then fails, still forges a report: Sandbox Tuner counts that block as a block. Such a block counts only while the sandbox is on, and not when the command ran outside the sandbox at Claude's request. A Claude Code version that adds other text after its report makes Sandbox Tuner skip the real report too, with the same debug line. Before you press Allow, check that you expect the host or folder. Also check the command that the band names, or the programs that the pane lists.
- **Read, Mach lookup, and socket blocks get no fix.** When a sandbox report names such an operation, the band explains it for the current session only. Sandbox Tuner saves no count for it and offers no Allow. For an operation that it does not know, the band says that it cannot classify it.
- **Later background output goes unseen.** For a background Bash command or a shell Monitor launch, Sandbox Tuner counts the hosts that the launch declared, once, when it starts. It does not read the later output, so blocks there give no sighting.
- **A tool that ignores the sandbox proxy can still fail for an allowed host.** Covered rows in the band, the pane, and the report suggest checking the tool's proxy settings and supported protocols. Sandbox Tuner offers no command exclusion.
- **A target that your settings already allow cannot be hidden.** While your settings allow it, its row in the pane has no Hide, and it stays at the end of its list. A target that you hid before your settings allowed it stays in the Hidden list, with Unhide.
- **Two sessions that edit settings at the same moment can clash.** Claude Code offers no way to lock a file, so presses in two sessions at the same moment can take one change back. Sandbox Tuner tells you two seconds later. Another program that saves the file at the same moment can lose its own change, and Sandbox Tuner cannot see that. If two sessions add the same entry with the same recorded time, both Undo buttons can refuse with "a later journal entry owns this setting". Then remove the unwanted entry from your user settings file by hand. Use one settings-editing session at a time.
- **An unfinished addition can claim an entry that you add by hand.** A press that stops after it saved its Undo record, for example with "could not write" or "could not save the Undo journal", can leave the change marked "addition unconfirmed" in the Applied list. If you then add the same entry by hand, Sandbox Tuner takes it for its own change, and its Undo removes your entry. To keep a manual entry, do not press that Undo.
- **A settings file over 4 MiB cannot be edited.** Claude Code refuses a mod's read or write of a file over 4 MiB. So Allow, Deny, and Undo fail with "could not read" when your user settings file is larger. Sandbox Tuner saves the file in 2-space JSON, and that can make a compact file grow past 4 MiB: a compact file of 3.1 MiB can grow to 4.3 MiB. Then the press fails with "could not write". Edit such a file by hand.
- **A relative `CLAUDE_CONFIG_DIR` moves with the session.** Sandbox Tuner takes it from the session's project root: the folder where the session started, or where `/cd` or a worktree move took it. After such a move, Allow and Deny edit a different `settings.json`. The pane names the file after "Settings file:". Set `CLAUDE_CONFIG_DIR` to an absolute path.
- **Undo reaches only the 50 newest changes.** The Applied list keeps the 50 newest changes, plus each change whose addition or removal is unconfirmed. An older change has no Undo. To take it back, remove its entry from your user settings file by hand.
- **The saved data only grows.** Each session saves its own sightings, and Sandbox Tuner deletes no saved sighting and no Undo record of a written change. Near Claude Code's 4 MiB store limit, saves fail with a `sandbox-tuner:` problem, and Allow, Deny, and Undo can refuse to write. After a failed sighting save, Allow and Deny refuse for the rest of that session. To start over, quit Claude Code and delete Sandbox Tuner's file in `$CLAUDE_CONFIG_DIR/plugins/store/`, or in `~/.claude/plugins/store/` when `CLAUDE_CONFIG_DIR` is unset. The file name starts with `sandbox-tuner`. This also deletes its Undo records.
- **Counts are a guide, and some counts and lists are capped.** Claude Code does not document whether saves from two sessions at the same moment both last, so a count can fall short. The pane and the report show only the newest 300 targets seen within 30 days. The Hosts, Write folders, and Hidden lists of the pane, and each section of the report, show at most 25 targets. One call counts at most three write folders, and a further write folder in that call gets no count and no explanation. Sandbox Tuner reads only the last 200,000 characters of the output and of the error output of a call. A target keeps at most five ports, and checks against port-specific settings entries use only those ports. A target keeps at most 20 session ids and three program names. So the band, the pane, and the report count at most 20 sessions, and the pane and the report name at most three programs.

## Troubleshooting

- **No band.** The sandbox is off, the surface draws no band, a survey holds the band, you dismissed that target, or you already fixed that block.
- **No Allow.** Read the verdict line of the target.
- **A host that you approved at the network prompt.** Sandbox Tuner cannot see those approvals. In auto mode, it counts each host that Claude lists by name on a command that ran. A host that only a wildcard entry such as `*.example.org` covers gives no sighting when its connection succeeds. Neither does a host that your allowlist already covers, because Claude need not list it.
- **A target that your settings already allow, but the sandbox still blocks.** Possible causes include proxy bypass, a read block, or file permissions. Covered rows in the band, pane, and report suggest checking client proxy and supported-protocol settings. Run `/status` or `/doctor` for managed-settings warnings.
- **A tool that ignores the sandbox proxy** can fail even for an allowed host. Sandbox Tuner offers no command exclusions. When the block identifies a host or cache folder, the band explains it and offers that narrower fix if eligible. Otherwise, run the command yourself or approve a single retry.
- **Counts that do not match.** Each session saves its own counts, and Sandbox Tuner adds them up. Claude Code does not document whether saves from two sessions at the same moment both last, so a count can fall short.
- **Background commands.** Confirmed background Bash and shell Monitor launches count declared hosts once. Later output remains unobserved. Repeat a command in the foreground only when repeating its side effects is acceptable.

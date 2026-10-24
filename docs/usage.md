# Sandbox Tuner usage guide

Sandbox Tuner watches Bash results and confirmed shell Monitor launches of your Claude Code sessions for sandbox blocks. It explains the latest block in a band above the prompt, and it ranks the hosts and write folders that keep coming back in a pane. By default, the band, the pane, and the report show only what the current session saw and applied. A branch also shows what its history saw and applied up to the branch (see [Sessions](#sessions)). When a target recurs, it shows the exact settings change and its effect, and it writes that change only when you press a Button.

Requires Claude Code 2.1.288 or later with the sandbox enabled on macOS, Linux, or WSL2. Tested with Claude Code 2.1.296.

The sandbox applies to Bash commands. Sandbox Tuner does not observe Write or WebFetch tool blocks, or collect later background output.

## Sightings

A sighting is one observation of one target in a Bash call or confirmed shell Monitor launch. Sandbox Tuner counts three kinds:

| Sighting | Where it comes from |
| --- | --- |
| Blocked | A line of the `<sandbox_violations>` report that Claude Code adds to a Bash result: a refused network connection, or a refused file write. |
| Listed | A host that Claude named in the `allowed_domains` of a command that ran. In auto mode, Claude is asked to name each host that your allowlist does not cover. Sandbox Tuner skips a wildcard entry, such as `*.example.org`. Outside auto mode the list opens nothing, but it still shows that the command needs the host. |
| From error text | A permission error (`Operation not permitted`, `Read-only file system`) that names an absolute path or a simple relative path such as `.git/hooks/example`, in a sandboxed command that ran and whose sandbox report names no file. |

### Confirmed and guessed blocks

A Blocked sighting is a confirmed block: the sandbox reported it. A From error text sighting is a guessed block: Sandbox Tuner took the path from a permission error, and the sandbox did not confirm it.

On macOS 27, Claude Code adds no `<sandbox_violations>` report for a blocked file write to the Bash result. Only the system log records it, as in `Sandbox: mkdir(37872) deny(1) file-write-create /path`, and Sandbox Tuner cannot read that log. So on macOS 27 every folder block is a guessed block, and a folder Allow rests on guessed blocks.

A folder with guessed blocks gets Allow only within these limits, which make it safe enough:

- Only the cache and temp folders that Sandbox Tuner names can get Allow. Every other folder rule still applies: protected places, credentials, system folders, folders that are too broad, wildcards, folders on `PATH`, and folders in the working directory get no Allow.
- Guessed blocks count toward `minimumSightings` as confirmed blocks do, so the folder waits for the same number of sightings.
- A label next to the Allow says `Guessed from error text: the sandbox did not confirm this block.`
- Nothing changes until you press Allow. When you press an Allow that showed no label, and another session saved guessed blocks of the folder since, the press writes nothing and says so. The band and the pane then show the label: press Allow again.
- At the press, Sandbox Tuner checks where the folder really lies, as for every folder Allow.

The path in an error of `mkdir` names the folder that mkdir tried to create. So `mkdir -p ~/.cache/tool` gives the target `~/.cache/tool`. A guessed path directly in a cache root, such as `~/.cache/stamp`, is its own cache folder. So a guessed path inside a cache root never gives the whole cache root, such as `~/.cache`, as its target. A target with no guessed blocks follows the rules of Sandbox Tuner 1.1.7: a confirmed write directly in a cache root gives the cache root, which gets no Allow.

A target is one of these:

- A host, such as `registry.npmjs.org`.
- A write folder: the cache or temp folder of the denied path, such as `~/.cache/<tool>` for `~/.cache/<tool>/a/b`, else the folder that holds the denied file, such as `/tmp/a` for `/tmp/a/b`.

One call counts once per target and kind of sighting, even when several report lines name the target. So one call can count a host twice: once as listed and once as blocked. A refusal among those lines counts as a refusal. A refusal stays in the counts, such as `Seen 3 times`, but does not count toward `minimumSightings`. The Waiting line shows the count that does, such as `(0 so far)`.

A target keeps at most five distinct ports. Each Claude Code process saves its own record of a target, and in that record a new port pushes out the oldest one. To combine the records, Sandbox Tuner keeps the ports of the most recently updated record first, then the newest ports of the older records. So across sessions, the five kept ports are not always the five most recent ones. The pane, the report, and the checks against port-specific settings entries use only the kept ports.

One call counts at most three write folders. A further write folder in that call gets no count and no explanation. Sandbox Tuner reads only the last 200,000 characters of the output and of the error output of a call.

A host, path, or reason longer than 4,096 characters, or with a control character, is not counted: no real one is like that.

The pane and the report show at most the 300 newest targets seen within 30 days. With `scope: session`, the limit applies to the targets of the current session, with the targets that a branch inherits. The pane applies this limit each time it draws, so a new target can push the oldest one out of the list. Older targets stay saved: the limit applies only to what the pane and the report show.

## Sessions

The `scope` option sets which sessions the band, the pane, and `/sandbox-tuner` show. The current session is the session that Claude Code's session id names. At `/resume` and `/branch`, Claude Code starts the new session while its session id still names the session before. With `scope: session`, Sandbox Tuner takes the new session as the current one from that start, so a press or a Bash call in that moment counts for the new session.

| `scope` | Targets in the band, the pane, and the report | Applied list |
| --- | --- | --- |
| `session` (the default) | Only the hosts and write folders that a sighting of the current session named. A branch also shows those that its history saw up to the branch (see [Branches](#branches)). | Only the changes that a press of the current session made. A branch also lists those that its history made up to the branch, each with **Undo**. |
| `all` | The targets of every session, as in Sandbox Tuner 1.1.3. | The changes of every session, as in Sandbox Tuner 1.1.3. |

With both values:

- A target that shows counts the sightings of every session, such as `Seen 3 times in 2 sessions.` The Allow threshold (`minimumSightings`) uses the same count.
- The link check covers every folder that Allow opened in any session (see Known limits).
- The sightings of every session stay saved, and the changes of earlier sessions stay in your settings file. `scope: all` shows them again.

With `scope: session`:

- `/clear` and `/resume` clear the targets, the band, the dismissal, the notice, the last background problem, and the place in the Applied list of the session before. `/branch` clears the same, but the branch keeps the band and its dismissal (see [Branches](#branches)). Then they load the targets of the new session. When that load fails, the band, the pane, and the report show no target. `/clear` starts a new session with nothing to show. `/branch` starts a new session with the view of its history (see [Branches](#branches)).
- A press runs only in the session where you pressed it. A press can wait behind other work. When another session starts before the press runs, or before it writes your settings file, the press does nothing, and the debug log says why. When another session starts after the write, the new session shows nothing of the press, also not a problem that the check two seconds after the write finds. The debug log still gets each problem.
- Every press needs the session id. When Claude Code cannot give it, the press does nothing, and the debug log says why. If the session id fails only at the moment of the write, the notice of the session that pressed also says so. Allow and Deny save the session id of the press with their change. The pane needs the session id to draw its lists.
- A Bash call or a Monitor launch counts for the session that ran it. Sandbox Tuner reads its session and its working directory before it runs, and a relative path in its output starts from that folder. When another session starts while the call runs, the new session shows nothing of the call, and its problems go to the debug log only.
- A problem that the pane or the report shows names no target of another session. A problem with a change of another session, or with a saved record, Hide choice, or Undo journal entry that is not valid, shows in general words. The debug log names the target.
- A toast of the link check points to Undo only for a folder that the current session opened, or that its history opened up to the branch. For a folder that another session opened, it names the settings file to edit by hand. Set `scope` to `all` to press the Undo of that folder instead. The check reads the Applied list when its walk ends, so a session that starts during the walk gets the advice of its own list.
- After `/resume`, the session shows the targets that it saw before, also in another Claude Code process, and the changes that it made. A resumed branch also shows what it inherited, while its branch record stays (see [Branches](#branches)).
- A `claude -p` run is a new session, so `claude -p "/sandbox-tuner"` lists no target. Set `scope` to `all` for the report of every session.
- A change that Sandbox Tuner 1.1.3 made names no session, so only `scope: all` lists it.
- When Claude Code cannot give the session id before a Bash call or a Monitor launch runs, the call belongs to no session. No session shows its band, its problems, or a target because of it. Its problems go to the debug log only. Sandbox Tuner still saves its sightings, with no session id, and they count toward their targets. Such a target shows in a session only when a call of that session, with a known session id, names the same target. Its count then includes the sightings with no session id. A target that the session already shows counts them from the next load, such as the next `/sandbox-tuner`.

### Branches

With `scope: session`, a branch shows what its history saw and applied up to the branch point. Then it adds its own:

- At `/branch`, Sandbox Tuner saves a branch record in its store: the id of the branch, the id of the session that it started from, the time of the branch, and the targets that the session before saw by then. A target record keeps no time for each session, so the branch record holds that list. A sighting that the session before saved after the time of the branch is not in it, also when it comes from a Bash call that ended before the branch and waited to be saved. A target whose saved record was first seen after the time of the branch is not in it either, also when another Claude Code process saved it. When a record that was first seen by then also names other sessions, it keeps no time of the session before, so the branch inherits the target (see Known limits).
- The band, the pane, and the report of the branch show the targets that the session before saw up to the branch. The Applied list shows the changes that the session before made up to the branch, each with its **Undo**. Undo of such a change works from the branch.
- Then the branch adds the targets that it sees and the changes that it makes.
- When the session before is a branch too, the view follows the history up, each session up to the time of its own branch, at most 10 steps.
- The band of the latest block before the branch stays, and so does its dismissal.
- The session before never shows what the branch saw or applied later. What the session before sees and applies after the branch does not show in the branch.
- An inherited row of the Applied list shows the live state of its settings entry. Both sessions share one settings file, so an Undo of an inherited change in one session shows in the other. When the branch undoes it, the session before shows it as undone. When the session before undoes it after the branch, the branch shows it as undone, with no **Undo**. A problem with such an Undo names the change in both sessions.
- `/resume` of a branch shows the same view, also in another Claude Code process, while its branch record stays.
- Sandbox Tuner keeps every branch record while the store holds 200 or fewer. Past 200, each `/branch` removes the oldest records first, down to 200. It never removes the record of the new branch or of a session that a saved target or change names, nor the 9 records above each of those, which its view walks. So more than 200 stay when those alone pass 200. A branch whose record is gone shows only what it sees and changes itself, also after `/resume`.
- `/clear` and a new session start with nothing to show.
- When Sandbox Tuner cannot read the saved targets or save the branch record, the branch shows only what it sees and changes itself, and the pane says why.
- After a sighting that Sandbox Tuner could not save in the session before, Allow and Deny refuse in the branch too, because the branch shows the targets of the session before. When the branch cannot keep that refusal, Allow and Deny still refuse, and the branch shows no target of the session before until a later load, such as `/sandbox-tuner`, keeps the refusal. Each branch of that branch refuses the same way until a load keeps the refusal in it.
- `/fork` copies the conversation into a background session in its own process. That copy starts with nothing to show, as a new session does.
- With `scope: all`, Sandbox Tuner saves no branch record, and a branch shows every session, as before.

## The band

On the terminal and in the desktop app, the band above the prompt explains the latest block of the session:

1. What was blocked, for which command, and why. For example: `Sandbox blocked example.org:443 for "curl -sI https://example.org". The host is not on your sandbox allowlist, so Claude must list it on each command.`
2. How often: `Seen 3 times in 2 sessions.`
3. The verdict, and the exact change and effect of each fix that it offers.
4. When the Allow rests on guessed blocks, the label `Guessed from error text: the sandbox did not confirm this block.` (see [Confirmed and guessed blocks](#confirmed-and-guessed-blocks)).
5. Its Buttons.

| Button | Shown when | What it does |
| --- | --- | --- |
| Allow | The target recurred enough and no rule refuses it | Adds the entry to your user settings file. |
| Deny | You refused the host at the network prompt, and no lock applies | Adds the host to `sandbox.network.deniedDomains`. |
| Open Sandbox Tuner | Always | Opens the pane. |
| Dismiss | Always | Hides the band for this target for the rest of the session. Dismissing another target replaces it. With `scope: session`, a branch keeps the dismissal of the session before. After `/clear` and `/resume`, and after `/branch` with `scope: all`, the dismissal is gone: the next block of the target shows the band again. |

The band's Buttons have no hotkeys, so a number that you type alone into an empty prompt never presses one. Click a Button, or press Ctrl+X, then Tab, to give the band the focus. Then Tab moves between the Buttons, Enter presses one, and Esc goes back to the prompt. When the row has room, the band shows this path after its last Button, dim: `ctrl+x tab to choose`. On a narrow row, the band leaves the hint out, so that the Buttons stay on one row.
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
- **Hosts** and **Write folders**: the targets that have a fix, of the current session, or of every session with `scope: all`. Each target shows its counts, its verdict, and its Buttons. An Allow that rests on guessed blocks has the guessed-block label right above it. Targets with a fix ready come first, then targets that wait for more sightings.
- **Nothing to allow here**: the targets that have no fix, hosts first, then write folders: first the targets with no settings fix, then the targets that your settings already allow. Each one keeps its counts, its explanation, and **Hide**. A target that your settings already allow has no **Hide**.
- **Hidden**: the targets of the same scope that you hid, each with **Unhide**. Hide a target that you never want to open. A target that your settings already allow has no **Hide**.
- **Applied**: the changes that Sandbox Tuner made in the current session and, in a branch, in its history up to the branch, or in every session with `scope: all`, newest first, each with **Undo**. Sandbox Tuner keeps the 50 newest changes of every session, plus each change whose addition or removal is unconfirmed, and the list shows those of the scope.

The counts of a target read like `5 confirmed blocks · 2 sessions · last 3 min ago · with curl · ports 443`:

- `N confirmed blocks`: the Blocked sightings, from Claude Code's sandbox reports. For a host that you refused at the network prompt, `(you denied N)` follows.
- `N guessed from error text`: for a write folder, the guessed blocks, which are the From error text sightings.
- `listed on N commands`: for a host, the Listed sightings.
- Then the sessions that saw the target, the age of the last sighting, up to three program names, and the ports of a host.

A part that is 0 is left out, such as `27 guessed from error text · 1 session · last just now`. When every part is 0, a write folder shows `0 confirmed blocks · 0 guessed from error text`, and a host shows `0 confirmed blocks`.

Each list shows at most 25 rows, then `+<n> more`. A list also ends early when its next row would pass Sandbox Tuner's own text budget of 90,000 characters for the pane. That budget leaves room under the 100,000 characters that Claude Code draws in one drawing. The Applied list gets its room first. Use **Older changes** and **Newer changes** to reach every retained change, including changes beyond the row or text limit.

Esc closes the pane. Tab moves between its Buttons, Enter presses one, and the arrow keys scroll. Run `/sandbox-tuner` again to load the sightings that other sessions saved since: of the targets of the current session, or of every target with `scope: all`.

## The `/sandbox-tuner` command

In an interactive session, `/sandbox-tuner` opens the pane and prints one line, such as `sandbox-tuner: 1 fix ready, 4 targets. The pane is open.` It runs at once, even while Claude works.

In `claude -p "/sandbox-tuner"`, it prints a text report with the same lists, counts, and ranking: **Hosts**, **Write folders**, then **Nothing to allow here**. The guessed-block label follows the Allow sentence of a target that rests on guessed blocks. A `claude -p` run is a new session, so with `scope: session` the report says `Has not seen a sandbox block in this session yet.` Set `scope` to `all` for the report of every session. The report lists at most 25 targets in each section. When a surface cannot place the pane, the command prints the report and the reason. The command never writes settings.

## Verdicts

| Verdict | Meaning |
| --- | --- |
| Ready | The target has at least `minimumSightings` sightings, not counting network-prompt refusals. **Allow** shows its exact change and effect. |
| Waiting | The target has not recurred enough. A host that you refused at the network prompt offers **Deny**. |
| Covered | Your settings already allow the target. The row names the settings that allow it. |
| No fix | Sandbox Tuner offers no **Allow**, and the row says why. |

Sandbox Tuner offers no **Allow** for:

- IP addresses and local host names.
- A host that your settings already refuse.
- Any host while your organization's managed settings lock the network allowlist (`allowManagedDomainsOnly`). **Deny** is not offered there either, because the sandbox refuses unlisted hosts anyway.
- Paths whose settings or code can run outside the sandbox: Claude Code's config folder and any folder that holds it, the `.claude` settings files and folders, `.mcp.json`, `.git/hooks`, `.git/config`, `~/.config/git`, shell startup files, `.gitconfig`, `.vscode`, `.idea`, and a `.git` or `.claude` folder outside the working directory.
- Credentials folders such as `~/.ssh` and `~/.aws`, and `.pem` or `.key` files.
- These protected names and key files in any letter case, because many file systems ignore case: `.GIT/config` is `.git/config` on macOS.
- A cache or temp folder where a blocked write named one of the protected files above or a key file. That write keeps the folder closed, whatever later writes name.
- System and software-install folders such as `/usr` and `/opt/homebrew`.
- A folder on your `PATH`, or a folder that holds one. An empty or relative `PATH` entry counts from the working directory.
- A folder that is too broad, such as your home folder and `/tmp`. So a file directly in `/tmp`, such as `/tmp/out.txt`, gets no Allow, and a folder inside `/tmp`, such as `/tmp/build` for `/tmp/build/out.o`, can.
- A folder name with `*`, `?`, or `[`.
- A folder in the working directory, where sandboxed commands can already write.
- A path under one of your `denyWrite` entries, Read or Edit deny rules, or other read rules. Uncertain denial patterns also withhold Allow, as does the read block of `permissions.blockReadsOutsideWorkingDirectories`.
- Any folder that is no cache or temp folder. Sandbox Tuner suggests `~/.cache/<tool>`, `~/Library/Caches/<app>`, the package caches of npm, Cargo, Gradle, Maven, and pnpm, the macOS per-user temp and cache folders, and the temp folders only. A temp folder is a folder strictly inside `/tmp` that holds the denied file. A temp folder in a system folder, in any letter case, gets no Allow. Sandbox Tuner compares the spelling, as it does for cache folders, so `/TMP/a`, `/tmp/a/../b`, `/var/tmp/a`, and `/private/tmp/a` name no temp folder. On macOS, `/tmp` is a link to `/private/tmp`, so a folder that a report names in `/private/tmp` gets no Allow as a temp folder. A cache folder there keeps the cache rule, such as `~/.cache/<tool>` when your home folder lies in `/private/tmp`. `/tmp` holds no temp folder when it holds your home folder, or your home folder holds it, in any letter case.

These rules hold for confirmed and guessed blocks alike. A folder with guessed blocks that passes them gets **Allow** once it has `minimumSightings` sightings, with the guessed-block label next to the **Allow** (see [Confirmed and guessed blocks](#confirmed-and-guessed-blocks)).

Sandbox Tuner reads the paths of sandbox entries, such as `sandbox.filesystem.allowWrite`, `denyWrite`, `denyRead`, and credentials files, the way the sandbox does: `~/` is your home folder, `/` and `//` start an absolute path, and any other entry is relative to the config folder (`~/.claude` by default) in user settings or to the project root in project and local settings. A relative sandbox entry in command-line or managed settings has no known anchor: Sandbox Tuner ignores it as a grant and treats it as a denial of every folder. It resolves `.` and `..` in each entry before it compares.

Read and Edit rules in `permissions` use other anchors, as in Claude Code: `//` starts an absolute path, `~/` is your home folder, a single `/` is relative to the folder of the settings file (the config folder for user settings, the project root for project and local settings), and any other path is relative to the working directory. So `Edit(/cache/**)` in user settings names `~/.claude/cache`, and `Edit(//cache/**)` names `/cache`. A denial path with no `/` other than a trailing `/**`, such as `Read(.env)`, can match that name in any folder under the working directory. In command-line or managed settings, a single-`/` rule has no known anchor: such a denial withholds every folder fix, and such an Edit grant counts as no coverage.

Sandbox Tuner does not offer command exclusions. Tools can execute code the model writes through plugins, extensions, aliases, or hooks, even during inspection commands. When a block identifies a host or cache folder, Sandbox Tuner explains the block and offers that narrower fix when eligible.

Existing command exclusions remain in your settings. To remove one, edit your user settings file directly. Sandbox Tuner does not keep command targets or Undo entries for exclusions.

## The options

| Option | Default | Range | Meaning |
| --- | --- | --- | --- |
| `minimumSightings` | 3 | 1 to 100 | How many times a host or write folder must recur before Sandbox Tuner offers Allow. Network-prompt refusals stay in the counts but do not count toward it. |
| `linkCheckMinutes` | 15 | 0 to 1440 | How often, in minutes, an interactive session checks again for links into the folders that Allow opened (see Known limits). 0 turns the timed check off. The checks at each session start stay. |
| `scope` | `session` | `session` or `all` | Which sessions the band, the pane, and `/sandbox-tuner` show. `session`: only the targets that the current session saw, and only the changes that it made. A branch also shows what its history saw and made up to the branch. `all`: the targets and the changes of every session, as in Sandbox Tuner 1.1.3. The counts and the link check cover every session with both values. See [Sessions](#sessions). |

Set them with `/plugin configure sandbox-tuner@sandbox-tuner`, or in `/config`.

## What a write changes

Each press changes one string in one of these keys of your user settings file: `~/.claude/settings.json`, or `settings.json` in the folder that `CLAUDE_CONFIG_DIR` names. A relative `CLAUDE_CONFIG_DIR` counts from the session's project root, which `/cd` or a worktree move can change, so set it to an absolute path.

| Fix | Key | Effect |
| --- | --- | --- |
| Allow a host | `sandbox.network.allowedDomains` | Sandboxed commands in every project reach the host on any port, with no prompt and no per-command list, and can send it data. |
| Deny a host | `sandbox.network.deniedDomains` | The sandbox refuses the host in every project, without a prompt. |
| Allow a write folder | `sandbox.filesystem.allowWrite` | Sandboxed commands can write anywhere under it, and programs that run outside the sandbox may later load what they wrote. |

Allow, Deny, and Undo use one edit path that reads and parses the settings file first. Before adding an entry, Sandbox Tuner checks both that exact file snapshot and the settings Claude Code has loaded. A new credential or denial in the file blocks an unsafe grant even if Claude Code has not loaded it yet. Undo validates the same snapshot and removes only its recorded entry.

When adding a write folder, Sandbox Tuner also finds where the folder really lies, links followed, and computes the verdict again at that place. It finds the real places of your home folder, the config folder, the working directory, the credentials folders, the `PATH` folders, and the protected places the same way, one name at a time, so a link cannot put one of them inside a cache folder. For a folder in `/tmp`, it also finds where `/tmp` really lies. It refuses the folder unless the folder really lies strictly inside that place, also when a link takes the folder to a cache folder. It also refuses a folder in `/tmp` when the real places of `/tmp` and your home folder hold one another. A cache folder keeps the cache rule, also when your home folder lies in `/tmp`. The real place of a folder outside `/tmp` never counts as a temp folder. So a cache folder that a link takes to `/tmp/<tool>` gets no Allow. The protected places are the settings files in the config folder, and in your home folder, the working directory, the project folder, and every folder above them, the `.claude` settings files and folders, `.git/hooks`, `.git/config`, `.mcp.json`, `.vscode`, `.idea`, the shell startup files, and `.gitconfig`. It also walks the guarded folders and follows each link it finds there, nested links too. In the config folder, it walks only where code or settings that run outside the sandbox live: the top level of the config folder; `hooks`, `commands`, `agents`, `skills`, `output-styles`, and `workflows`; the top two levels of each installed plugin (`plugins/cache/<marketplace>/<plugin>/<version>`), of each plugin marketplace (`plugins/marketplaces/<name>`, without its `.git` folder), and of each plugin data folder (`plugins/data/<plugin>`); and the top two levels of `local`, where a local install of Claude Code lives. It skips the data folders, such as transcripts (`projects`), `todos`, `shell-snapshots`, `logs`, `debug`, `statsig`, `cache`, `backups`, and `file-history`. In the `.vscode` folder of your home folder, it walks the top two levels of each installed VS Code extension (`.vscode/extensions/<extension>`), and the rest of that folder whole. It walks every other guarded folder whole, a `.vscode` folder in a project too. One walk reads the protected places, and one reads the credentials folders. Each walk reads at most 1,000 folders and 25,000 entries, detects cycles, and writes nothing when it cannot finish or cannot read a folder. When one of them is a link to a missing place, or the file system refuses to say where one lies, it writes nothing. Hard links remain outside its reach. A link made after these checks is found by the next timed check of an interactive session, every 15 minutes by default, or at the start of a later interactive session, which warns and does not take the grant back (see Known limits). It refuses to write a file that is not valid JSON, or a key whose value has another type.

After these checks, Allow, Deny, and Undo take the lock of the settings file, `settings.json.sandbox-tuner.lock` next to it, so that presses in other sessions edit the file in turn, and read the file, the Undo journal, and the sightings of the target again. Another session can have saved a later grant of the entry or a new sighting of the target while the press waited. So an Undo checks again that no later grant owns its entry, and Allow and Deny rate the target again with the new sightings, a folder's real place too. When a check fails, the press refuses with the message that the same check gives before the lock. When another session or program changed the file since the first read, Sandbox Tuner runs the checks above again on the new text, a folder's real place too, and applies the change to that text. It refuses, and leaves the file as it is, when the new text already holds the entry, refuses the change, is not valid JSON, or holds a key of another type. An Undo whose entry is gone from the new text is marked as undone. It saves a copy of the previous file to `backups/settings.json.sandbox-tuner.bak` in the same config folder. Right before the write, it reads the file again and stops when another session or program changed it, or when another press took the lock over. Then it writes the file, reads it back, and frees the lock. A toast names the change and the copy. The copy holds the text before the latest write only.

A press waits up to 3 seconds for a lock that a press in another session holds, then refuses. A lock that no press freed for 30 seconds, for example after Claude Code quit during a press, is left over, and the next press takes it over. Claude Code gives a mod no exclusive file create, so a press claims the lock by writing its own token and reading it back. Two presses that claim it in the same instant can both go ahead: then the checks right before and after the write catch most clashes (see Known limits). Claude Code also gives a mod no way to delete a file, so the lock file stays between presses, marked free.

A file that is not in the 2-space JSON format that Claude Code writes is saved in that format. The change text of **Allow** and **Deny**, and the text beside **Undo**, say so before you press.

Before writing settings, Sandbox Tuner saves a pending Undo entry. If that save fails, it leaves settings unchanged. An uncertain addition appears as **addition unconfirmed** with **Undo**. An unconfirmed addition stays in the Applied list after a reload, beyond the 50 newest changes. Reopening the pane checks whether each entry is present. An absent or unreadable addition stays unconfirmed until it is found or you press **Undo**. A later grant takes ownership of the entry.

**Retry Undo** remains available when a removal is unconfirmed, or when another session or program puts the entry back before Sandbox Tuner confirms the removal. An unconfirmed removal also stays after a reload, beyond the 50 newest changes. Each retry reads the Undo journal again and refuses to remove an entry that a later grant owns. Opening the pane again checks each unconfirmed removal without editing settings.

**Undo** removes exactly the entry that the press added, and the empty objects that the press created. It keeps every other edit.

Claude Code applies most settings edits to the running session. Two seconds after a write, Sandbox Tuner reads the file again and checks that the entry is still as the press left it, and the band and the pane draw again, so they show the setting that Claude Code applied. A program other than Sandbox Tuner ignores the lock, and two presses that claim the lock in the same instant can both write, so a write at the same moment can still take the change back. A toast and the pane's notice then say so.

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
| `... another session saved blocks of this folder that Sandbox Tuner guessed from error text ... Nothing was written. Read the label, then press Allow again.` | The Allow that you pressed showed no guessed-block label, but the sightings that the press read again include guessed blocks (see [Confirmed and guessed blocks](#confirmed-and-guessed-blocks)). The band and the pane now show the label. Read it, then press Allow again. |
| `... could not confirm that ... is unchanged since Sandbox Tuner read it ...` | Another session or program saved the settings file during the press, so Sandbox Tuner left it as it is. Press again. |
| `... another Sandbox Tuner session holds the lock on ... and did not free it within 3 seconds ...` | A press in another session is writing the settings file. Press again. If it stays for 30 seconds, a press stopped while it held the lock, and the next press takes it over. |
| `... another session or program changed ... after this press read it, and the press no longer fits the new text: ...` | The rest of the line says why, such as the verdict on the new text, or a file that is not valid JSON. Nothing was written. Read the file, then press again if you still want the change. |
| `... another session or program added "..." to ... after this press read it ...` | The file holds the entry already, from another session or by hand. Nothing was written, so the Applied list has no Undo for it from this press. |
| `... another Sandbox Tuner session took over the lock on ... during this press ...` | This press held the lock for 30 seconds or more, so another press took it over. Sandbox Tuner left the file as it is. Press again. |
| `... could not take the lock on ...`, or `... could not check the lock on ...` | Sandbox Tuner could not read or write its lock file next to the settings file. Nothing was written. Make the config folder writable, then press again. |
| `... took over the lock on ..., which no press freed within 30 seconds` (debug log only) | A press stopped while it held the lock, and this press took it over. |
| `... could not free the lock on ...` (debug log only) | The change is saved, but the lock file still names this press. Presses in other sessions take it over once it is 30 seconds old. |
| `... could not write ... Copy it back if ... is now damaged.` | If your settings file is damaged, copy the named backup over it. |
| `... does not hold the new text after the write ...` | Another program changed the file. The previous file is in the copy. Check the file, then press again. |
| `... could not save the Undo journal ... Nothing was written to ...` | Settings are unchanged. Resolve the storage failure before pressing again. |
| `... is saved, but Sandbox Tuner could not update its Undo journal ...` | The pending entry keeps Undo. Open the pane again to check it. |
| `... could not mark "..." as undone ...` | Sandbox Tuner could not save the Undo state. Check the named entry. Press **Undo** again. |
| `ui.press (...): could not read the session id: ... Nothing was written.` (debug log; also the notice when only the read at the write failed) | With `scope: session`, every press needs the session id, and Claude Code did not give it, so the press did nothing. Press again. |
| `ui.press (...): another session started after this press. Nothing was written.` (debug log only) | With `scope: session`, `/clear`, `/resume`, or `/branch` started another session while the press waited, so the press did nothing. Press again in the session that should make the change. |
| `tool.call (...): could not read the session id: ...` | Claude Code did not give the session id of the call, so its sightings name no session. With `scope: session`, this line goes to the debug log only. [Sessions](#sessions) says when such a target shows. |
| `classic.SessionStart (fork): could not save the session that /branch started from: ... The branch shows only what it sees and changes itself.` | With `scope: session`, Sandbox Tuner could not read the saved targets of the session before, or could not save the branch record, so the branch shows only its own targets and changes. Resolve the storage failure. `scope: all` shows every session. |
| `classic.SessionStart (fork): could not keep the refusal after a sighting that the session before could not save: ...` | With `scope: session`, a sighting of the session before could not be saved, and the branch could not keep the refusal of Allow and Deny. Allow and Deny still refuse in the branch and in each branch of it, and they show no target of the session before. Each later load, such as `/sandbox-tuner`, tries again, and the debug log says when it fails. Once a load keeps the refusal, the branch shows what it inherited, and Allow and Deny keep refusing. |
| `classic.SessionStart (fork): could not remove the branch records that no view needs: ...` (debug log only) | Sandbox Tuner could not read the branch records, the saved targets, or the Undo journal, or could not remove a record, so more than 200 branch records can stay. The next `/branch` tries again. |
| `classic.SessionStart (fork): could not show the band of the session that /branch started from: ...` | With `scope: session`, the branch shows no band of the block before the branch. The pane still shows the target. |
| `classic.SessionStart (fork): found no session that /branch started from ...` (debug log only) | Claude Code gave no session that the branch started from, so the branch shows only its own targets and changes. |
| `...: skipped a branch record that is not valid: ...`, or `...: could not read the branch record ...` (debug log only) | The view stops its walk up the history at that record, so it shows less of the history. |
| `classic.SessionStart: could not clear what the session before showed ...` | With `scope: session`, after `/clear`, `/resume`, or `/branch`, Sandbox Tuner could not clear the targets, the band, the dismissal, the notice, the last background problem, or the place in the Applied list of the session before, so some of them can still show. A notice of a press of the session before still does not show. The targets and the changes of the session load as usual. |
| `apply.confirm: could not confirm an addition that another session made ...`, or `undo.confirm: could not confirm an Undo that another session made ...` | With `scope: session`, Sandbox Tuner could not check an unconfirmed change of another session against its settings file, for example because the file is not valid JSON. The pane does not name the change. The debug log names it and the cause in a line that starts with the same event. Fix the settings file. |
| `... (the debug log names its key)` | With `scope: session`, a saved record, Hide choice, or Undo journal entry of Sandbox Tuner is not valid. Its key can name a target of another session, so the band, the pane, and the report leave it out. The debug log names it. |
| `... is already in ..., but Claude Code has not applied it yet ...` | Run `/status` to check that the session loads user settings, and look for a ConfigChange hook that blocks the change. Then press again. |
| `... leads to ... Nothing was written.` | The folder is a link. The rest of the line is the verdict at its real place. |
| A verdict sentence, then `Nothing was written.`, after a folder **Allow** | A link puts a credentials folder or a protected place inside the folder. The sentence names the verdict. |
| `... name one place on a file system that ignores letter case ...` | A guarded folder or a `PATH` folder differs from the folder only in letter case. On a file system that ignores case, such as the macOS default, both are one place. Nothing was written. |
| `... is no longer in ...: another session or program saved the file at the same moment ...`, or `... is again in ...` after Undo | Two writes crossed, and the other one took the change back. Retry Allow or Deny. For Undo, press **Retry Undo**. |
| `... could not check ... after the write ...` (debug log only) | Sandbox Tuner could not read the file two seconds after the write to check the entry. Look at the file. |
| `... could not check where ... leads ...` | Sandbox Tuner could not find the real place of the folder, or of a credentials folder, protected place, or `PATH` folder, such as a link to a missing place. It wrote nothing. Fix or remove that link, or add the entry by hand. With `guarded directory traversal limit exceeded`, the places that one link walk reads hold more than 1,000 folders or 25,000 entries, such as a large `skills` folder in the config folder, a large credentials folder, or very many installed plugins and VS Code extensions: see Known limits. |
| `session.start: ... leads to ..., which lies inside "..."`, or `... holds "..."`, or the same after `clock.every:` (a toast, and the debug log) | A link, a guarded folder, or a `PATH` folder leads into a folder that Allow opened, or to a folder that holds it, so sandboxed commands can change what it names. Press **Undo** for each named entry in the pane, or remove the link. When the Applied list has no working Undo for an entry, for example when a restored backup brought back an entry after its Undo, the toast names its settings file instead: remove the entry from that file by hand. Sandbox Tuner checks this at the start of each interactive session, also after `/clear`, `/resume`, or `/branch` (`session.start:`), and every 15 minutes during it (`clock.every:`), while the entry is still in your settings file. A timed check names only what the session was not warned about since it started. With `scope: session`, the Applied list shows only the changes of the current session and, in a branch, the changes that its history made up to the branch. So for a folder that another session opened outside that list, the toast names its settings file: remove the entry by hand, or set `scope` to `all` and press its Undo. |
| `... could not finish the link check of the folders that Allow opened ...` | At a session start or a timed check, Sandbox Tuner could not follow the named links, or one walk read more than 1,000 folders or 25,000 entries, or could not read a folder. It warned about what it found before. Fix or remove the named links. A link that the check did not reach can still lead into such a folder. |
| `... could not check the folders that Allow opened ...` (debug log only) | At a session start or a timed check, Sandbox Tuner could not read its Undo journal, the settings file, or your settings, so it did not check the folders that Allow opened. |
| `... the pane is not placed: ...` | The app does not place panes. Run `/sandbox-tuner` in the terminal or a newer desktop app. |
| `... skipped a sandbox report line of an unknown form ...` | Your Claude Code build writes sandbox reports in a format that Sandbox Tuner does not know. Update Sandbox Tuner, or report the line. Sandbox Tuner quotes at most 80 characters of a line that starts like a report line. Of any other line, it gives only the length, because that line can be command output that imitates a report. |
| `... skipped a <sandbox_violations> block that does not end the text of a failed call ...` (debug log only) | Output followed that block, so the command printed it, and Sandbox Tuner did not count it. If it was a real sandbox report, your Claude Code build adds text after its report that Sandbox Tuner does not know: update Sandbox Tuner, or report it. Sandbox Tuner quotes nothing of the block, because the command can print one. |
| `... could not show the notice "..." ...` (debug log only) | The press finished, but its notice could not be shown. The debug line holds the notice. |
| `Nothing applied: ...` | Your settings changed after the drawing. The rest of the line is the current verdict. |

## Known limits

- **The link check before a folder Allow has blind spots.** Before a folder Allow, Sandbox Tuner follows each link that it finds in the guarded folders. In Claude Code's config folder (`~/.claude`), it reads only where code or settings that run outside the sandbox live: the top level, `hooks`, `commands`, `agents`, `skills`, `output-styles`, `workflows`, the plugins, and `local`. It skips the data folders, such as transcripts (`projects`), `todos`, `shell-snapshots`, `logs`, `debug`, `statsig`, `cache`, `backups`, and `file-history`, and the `.git` folder of each plugin marketplace. It reads only the top two levels of each installed plugin, plugin marketplace, and plugin data folder, of `local`, and of each VS Code extension in `~/.vscode/extensions`. A link in a skipped folder, or deeper in a plugin, in `local`, or in an extension, does not stop a folder Allow. Neither does a hard link, or a link made after the check. While a folder that Allow opened is still in your settings file, Sandbox Tuner walks the same guarded folders again, once for all such folders, and finds where the `PATH` folders lie: at the start of each interactive session, also after `/clear`, `/resume`, or `/branch`, and every 15 minutes during an interactive session (the `linkCheckMinutes` option). One check runs at a time: a timed check that comes during a walk waits for it. A toast then names each link, guarded folder, or `PATH` folder that leads into such a folder, or to a folder that holds it, names each such folder, and points to Undo, or to the settings file to edit by hand when the Applied list has no working Undo for the folder. The check covers every session with both values of `scope`. With `scope: session`, the Applied list shows only the changes of the current session and, in a branch, the changes that its history made up to the branch. So the toast names the settings file of a folder that another session opened outside that list: set `scope` to `all` to press its Undo instead. A timed check names only what the session was not warned about since it started. Like Allow, it ignores letter case, so it can also warn about a folder whose name differs only in case. The walk does not enter such a folder. This check warns and does not take the grant back. It skips the same folders. It finds no hard link, because Claude Code does not tell a mod which names share one file. A link made during a session shows at the next timed check, so sandboxed commands can use it for up to 15 minutes, by default, before a toast names it. With `linkCheckMinutes` at 0, it shows only at the next session start. With `claude --resume`, the same toast can show twice when saved data loads slowly. A link that it cannot follow, and a walk that cannot finish, such as one that reads more than 1,000 folders or 25,000 entries, show in the pane after `Last background problem:`. The toasts still name what it found before. Read the change before you press.
- **A large guarded folder makes folder Allow refuse.** Sandbox Tuner walks the protected places and the credentials folders in two walks. Each walk reads at most 1,000 folders and 25,000 entries. A walk that needs to read more, or cannot read a folder, refuses the grant. A large `skills` folder, a credentials folder with many files, or very many installed plugins and VS Code extensions can cause `guarded directory traversal limit exceeded`. If you trust the folder, add it to `sandbox.filesystem.allowWrite` in your user settings file by hand.
- **A temp folder Allow opens the folders inside it.** Each folder in `/tmp` is its own target, unless your home folder lies in `/tmp`, where the cache rule names the target. A blocked write that named a protected file or a key file keeps its own folder closed, but not a temp folder that holds that folder. For example, Allow for `/tmp/a` also opens `/tmp/a/b`, where an earlier blocked write named `/tmp/a/b/test.key`. Sandbox Tuner also does not look inside a temp folder for a `.git` or `.claude` folder that no blocked write named, such as a repository that you cloned into `/tmp`. Before you press Allow for a temp folder, check the rows of the folders inside it, and what the folder holds.
- **Wildcard rules and rules with no known anchor make Sandbox Tuner cautious.** It counts an `Edit(<folder>/**)` allow rule as cover only when the folder has no wildcard. So it can offer Allow for a folder that a wildcard Edit rule already opens. A deny rule with a wildcard, in `permissions.deny` or in `sandbox.filesystem`, withholds Allow for every folder under the folder that holds its first wildcard. For example, `Read(~/**/*.key)` withholds Allow for every folder in your home folder. In command-line or managed settings, a rule path that starts with a single `/`, and a relative `sandbox.filesystem` entry, have no known anchor. Such an Edit allow rule or `allowWrite` entry counts as no cover. Such a deny rule or `denyWrite` or `denyRead` entry withholds Allow for every folder.
- **Paths from error text can be wrong.** When no sandbox report names a file, Sandbox Tuner takes the path from a permission error such as `Operation not permitted`. Punctuation in the error can cut the path short. A relative path counts from the session working directory, which can differ from the folder where the command ran. The error can also come from a blocked read. So a guessed block can name the wrong folder. Sandbox Tuner offers Allow for it only within the limits in [Confirmed and guessed blocks](#confirmed-and-guessed-blocks), with a label next to the Allow. Read the path and the command before you press.
- **A failed command can forge a sandbox report.** Claude Code adds the sandbox report of a failed command at the end of the command's output, and can add a proxy note after it. So Sandbox Tuner reads only the `<sandbox_violations>` block that ends that output, before any proxy note. It skips a block that other output follows, and writes a debug line. But a command that prints a block as its last output, for example from a file, and then fails, still forges a report: Sandbox Tuner counts that block as a block. Such a block counts only while the sandbox is on, and not when the command ran outside the sandbox at Claude's request. A Claude Code version that adds other text after its report makes Sandbox Tuner skip the real report too, with the same debug line. Before you press Allow, check that you expect the host or folder. Also check the command that the band names, or the programs that the pane lists.
- **Read, Mach lookup, and socket blocks get no fix.** When a sandbox report names such an operation, the band explains it for the current session only. Sandbox Tuner saves no count for it and offers no Allow. For an operation that it does not know, the band says that it cannot classify it.
- **Later background output goes unseen.** For a background Bash command or a shell Monitor launch, Sandbox Tuner counts the hosts that the launch declared, once, when it starts. It does not read the later output, so blocks there give no sighting.
- **A tool that ignores the sandbox proxy can still fail for an allowed host.** Covered rows in the band, the pane, and the report suggest checking the tool's proxy settings and supported protocols. Sandbox Tuner offers no command exclusion.
- **A target that your settings already allow cannot be hidden.** While your settings allow it, its row in the pane has no Hide, and it stays at the end of its list. A target that you hid before your settings allowed it stays in the Hidden list, with Unhide.
- **A program that saves settings during a press can clash with it.** Presses in different sessions take turns through a lock file, `settings.json.sandbox-tuner.lock` next to your settings file. Under the lock, a press reads the file again and applies its change to what the file holds then, so it keeps an entry that another session added meanwhile. It refuses when the new text conflicts with its change. A program other than Sandbox Tuner ignores the lock. When it saves the file during a press, the press refuses, or tells you two seconds later that its change was taken back, and that program can lose its own change, which Sandbox Tuner cannot see. Claude Code gives a mod no exclusive file create, so a press claims the lock by writing it and reading it back. Two presses that claim it in the same instant can both go ahead, and can then clash the same way. If two such presses add the same entry with the same recorded time, both Undo buttons can refuse with "a later journal entry owns this setting": remove the unwanted entry from your user settings file by hand. A press that stops while it holds the lock, for example when Claude Code quits, leaves it held. Presses in other sessions then wait 3 seconds and refuse, until the lock is 30 seconds old and the next press takes it over. Claude Code gives a mod no way to delete a file, so the lock file stays, marked free.
- **An unfinished addition can claim an entry that you add by hand.** A press that stops after it saved its Undo record, for example with "could not write" or "could not save the Undo journal", can leave the change marked "addition unconfirmed" in the Applied list. If you then add the same entry by hand, Sandbox Tuner takes it for its own change, and its Undo removes your entry. To keep a manual entry, do not press that Undo.
- **A settings file over 4 MiB cannot be edited.** Claude Code refuses a mod's read or write of a file over 4 MiB. So Allow, Deny, and Undo fail with "could not read" when your user settings file is larger. Sandbox Tuner saves the file in 2-space JSON, and that can make a compact file grow past 4 MiB: a compact file of 3.1 MiB can grow to 4.3 MiB. Then the press fails with "could not write". Edit such a file by hand.
- **A relative `CLAUDE_CONFIG_DIR` moves with the session.** Sandbox Tuner takes it from the session's project root: the folder where the session started, or where `/cd` or a worktree move took it. After such a move, Allow and Deny edit a different `settings.json`. The pane names the file after "Settings file:". Set `CLAUDE_CONFIG_DIR` to an absolute path.
- **Undo reaches only the 50 newest changes.** The Applied list keeps the 50 newest changes of every session, plus each change whose addition or removal is unconfirmed. With `scope: session`, it shows those of the current session and, in a branch, of its history up to the branch. An older change has no Undo. To take it back, remove its entry from your user settings file by hand.
- **The saved data only grows.** Each session saves its own sightings, and Sandbox Tuner deletes no saved sighting and no Undo record of a written change. With `scope: session`, each `/branch` adds a branch record that names the targets that the session before saw. Past 200 branch records, Sandbox Tuner removes the oldest that no view needs (see [Branches](#branches)). Near Claude Code's 4 MiB store limit, saves fail with a `sandbox-tuner:` problem, and Allow, Deny, and Undo can refuse to write. After a failed sighting save, Allow and Deny refuse for the rest of that session and in a branch of it. To start over, quit Claude Code and delete Sandbox Tuner's file in `$CLAUDE_CONFIG_DIR/plugins/store/`, or in `~/.claude/plugins/store/` when `CLAUDE_CONFIG_DIR` is unset. The file name starts with `sandbox-tuner`. This also deletes its Undo records.
- **A branch can inherit a target that the session before saw only after the branch.** A target record keeps no time for each session. So when a record of a target names the session before and other sessions, and was first seen before the branch, the branch inherits the target, also when the session before saw it only after the branch in another Claude Code process. A record that names only the session before, or that was first seen after the branch, follows the time of the branch.
- **Counts are a guide, and some counts and lists are capped.** Claude Code does not document whether saves from two sessions at the same moment both last, so a count can fall short. The pane and the report show only the newest 300 targets seen within 30 days. The Hosts, Write folders, Nothing to allow here, and Hidden lists of the pane, and each section of the report, show at most 25 targets. One call counts at most three write folders, and a further write folder in that call gets no count and no explanation. Sandbox Tuner reads only the last 200,000 characters of the output and of the error output of a call. A target keeps at most five ports, and checks against port-specific settings entries use only those ports. A target keeps at most 20 session ids and three program names. So the band, the pane, and the report count at most 20 sessions, and the pane and the report name at most three programs. Each Claude Code process keeps its own record of a target, with the 20 newest of its sessions. With `scope: session`, a resumed session shows the target only while one such record still names it, or while a branch record of its history holds it.

## Troubleshooting

- **No band.** The sandbox is off, the surface draws no band, a survey holds the band, you dismissed that target, or you already fixed that block. `/clear` and `/resume` also clear the band of the session before. `/branch` keeps it with `scope: session` only.
- **A target or a change of another session is missing.** With the default `scope: session`, the band, the pane, and the report show only what the current session saw and applied, and in a branch what its history saw and applied up to the branch. A target or a change of the session before that came after the branch does not show in the branch. An inherited change shows the live state of its entry: both sessions share one settings file, so an Undo of it in either session shows in both (see [Branches](#branches)). Set `scope` to `all` to show every session's targets and changes again.
- **No Allow.** Read the verdict line of the target.
- **A host that you approved at the network prompt.** Sandbox Tuner cannot see those approvals. In auto mode, it counts each host that Claude lists by name on a command that ran. A host that only a wildcard entry such as `*.example.org` covers gives no sighting when its connection succeeds. Neither does a host that your allowlist already covers, because Claude need not list it.
- **A target that your settings already allow, but the sandbox still blocks.** Possible causes include proxy bypass, a read block, or file permissions. Covered rows in the band, pane, and report suggest checking client proxy and supported-protocol settings. Run `/status` or `/doctor` for managed-settings warnings.
- **A tool that ignores the sandbox proxy** can fail even for an allowed host. Sandbox Tuner offers no command exclusions. When the block identifies a host or cache folder, the band explains it and offers that narrower fix if eligible. Otherwise, run the command yourself or approve a single retry.
- **Counts that do not match.** Each session saves its own counts, and Sandbox Tuner adds them up. Claude Code does not document whether saves from two sessions at the same moment both last, so a count can fall short.
- **Background commands.** Confirmed background Bash and shell Monitor launches count declared hosts once. Later output remains unobserved. Repeat a command in the foreground only when repeating its side effects is acceptable.

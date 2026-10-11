# Contributing to Sandbox Tuner

Sandbox Tuner is a Claude Code mod: a plugin with one hooks module. It needs Claude Code 2.1.288 or later.

## Check a change

Run these commands from the repository folder. Each must pass before you open a pull request.

1. `claude plugin validate .` checks the marketplace manifest.
2. `claude plugin validate .claude-plugin/plugin.json` checks the plugin manifest, the `types` contract, and the hooks module the way Claude Code reads them. It warns that `CLAUDE.md` at the plugin root is not loaded as project context. That is expected: `CLAUDE.md` is for the people and agents who work on this repository.
3. The type check. Claude Code writes `.claude-plugin/types/` and `tsconfig.json` in mod development environments, such as an interactive `claude --plugin-dir .` session. Headless and SDK sessions do not regenerate them. Include both the `claude-code` and `claude-code-tools` declarations. Git ignores both files. Then run `tsc -p .` with TypeScript 7.0 or later. It must print nothing.

## Test a change

The repository holds no test files. Test your change with Claude Code's test kit:

1. Write test files (`*.test.ts`) in a `tests/` folder. They import `test`, `expect`, and `mock` from `claude-code/testing`.
2. Run `claude plugin test .`. Every test must pass.
3. Keep the test files out of your commits.

Test the parsers, the verdicts, the state changes, and each main path a person takes: a block in the band, a press of Allow, Deny, Hide, or Undo, the pane, and `/sandbox-tuner`. Stub every `$` call: a test never runs a real command and never writes a real file.

## Rules for a change

- Write a failing test first, then the code.
- Write each `$` call in full in `hooks/register.tsx`. Pass `$` only to functions declared at the top level of that file, and to `read` and `update`. Write each event name as a string literal.
- Keep the rules in the pure modules under `hooks/`. They take no `$`.
- Keep each sentence of the band, the pane, the report, the command, and the notices in `hooks/words.ts`. Each diagnostic reads `sandbox-tuner: <event> (<detail>): <cause>`.
- Sandbox Tuner writes settings only from a Button press, and no band Button has a hotkey. Keep it that way.
- Use general examples: `/home/u` as the home folder, and public hosts such as `example.org`. Do not put hosts, paths, or names from your own machine in a file.
- Leave no unused export, branch, or option.

## Send a change

1. Fork the repository and create a branch.
2. Make the change and test it locally.
3. Run the checks above.
4. Open a pull request. Say what changed, why, and how you tested it.

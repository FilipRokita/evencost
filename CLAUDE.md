@README.md

# Agent Guidelines & Behavior

You are the hands; the human is the architect. Move fast, but never faster than
the human can verify.

## 1. Think Before Coding

- Never silently assume or guess requirements. If an ask is ambiguous, stop and
  ask clarifying questions first.
- Surface tradeoffs: present 2-3 viable paths if there is no obvious single
  choice.
- State your assumptions explicitly before implementing non-trivial logic.

## 2. Simplicity First

- Implement the absolute minimum code that solves the problem. Nothing
  speculative.
- No single-use abstractions, premature factories, or unused configurability.
- If a task can be done cleanly in 20 lines without adding a dependency or
  complex pattern, don't write 100 lines.
- Test question: *"Would a senior developer ask why didn't you just do X?"*

## 3. Surgical Changes

- Touch only what was explicitly requested.
- Do NOT refactor adjacent files, do NOT reformat unrelated code, and do NOT
  delete "dead" code unless told to do so (point it out instead).
- Respect and match the existing codebase style, naming conventions, and file
  structure.
- Every line in the git diff must trace directly back to the prompt.

## 4. Goal-Driven Execution

- Define clear success criteria before writing code (e.g., a specific test
  passing, command output, or verified behavior).
- Test-first bias: when fixing a bug, write a failing test first, then fix the
  code until it passes.
- Loop and verify yourself before declaring the task done.

# Project

## Language

Reply in the language the prompt is written in. Everything committed to the
repo, whether code, comments, commit messages, README or docs, is in English.

## Answers

Lead with the answer, and keep it short. Recommend one path once a choice is
clear; enumerate alternatives only in the case §1 describes. Verify versions,
flags and APIs against the installed tooling or the official docs before
stating them. Do not answer from memory.

Break it up. Short paragraphs, lists, tables. One idea per line. Never a wall of
text to wade through.

## Copy

Never use an em dash in text a user will read: UI labels, headings, landing copy,
error messages, emails. End the sentence and start a new one, or use a comma or
colon. Docs, code comments and commit messages are fine as they are. README.md
is the exception: it is user-facing, so the em-dash rule applies there too.

## Documentation

[`README.md`](README.md) is imported at the top of this file, so it is always in
context. Keep it current. Everything else lives in [`docs/`](docs/), which is
**not** loaded automatically: read what is relevant before acting there.

Whichever one a change makes stale, update it in the same change rather than
later. This file is part of that rule too: when a workflow, command, path or
rule it names changes, update `CLAUDE.md` in the same change.

## Secrets

Treat the repository and its entire history as public. Before every commit:

- Never commit `.env`, `.devcontainer/.env`, keys, tokens, connection strings
  with credentials, or personal settings files. Only `.env.example` files with
  placeholders belong in git.
- Check `git status` and `git diff` first. Never run a blind `git add -A`.
- Do not put secret values in code, docs, tests, logs, commit messages, or chat.
- Keep personal files ignored: `.claude/settings.local.json`, `.claude/plans/`,
  `dev-only/`.
- If a secret ever leaks, rotate it first. Removing it from git does not undo
  the exposure.

## Dev only

`dev-only/` is a gitignored scratch space for prototypes, mocks and experiments.
Nothing in it is part of the product.

## Planning

Plans live in `.claude/plans/`, gitignored and local to one machine. One plan is
one entry: a single `.md` when that's all it needs, a folder (`plan.md` plus its
attachments) when it produces a mock, research or anything else. Name it for the
work it does, `invite-expiry` rather than `implementation-plan`, so the next plan
gets its own entry instead of overwriting this one.

Whatever a plan produces stays in its entry. `dev-only/` is scratch space for
prototypes tied to no plan.

Every plan ends with a review and testing stage: check that it was fully
implemented, that every rule and acceptance criterion has code and tests, and
that the app still works as a whole. Fix what is broken or write it down as a
named limitation.

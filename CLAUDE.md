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
repo — code, comments, commit messages, README, docs — is in English.

## Answers

Lead with the answer, and keep it short. Recommend one path once a choice is
clear; enumerate alternatives only in the case §1 describes. Verify versions,
flags and APIs against the installed tooling or the official docs before
stating them — do not answer from memory.

Break it up. Short paragraphs, lists, tables — one idea per line. Never a wall
of text to wade through.

## Documentation

[`README.md`](README.md) is imported at the top of this file, so it is always in
context — keep it current. Everything else lives in [`docs/`](docs/), which is
**not** loaded automatically: read what is relevant before acting there.

Whichever one a change makes stale, update it in the same change rather than
later.

## Dev only

`dev-only/` is a gitignored scratch space — prototypes, mocks, experiments.
Nothing in it is part of the product.

## Planning

Implementation plans are written to `.claude/plans/`, which is gitignored and
local to one machine. How we plan is set out here as we settle on it.

**One plan, one entry, named for the work it does.** A plan that fits in a
single file stays a file; one that produces attachments becomes a folder:

```
.claude/plans/invite-expiry.md      # simple — the plan alone is enough
.claude/plans/v1-full-app/          # has things attached to it
  plan.md
  prototype.html
  stack-research.json
```

`invite-expiry`, not `implementation-plan` or `plan-2` — a short name saying what
the plan is for. The next plan then gets its own entry instead of overwriting
this one. Don't build a folder for a plan with nothing to put in it.

Everything a plan produces goes in its entry, never elsewhere in the repo: a
prototype that belongs to a plan lives with it. `dev-only/` is scratch space —
for prototypes tied to no plan.

---
title: agentmem
short: One shared, searchable memory for three AI coding tools, so a decision made on Monday is still known on Tuesday.
kind: independent
status: daily-use
period: October 2026
role: Designed and built it.
stack: [Python, SQLite, Obsidian, Claude Code, Codex, OpenCode]
order: 6
home:
  chapter: learn
  note: What one agent learned is searchable by the next, labelled as current or historical.
  stack: [memory-graph]
repo: https://github.com/Casper5253/agent-memory
facts:
  - label: Agents captured by one pipeline
    value: 3 (Claude Code, Codex, OpenCode)
    source: agent-memory README
  - label: Time a capture adds to an agent turn
    value: about 1 second, and it never fails the turn
    source: agent-memory README
  - label: Automated tests on the final candidate
    value: 607, all passing
    source: agent-memory release decision
  - label: Contract criteria passing on live evidence or review
    value: 10 of 10; Claude Code and Codex verified live, OpenCode not yet
    source: agent-memory acceptance evidence
artifacts: [memory-graph]
---

## The problem

Three agents, each with its own transcript format and its own amnesia. A decision made with Claude on Monday was invisible to Codex on Tuesday, and the old setup dumped hundreds of megabytes of raw transcripts into my notes.

## My role

I designed and built it.

## Approach

The rule I ended up with: sessions are evidence, each project has one status page that states its current state, and search is the bridge between them.

- **Capture without slowing anything down.** Hooks in each tool only queue a small job; a detached worker does the rest.
- **Every item cites its session.** A new item is kept only with a citation to its session note, and its quote must appear in the session digest.
- **Code decides what retires, and why.** The model proposes changes. Code lets an item leave the page only when a compatible, newer, cited item replaces it, or when its section is over its cap. The oldest evidence goes first. A retired item moves to the project history with its reason.
- **One note per session.** A session becomes one short note. A session that grows later adds a part instead of editing the note.
- **Redact first.** Secrets are removed before any model sees the text, and raw transcripts never enter the notes.
- **Label every answer.** Search results say whether they are current, historical or reference, so an agent knows what kind of truth it is reading.

## Result

Verified live on Claude Code and Codex, with the real vault and real sessions. The live runs found defects that the unit tests had missed. Startup sections were cut at the context cap. Search labels were wrong on stale excerpts. The model once dropped a cited decision. Background workers flashed console windows. Each defect got a test that fails on the old code, and each fix was checked live again. The final candidate passes 607 tests.

OpenCode is installed and covered by the tests, but not yet verified live. Its quota was nearly spent during the release checks.

## What I learned

Labelling each search hit as current or historical mattered more than finding more hits. Unit tests passed while live sessions still failed. The live runs were the real test.

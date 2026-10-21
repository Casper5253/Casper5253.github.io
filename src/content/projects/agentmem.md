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
artifacts: [memory-graph]
---

## The problem

Three agents, each with its own transcript format and its own amnesia. A decision made with Claude on Monday was invisible to Codex on Tuesday, and the old setup dumped hundreds of megabytes of raw transcripts into my notes.

## My role

I designed and built it.

## Approach

The rule I ended up with: sessions are evidence, project notes are current knowledge, and search is the bridge between them.

- **Capture without slowing anything down.** Hooks in each tool only queue a small job; a detached worker does the rest.
- **Reconcile, don't append.** Each session becomes a short note, and the project's current-state note is rewritten rather than grown forever.
- **Redact first.** Secrets are removed before any model sees the text, and raw transcripts never enter the notes.
- **Label every answer.** Search results say whether they are current, historical or reference, so an agent knows what kind of truth it is reading.

## Result

In daily use on every session on my machine, across all three tools. The graph above is the memory itself: project notes as hubs, with their sessions around them.

## What I learned

Labelling each search hit as current or historical mattered more than finding more hits.

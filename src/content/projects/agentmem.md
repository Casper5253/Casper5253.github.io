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
article:
  title: Goldfish no more
  href: /writing/agentmem/
  standfirst: My coding agents forgot everything the moment a session ended. Teaching them to remember was easy. Teaching them what to forget took the rest of the month.
facts:
  - label: Agents captured by one pipeline
    value: 3 (Claude Code, Codex, OpenCode)
    source: agent-memory README
  - label: Time a capture adds to an agent turn
    value: about 1 second, and it never fails the turn
    source: agent-memory README
  - label: Sessions that never reached the first version's project note
    value: 92 of 213
    source: agent-memory docs/llmwiki-evaluation/LESSONS.md
artifacts: [memory-graph]
---

## The problem

Three agents, each with its own transcript format and its own amnesia. A decision made with Claude on Monday was invisible to Codex on Tuesday. My first fix saved everything, and still leaked: sessions that never reached the project note, invented facts, and reversed decisions that came back as current. Memory that is confidently wrong is worse than none.

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

Every new session now opens with a short briefing: what the project is for, what works, what's in progress, the key decisions with their reasons, and what's next. Change your mind on Wednesday, and Monday's decision moves to history with the reason it was replaced. The next session only sees the current call, and can still find out why it changed.

## What I learned

Test the job, not the parts. Every component passed while the product failed, and the bugs that mattered only showed up once real agents ran real sessions. Let the model propose and let code decide: every rule that mattered ended up in code.

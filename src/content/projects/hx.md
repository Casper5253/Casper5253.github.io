---
title: hx and the Herdr team
short: Three AI coding agents working as one team, with the routing, review and memory that keep me in control.
kind: independent
status: daily-use
period: October 2026
role: Designed and built it, directing AI agents and reviewing their work.
stack: [Python, Herdr, Claude Code, Codex, OpenCode, pytest]
order: 1
home:
  chapter: deliver
  note: Runs every multi-agent session I start, including the ones that built this website.
  stack: [hx-article, hx-team, hx-router, hx-compaction, hx-cost]
repo: https://github.com/Casper5253/herdr-orchestration
article:
  title: Herding three coding agents on one budget
  href: /writing/hx/
  standfirst: We put Claude, Codex and OpenCode side by side in one terminal and let them work as a team. The hard part turned out to be bookkeeping.
facts:
  - label: Worker context after a protected compaction
    value: 310K to 31.6K tokens, same session
    source: herdr-orchestration docs/REPORT.md
  - label: Coding models benchmarked before routing
    value: '7, on five tasks with checked graders'
    source: herdr-orchestration bench/RESULTS.md, 2026-10-16
  - label: Bugs found by live runs that unit tests missed
    value: '4'
    source: herdr-orchestration docs/REPORT.md
artifacts: [hx-article, hx-team, hx-router, hx-cost, hx-compaction]
---

## The problem

I run three AI coding agents side by side: Claude Code, Codex and OpenCode, each on its own subscription, each good at different things, each with a quota that runs out at an awkward moment. Running them in one terminal workspace (Herdr, a tmux-style multiplexer for agents) was easy. Making them behave like a team without me watching every pane was not. Who takes the next task? On which model? And what happens when a long session fills its memory with yesterday's work?

## My role

I designed and built hx, directing the agents that wrote most of the code and reviewing every change.

## Approach

hx is a small command-line control plane, standard-library Python with no server or database.

- **Smart model selection.** A deterministic router reads each pool's headroom, the kind of task and any earlier failure, then picks the worker, model and effort, and says why. The model ladders come from a benchmark of seven models, not from reputation.
- **Fix the input before the model.** A task that failed on an unclear brief is retried with a better brief, not a bigger model. Only a real capability failure escalates, one step at a time.
- **Proactive compaction.** Agents tidy their memory only at a finished task boundary, from a validated checkpoint, and must repeat their next step back before they get new work.
- **Independent review.** The lead plans, a cheap model implements, and a model from a different vendor reviews.

## Result

It runs every multi-agent session I start, this website included. In one live run a worker's context went from about 310K to 31.6K tokens in the same session, and it then built the next feature by reusing code it had written before the summary.

## What I learned

Tests prove the code; only a real run proves the system. Live runs found four bugs the unit tests could not, from terminal line wrapping to an installer that mangled a character. And most agent failures were an unclear brief or missing context, not a weak model.

---
title: QuantLab
short: From an idea to a designed, working, verified research prototype in one day.
kind: independent
status: prototype
period: October 2026
role: Set the brief, the ambition and the design calls; directed a team of AI agents that wrote the code.
stack: [Python, pandas, statistics, pytest, Claude Code, Codex, OpenCode]
order: 2
home:
  chapter: build
  note: From an idea to a designed, working prototype with verification and controls, in one day.
  diagram: quantlab-journey
  stack: [ql-article, ql-timeline, ql-hurdles]
article:
  title: What would an agentic AI quant researcher do?
  href: /writing/quantlab/
  standfirst: One day, five AI models and me. How the work was split, how fast it went, and why the team kept catching its own mistakes.
facts:
  - label: From one-page brief to working lab
    value: about 6.5 hours
    source: QuantLab git history, 11:35 to 18:09
  - label: Famous strategies tested
    value: 13; 12 can't tell, 1 doesn't work
    source: QuantLab registry/campaigns/C1.json
  - label: Agreement between the engine and a second engine written blind
    value: max difference 4e-16
    source: QuantLab tests/test_differential.py
artifacts: [ql-article, ql-timeline, ql-hurdles]
noImage: The repository is private; the article and its figures are public.
---

## The problem

Quantitative research is about not fooling yourself: an idea about markets becomes a precise rule, and the rule is tested against years of prices. Most backtests answer "how good could this have looked?". I wanted a lab that answers "do I actually know anything?", and I wanted to see how far a coordinated team of AI agents could take that in a single day.

## My role

I wrote the one-page brief, set the level of ambition, made the design calls and judged the results. The agents, working in parallel under a lead, wrote the code and reviewed each other.

## Approach

The key decision was to build the verification and the controls in from the first hour, not after the first exciting result.

- **Rules before data.** Every strategy and its three pass criteria were written down before anything ran.
- **Frozen data.** Prices were downloaded once, checked and frozen under a hash.
- **Two engines.** A second backtest engine, written blind by a different agent from the written description, must agree with the first to twelve decimal places.
- **A guard against yourself.** The runner refuses to start on uncommitted code, so every result traces back to the exact code and rules that produced it.

## Result

A working research prototype by early evening, already running thirteen well-known strategies across 73 funds and sixteen years of prices. Twelve came back "can't tell" and one did not work. The effects these strategies claim are too small to separate from noise with the data available: that is the finding, not a bug. It is a proof of concept, not a production trading system.

## What I learned

The maths was fine. The mistakes were in the instructions, several in the lead's own, and every one was caught because a different agent always checked. Bugs were found more often by running real data than by tests.

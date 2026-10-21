---
title: Semiconductor newsletter
short: A weekly semiconductor briefing for someone I know. The editor keeps the judgment; the tooling does the legwork.
kind: independent
status: in-progress
period: Since September 2026
role: Designing and building the workflow and tooling. The person who asked for it is the editor.
stack: [Python, SQLite, HTML]
order: 9
home:
  chapter: understand
  note: A real request from someone I know. The first job was working out who reads it and how the editor wants to work, before any code.
noImage: Work in progress for someone else, so no screens are shown yet.
caseStudy: true
---

## The problem

Someone I know wanted a weekly English briefing on the semiconductor industry: what changed in its business and geopolitics, why it matters, with the sources shown, and no investment advice. Finding the stories each week and turning them into something worth reading takes a lot of time, and the judgment about what matters has to stay with someone who knows the industry.

## My role

I design and build the workflow and the tooling. The person who asked for it is the editor and has the final say on every issue.

## How it works

1. **Gather.** Developments from the week are collected, each with its publisher, date and link.
2. **Choose.** The editor picks the stories from a list of 20 to 100 headlines, before any drafting starts.
3. **Draft.** The chosen stories are drafted, with each source cited next to the claim it supports.
4. **Review.** The editor rates each story, adds comments and expert input, and picks the lead. I work the feedback in.
5. **Approve.** We both approve the same final version before it is sent, by hand.

## Status

In progress. What works today, on practice material: the headline picker and the story review page, each a single file that opens in a browser with no setup; a small Python and SQLite core that keeps every revision, comment and approval; drafting help that proposes edits for the editor to accept or reject, which is technically checked but not yet tried by the editor; and the newsletter's design.

Not built yet: collecting real news (the practice headlines are generated, not real articles), the editor's sign-off on the workflow, scheduling and distribution. The first live issues come after that.

## What I learned

The first handoff passed every automated check and still did not work for the person it was for. A file that opens with one click beat a package that was technically correct.

---
title: Personal Finance Cockpit
short: Five banks and brokers, two currencies, one honest view, with every figure traceable to its source file.
kind: independent
status: finished
period: September to October 2026
role: Designed and built it.
stack: [Python, FastAPI, SQLite, React, TypeScript]
order: 8
home:
  chapter: deliver
  note: Built for my own daily use, local only, with every figure traceable to the file it came from.
noImage: The real screens contain private figures, so none are shown.
---

## The problem

My money is spread over two currencies, several banks, a broker and a robo-advisor. None of them talk to each other, and the exports range from tidy spreadsheets to PDF statements. I wanted one screen that answers "how am I doing, and why did that number change?" without handing my banking credentials to anyone.

## My role

I designed and built it.

## Approach

- **Local only.** No bank connections, no cloud, no fetched rates. A rate comes from a statement or from me, with its date and source.
- **Every number traceable** to the file and line it came from.
- **Partial is a state, not an error.** A total missing one exchange rate is shown, labelled partial, with the reason.
- **Private by design.** Real data never enters version control, and the AI agents that helped build it worked only on synthetic data.

## Result

Shipped for my own use, with importers for five institutions, spending and wealth views, budgets and a labelled cash forecast. No real figures appear on this site.

## What I learned

Whether the data can be trusted comes before any conclusion drawn from it.

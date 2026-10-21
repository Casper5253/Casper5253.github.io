---
title: Crisis simulation generator
short: An early generative-AI tool that turned a spreadsheet of requirements into detailed crisis scenarios, and was adopted.
kind: client
status: adopted
period: Around 2023 to 2024
role: Part of the small team that built it, contributing a bit of everything.
stack: [Python, Streamlit, ChatGPT API]
order: 4
home:
  chapter: deliver
  note: Adopted by the team it was built for, who used it to prepare scenarios they had been writing by hand.
  diagram: crisis
noImage: Internal tooling. The diagram on the home page shows the workflow; no screenshots or source material are shown.
---

## The problem

Crisis simulation exercises need detailed, realistic scenario material, and preparing it by hand takes a lot of careful work. When generative AI became usable inside organisations, this looked like a practical place for it: let the model draft the material, and leave the judgment to the people running the exercise.

## My role

I was part of the small team that built it, and contributed a bit of everything. I did not build it alone.

## Approach

- **Structured input.** The user describes what a scenario has to contain, for example in a spreadsheet, one requirement per row.
- **Generation.** A Python application with a Streamlit interface uses the ChatGPT API to write a detailed scenario script or case into each cell.
- **People keep the judgment.** The output is a draft for the exercise team to review and run, not a finished exercise.

## Result

The receiving team adopted it, and from then on used it to automate a scenario setup they had been doing manually. This was early in enterprise generative-AI adoption, before agentic tooling was common.

## What I learned

A tool that fits into how a team already works gets used. The team that asked for this one adopted it and prepared its scenarios with it from then on.

---
title: GenAI data-quality tool
short: From a small sample of a dataset to data-quality requirements and the code that checks them.
kind: client
status: demonstrated
period: Deloitte Netherlands
role: Technical lead and client demonstrations, in a shared project team.
stack: [Python, LangChain, Generative AI APIs, DAMA-DMBOK]
order: 3
home:
  chapter: refine
  note: Demonstrated several times to clients across the Netherlands; each demo was a conversation about what it could and could not do for their data.
  diagram: dq
noImage: Client work. The diagram on the home page shows how the solution works; no client material is shown.
---

## The problem

Data-quality checks are the unglamorous core of data management. Writing them by hand is slow: someone has to understand the dataset, agree what "good" means, and then write and maintain the code that checks it. The checks tend to lag behind the data they are meant to guard.

## My role

Technical lead and client demonstrations, in a project team whose work was shared. I did not build every part of it myself.

## Approach

The tool worked in five steps, each one inspectable by a person:

1. **Sample.** Read about 3% of the supplied dataset.
2. **Describe.** Infer the metadata: what each column holds, its format and type, the likely purpose of the dataset and its primary key.
3. **Propose requirements.** Write data-quality requirements in plain English, structured around the six data-quality dimensions of DAMA-DMBOK.
4. **Generate checks.** Write the executable code that implements those requirements.
5. **Add business rules.** Let the user add their own plausibility checks, including ones that span the whole table or need complex joins.

## Result

Demonstrated several times to clients across the Netherlands. I left the team before any follow-up, so this page claims the demonstrations, nothing more.

## What I learned

The interesting step was the second one. A tool that first explains what it thinks the data is gives people something concrete to correct, and that conversation is worth as much as the generated code.

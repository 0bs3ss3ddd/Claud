---
name: skill-first
description: Use at the start of any new, non-trivial task (build, implement, design, analyze, generate, deploy, test, migrate, etc.). Before doing the work, check whether an existing agent skill already covers it, using the find-skills skill, so the task is solved with proven instructions instead of from scratch. Skip for trivial questions, one-line edits and plain chat.
---

# Skill-first workflow

Goal: solve tasks with an existing, vetted skill when one exists. This saves tokens and gives better results than improvising.

## When to run
- A new task that needs more than a quick answer or a one-line change.
- Skip: simple questions, small edits, tasks where an installed skill is already clearly the right one, follow-ups in a task already underway.

## Steps
1. **Check installed skills first.** If one in the available-skills list fits, use it. Do not search the web.
2. **Otherwise search with find-skills.** Invoke the `find-skills` skill (or run `npx skills find <keywords>`) with 2-4 keywords from the task. Search once; do not loop.
3. **Vet candidates before installing.** Prefer well-known publishers and repos with real usage. Read the candidate's `SKILL.md` and check `allowed-tools`, scripts, and any curl/wget/eval/base64 or credential access. Reject anything suspicious.
4. **Install.** `npx skills add <repo-url> --skill <name> -y` in the project.
   - Known publishers (anthropics, vercel-labs, mattpocock): install and tell the user.
   - Unknown publishers: ask the user for confirmation first.
5. **Use it** to do the task. Tell the user in one line which skill was used and why.
6. **If nothing good is found**, say so in one line and proceed normally. Do not install weak matches.

## Token discipline
- One search, at most one or two installs per task.
- Read only `SKILL.md`, not whole repos.
- Do not commit or push installed skills unless the user asks, or the repo's own rules require it.

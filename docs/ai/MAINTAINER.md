# Maintainer workflow (ZizkaDB core team)

**External contributors:** use [CONTRIBUTING.md](../../CONTRIBUTING.md) and [AGENTS.md](../../AGENTS.md) only. You do not need assignee, reviewer, or footer rules below.

---

## Branch hygiene (maintainers)

Before starting work when multiple people land on `main`:

```bash
git fetch origin main
git checkout -B main origin/main
git checkout -b <topic>
```

Never `git push` to `main`. Never `gh pr merge` from automation — humans merge after review.

---

## GitHub PR metadata (`gh pr create`)

Set sidebar fields in the **same** `gh pr create` when you are a maintainer with repo permissions:

```bash
gh pr create \
  --label enhancement \
  --assignee saadamjad \
  --reviewer Zizka-ai \
  --body "..."
```

- Labels: `enhancement`, `bug`, and/or `documentation` (add `documentation` when KB/ADR/`CLAUDE.md` changed). Do **not** use `good first issue` on PRs.
- Body: `Closes #N` when the PR completes the issue, or `Related to #N` when it must stay open.
- Optional footer for team PRs: **Made with [Cursor](https://cursor.com) and Saad**

Fork contributors: a normal PR title + description + test plan is enough. Maintainers will assign reviewers.

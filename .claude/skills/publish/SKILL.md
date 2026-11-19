---
name: publish
description: End-to-end publish workflow - run CI, create the branch, commit, push, and open a pull request on GitHub. Use whenever the user asks to commit, push, open or create a PR, or publish the current work. Branch creation and PRs always go through this workflow, never manually.
user_invocable: true
---

# Publish

End-to-end workflow: CI → branch → commit → push → pull request.

GitHub (`origin` remote) is the only host for this repository.

## Steps

**1. Determine your starting point**

```bash
git rev-parse --abbrev-ref HEAD
git rev-parse --git-dir
git rev-parse --git-common-dir
git status --porcelain
git fetch origin main
git log --oneline origin/main..HEAD
```

If `--git-dir` and `--git-common-dir` resolve to **different** paths, you are in a
**linked worktree** (e.g. one created by `claude -w`, living under
`.claude/worktrees/<id>` on a branch like `worktree-<id>`). If they are the same,
you are in the **main checkout**.

- **Linked worktree:** you do **not** need to be on `main`, and you must **not**
  switch to it — that would abandon the worktree's purpose. The worktree's own
  branch already holds the work (committed and/or uncommitted). Treat that branch
  as what you're publishing: in step 4 you'll rename it in place instead of cutting
  a new branch, and the PR base is still `main`.

- **Main checkout, on `main`:** the ordinary case. Continue through every step.

- **Main checkout, on some other branch:** what matters is not the branch name but
  whether the work is already committed on a branch based on `origin/main`. The
  guard exists to stop a branch being cut from a stale or unrelated base, not to
  reject a branch that is already correct.

  - **`git status --porcelain` is clean and `git log origin/main..HEAD` lists only
    this work** — the branch is already what /publish would have created. Say so
    in one line, skip steps 3–5, and go to step 6 and push it. Confirm the base
    first with `git diff --stat origin/main`: if that shows changes you did not
    make, the branch is not based on current `main` — stop and tell the user.
  - **There are uncommitted changes** (typically: the last PR is merged, the
    session stayed on that branch, and new work landed in the working tree) —
    cut the new branch from `origin/main` rather than from here, which carries
    the uncommitted changes across:

    ```bash
    git fetch origin main
    git diff HEAD origin/main --stat   # must be empty, or list only files you did not touch
    git checkout -b <branch-name> --no-track origin/main
    git status --porcelain             # the same changes, now on a current base
    ```

    `--no-track` matters: without it the new branch's upstream is `origin/main`,
    which is what makes the short push form in step 6 push onto `main`.

    If `git diff HEAD origin/main` lists a file you have edited, the checkout
    would have to merge it — stop and tell the user rather than guessing.

  - **The branch carries unrelated commits** — stop and tell the user:

    > "You're on branch `<branch>`, not `main`, and it has commits that are not
    > part of this work. Switch to `main` before running /publish, or tell me
    > which commits should go in the PR."

  Cutting a new branch from the _current_ branch is always wrong here: it inherits
  whatever that branch already carries, and the PR then contains unrelated commits
  alongside the work.

**2. Run CI and fix all errors**

```bash
npm run ci 2>&1 | tail -40
```

This runs format → `astro check` → build → tests. A non-zero exit means a check
failed; read stdout/stderr carefully, fix every error, then re-run until it is
clean. If an error cannot be fixed automatically (missing secret, external
service outage), stop and explain the blocker.

Run this **before** staging, never after. `npm run ci` starts with
`prettier --write`, which rewrites the working tree and not the index — staging
first would commit the unformatted version and then fail `format:check` on CI.

The GitHub Actions workflow runs the same four steps on the PR, so this pass is
about not opening a red PR rather than being the only gate.

**3. Understand what changed**

```bash
git diff --stat HEAD
git log --oneline -10
```

Use this context for naming the branch and writing the commit message.

**4. Create a descriptive branch**

Name format: `<type>/<short-slug>`
Types: `feat` · `fix` · `refactor` · `chore` · `docs` · `test`
Slug: lowercase, hyphens, ≤ 40 chars, derived from the actual changes.

- **Main checkout:** cut a fresh branch off `main`:

  ```bash
  git checkout -b <branch-name>
  ```

  If step 1 already cut it from `origin/main` to carry work off a stale branch,
  it exists — skip this step rather than cutting a second one.

- **Linked worktree:** rename the existing worktree branch in place — this keeps
  all commits and uncommitted changes and needs no checkout:

  ```bash
  git branch -m <branch-name>
  ```

**5. Stage and commit**

```bash
git add -A
git status --porcelain
```

In a linked worktree the session may have already committed some or all of the
work. If there are staged changes, commit them (below). If the working tree is
clean but the branch is ahead of `main`, the work is already committed — skip the
commit and go straight to push.

Commit message structure:

```
<type>(<scope>): <imperative summary, ≤ 50 chars>

<body: what changed and why, 72-char wrap>

<footer: Closes #N or BREAKING CHANGE: … if relevant>
```

```bash
git commit -m "..."
```

**6. Push the branch**

Always push with a **full, explicit refspec**. Never `git push -u origin <branch-name>`:

```bash
git push origin refs/heads/<branch-name>:refs/heads/<branch-name>
git branch --set-upstream-to=origin/<branch-name>
```

The short form is not safe here. This user's global git config sets
`push.default = upstream`, so `git push -u origin <branch-name>` resolves the
destination from the branch's _upstream_ rather than its name — and if the branch
was cut with `git checkout -b <branch-name> origin/main` (which sets the upstream
to `origin/main`), that short form pushes the commit **straight onto `main`**,
silently, with a success message. It has already happened once. The explicit
refspec above names both ends and cannot be redirected by any config.

Then verify the push went where it was meant to:

```bash
git ls-remote --heads origin <branch-name>
```

If that prints nothing, the push landed somewhere else — stop and tell the user
before doing anything that could compound it.

The CI workflow triggers on `pull_request` and on pushes to `main` only, so this
push on its own starts nothing — the run appears once the PR exists. No duplicate
runs to clean up.

**7. Open the pull request**

PR descriptions are long, multi-line markdown, so write the body to a file first
(this avoids command substitution, which would otherwise need manual approval).
Use the project-local `tmp/` directory — it is gitignored and inside the project
root, so the write needs no out-of-tree filesystem permission.

```bash
mkdir -p tmp
cat > tmp/pr_body.md <<'EOF'
## Summary
<2–4 sentences: what and why>

## Changes
- <bullet list>

## CI
- [x] `npm run ci` passes locally (format, type-check, build, tests)

## Notes
<caveats or reviewer callouts>
EOF
```

If the work closes a GitHub issue, add `Closes #N` as the last line — on a squash
merge GitHub keeps the PR body, so the reference survives and closes the issue.

```bash
gh pr create --base main --title "<commit subject line>" --body-file tmp/pr_body.md
```

Print the PR URL once created.

**8. Confirm CI started**

```bash
gh pr checks --watch --fail-fast
```

If checks fail, fix them and use /amend to update the same PR — don't stack a
fix commit unless the user asks for one.

---

**Error table**

| Situation                                                           | Action                                                                                            |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Not on `main`, work already committed on a branch off `origin/main` | Not an error — skip steps 3–5 and push that branch (step 1)                                       |
| Not on `main`, with uncommitted changes                             | Cut the branch from `origin/main` with `--no-track`, carrying the changes (step 1)                |
| Not on `main`, branch carries unrelated commits                     | Stop, instruct user                                                                               |
| In a linked worktree (e.g. `claude -w`)                             | Don't switch to `main`; rename the worktree branch in place (step 4) and publish from it          |
| Nothing to commit but branch ahead of `main`                        | Work already committed — skip commit, push as-is                                                  |
| CI still failing after 3 fix rounds                                 | Stop, show errors, ask user                                                                       |
| `npm test` fails with "No build output"                             | The tests assert against `dist/` — run `npm run build` first, or just `npm run ci`                |
| `gh` not authenticated                                              | Tell user: `gh auth login`                                                                        |
| `gh pr create` says a PR already exists                             | Don't create a second one — point the user at /amend                                              |
| `gh pr create` says "No commits between main and main"              | The push landed on `main`, not the branch. Stop, tell the user, don't force-push without approval |
| `gh pr create` error                                                | Show error, do not retry silently                                                                 |

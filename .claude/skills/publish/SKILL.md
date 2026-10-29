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
```

If `--git-dir` and `--git-common-dir` resolve to **different** paths, you are in a
**linked worktree** (e.g. one created by `claude -w`, living under
`.claude/worktrees/<id>` on a branch like `worktree-<id>`). If they are the same,
you are in the **main checkout**.

- **Main checkout:** the current branch must be `main`. If it is not, stop
  immediately and tell the user:

  > "You're on branch `<branch>`, not `main`. Please switch to `main` before running /publish."

- **Linked worktree:** you do **not** need to be on `main`, and you must **not**
  switch to it — that would abandon the worktree's purpose. The worktree's own
  branch already holds the work (committed and/or uncommitted). Treat that branch
  as what you're publishing: in step 4 you'll rename it in place instead of cutting
  a new branch, and the PR base is still `main`.

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

```bash
git push -u origin <branch-name>
```

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

| Situation                                    | Action                                                                                   |
| -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Not on `main` in the main checkout           | Stop, instruct user                                                                      |
| In a linked worktree (e.g. `claude -w`)      | Don't switch to `main`; rename the worktree branch in place (step 4) and publish from it |
| Nothing to commit but branch ahead of `main` | Work already committed — skip commit, push as-is                                         |
| CI still failing after 3 fix rounds          | Stop, show errors, ask user                                                              |
| `npm test` fails with "No build output"      | The tests assert against `dist/` — run `npm run build` first, or just `npm run ci`       |
| `gh` not authenticated                       | Tell user: `gh auth login`                                                               |
| `gh pr create` says a PR already exists      | Don't create a second one — point the user at /amend                                     |
| `gh pr create` error                         | Show error, do not retry silently                                                        |

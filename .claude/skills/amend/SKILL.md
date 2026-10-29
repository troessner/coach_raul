---
name: amend
description: Fold the current working changes into the last commit and force-push to update the same open pull request on GitHub. Use when the user asks to amend, fold changes into the PR, update or revise an existing PR without stacking a new commit.
user_invocable: true
---

# Amend

Fold the current working changes into the last commit and update the **same**
open pull request by force-pushing the branch. Use this after a PR is already
open and you want to revise it without stacking a new commit.

If the user passed an argument (e.g. `/amend fix the hero crop`), use it as the
**new** commit subject. Otherwise keep the existing message (`--no-edit`).

## Steps

**1. Safety: confirm you're on a feature branch, not `main`**

```bash
git rev-parse --abbrev-ref HEAD
git rev-parse --git-dir
git rev-parse --git-common-dir
```

- If the branch is `main`, **stop** immediately:
  > "You're on `main`. Amend rewrites the last commit and force-pushes — never do
  > that on `main`. Switch to your PR branch first."
- If `--git-dir` and `--git-common-dir` differ you are in a **linked worktree**
  (e.g. `claude -w`); that's fine — the worktree branch is what you're amending.

**2. Confirm there's an open PR for this branch**

```bash
gh pr view --json number,url,headRefName,state
```

GitHub reports open state as `"OPEN"` (uppercase).

If there is no open PR, **stop** and tell the user:

> "No open PR found for this branch. Use /publish to create one — /amend only
> revises an existing one."

If the state is not `"OPEN"` (`MERGED` / `CLOSED`), stop and report it — don't
force-push onto a closed PR.

**3. Run CI and fix all errors**

```bash
npm run ci 2>&1 | tail -40
```

Format → `astro check` → build → tests. A non-zero exit means a check failed;
fix every error and re-run until clean. If a failure can't be fixed
automatically (missing secret, service outage), stop and explain.

Run this **before** staging. `npm run ci` begins with `prettier --write`, which
rewrites the working tree and not the index — staging first would amend in the
unformatted version and then fail `format:check` on CI.

**4. Review what's about to be folded in**

```bash
git status --porcelain
git diff --stat HEAD
git log --oneline -3
```

If the working tree is clean **and** no new message was passed, there is nothing
to amend — stop and say so. (A bare message change with a clean tree is still a
valid amend: it just rewords the last commit.)

**5. Stage and amend**

```bash
git add -A
```

- Keep the existing message (no argument given):

  ```bash
  git commit --amend --no-edit
  ```

- Or set a new subject (argument given). Write the message to a file first to
  avoid command substitution. Use the project-local `tmp/` directory (gitignored):

  ```bash
  mkdir -p tmp
  cat > tmp/amend_msg.txt <<'EOF'
  <type>(<scope>): <new imperative subject, ≤ 50 chars>

  <optional body explaining what changed and why, 72-char wrap>
  EOF
  ```

  ```bash
  git commit --amend -F tmp/amend_msg.txt
  ```

**6. Force-push with lease (never a raw force)**

```bash
git push --force-with-lease origin HEAD
```

`--force-with-lease` refuses to overwrite the remote branch if someone else
pushed in the meantime — it only succeeds when your local view of the remote is
current. If it is rejected, **stop**: the remote moved. Show the user the error,
suggest `git fetch` + review, and let them decide how to reconcile. Never
escalate to `git push --force`.

**7. Report**

```bash
gh pr view --json url,headRefOid
gh pr checks --watch --fail-fast
```

Print:

> Amended and force-pushed: <url>

The force-push re-triggers the PR's CI run. If the checks fail, fix and amend
again rather than stacking a commit.

---

**Error table**

| Situation                                    | Action                                                     |
| -------------------------------------------- | ---------------------------------------------------------- |
| On `main`                                    | Stop — never amend/force-push `main`                       |
| No open PR for branch                        | Stop, point user at /publish                               |
| PR merged or closed                          | Stop, report state, don't force-push                       |
| Clean tree and no new message                | Stop — nothing to amend                                    |
| CI still failing after fixes                 | Stop, show errors, ask user                                |
| `--force-with-lease` rejected (remote moved) | Stop, show error, let user reconcile — never raw `--force` |
| `gh` not authenticated                       | Tell user: `gh auth login`                                 |

## Notes for Claude

- This rewrites history on the PR branch by design — that's the whole point —
  but it must stay confined to a feature branch with an open PR. The `main`
  guard and the open-PR check are non-negotiable.
- Prefer `--force-with-lease` over `--force` always; the lease is the safety net
  against clobbering someone else's push.
- Don't open a new PR and don't change the base — /amend only updates the
  existing one.

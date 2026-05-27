---
name: feedback-git-push
description: User prefers to batch all git pushes to the end of a session, not push after every change
metadata:
  type: feedback
---

Do not push to git after each change during a session. Commit locally as needed, but only push when the user explicitly says to.

**Why:** User prefers to review all work at once and push in one batch at the end of the session.

**How to apply:** Commit with `git commit` freely, but never run `git push` unless the user explicitly says "push" or "запуш".

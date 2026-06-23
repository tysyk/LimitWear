# LimitWear Contributor Guidance

## Commit Messages

Use Conventional Commits for every commit:

```text
type(scope): short imperative description (LW-XXX)
```

Rules:

- Write commit messages in English.
- Use the imperative mood (`add`, `fix`, `update`), not the past tense.
- Do not end the subject with a period.
- Keep each commit focused on one logical change.
- Include the matching `LW-XXX` issue when the change belongs to a roadmap task.
- Use a short, meaningful scope such as `auth`, `api`, `web`, `ci`, or `payments`.
- Verify that the issue number matches the actual GitHub Project task.

Allowed types:

- `feat` - new functionality.
- `fix` - bug fix.
- `refactor` - structural change without a behavior change.
- `docs` - documentation.
- `test` - tests.
- `chore` - maintenance, configuration, linting, CI, or environment setup.
- `build` - build system or dependency changes.
- `perf` - performance improvements.

Examples:

```text
feat(auth): add refresh token support (LW-014)
fix(payment): validate Monobank signature (LW-XXX)
refactor(repo): migrate to monorepo structure (LW-002)
docs(baseline): update database architecture (LW-005)
test(auth): cover refresh token rotation (LW-014)
chore(ci): add GitHub Actions pipeline (LW-008)
```

Mark breaking changes with `!` and explain them in the commit body:

```text
feat(api)!: change authentication response format (LW-014)

BREAKING CHANGE: clients must read tokens from the session object
```

# Git Commit Standards

## Format

```
<type>: <description>
```

Keep commits short and simple. One line is enough for most commits.

## Types

| Type | Description | Version Bump |
|------|-------------|--------------|
| `feat` | New feature | MINOR (1.x.0) |
| `fix` | Bug fix | PATCH (1.0.x) |
| `docs` | Documentation only |  |
| `refactor` | Code change (no feature/fix) |  |
| `test` | Adding/updating tests |  |
| `chore` | Maintenance tasks |  |

## Breaking Changes

Add `!` after type for breaking changes:

```
feat!: remove deprecated API
```

Breaking changes trigger a MAJOR version bump (x.0.0).

## Rules

1. Use lowercase
2. No period at end
3. Use imperative mood ("add" not "added")
4. Keep under 72 characters

## Examples

```
feat: add user authentication
fix: resolve login timeout issue
docs: update API documentation
refactor: simplify validation logic
feat!: change response format
```

## Versioning

Follows [Semantic Versioning](https://semver.org/):

- `fix` → PATCH (1.0.0 → 1.0.1)
- `feat` → MINOR (1.0.0 → 1.1.0)
- `!` (breaking) → MAJOR (1.0.0 → 2.0.0)

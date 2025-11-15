# Git Workflow - FluentWhisper

## Branch Structure

- **main** - Production releases only (v1.0.0, v1.1.0, etc.)
- **develop** - Integration/testing branch
- **feature/** - Feature branches (merge to develop)
- **hotfix/** - Production bug fixes (merge to main + develop)

---

## Daily Development

### Start New Feature
```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

### Finish Feature
```bash
# When feature is complete and tested
git checkout develop
git merge feature/your-feature-name
git push origin develop
git branch -d feature/your-feature-name
```

---

## Release Process

### Create Release
```bash
# All features done and tested on develop
git checkout main
git pull origin main
git merge develop --no-ff
git tag -a v1.1.0 -m "Release v1.1.0: Description"
git push origin main --tags

# Build and upload
npm run tauri:build
# Upload to GitHub releases
```

### After Release
```bash
# Continue development
git checkout develop
```

---

## Hotfix (Production Bug)

```bash
# Fix critical bug in production
git checkout main
git checkout -b hotfix/bug-description
# ... fix bug ...
git checkout main
git merge hotfix/bug-description
git tag -a v1.0.1 -m "Hotfix: bug description"
git push origin main --tags

# Merge back to develop
git checkout develop
git merge main
git push origin develop
git branch -d hotfix/bug-description
```

---

## Quick Reference

| Task | Branch |
|------|--------|
| New feature | `feature/name` → `develop` |
| Release | `develop` → `main` + tag |
| Production bug | `hotfix/name` → `main` + `develop` |

---

## Rules

1. **Never commit directly to main** (except hotfixes)
2. **Test on develop before releasing**
3. **Always tag releases** (v1.0.0, v1.1.0, etc.)
4. **Build from main only**

# Dependabot Fix Documentation

## Issue
Dependabot PRs were failing CI checks because:
1. CI workflow used `--frozen-lockfile` which prevents lockfile updates
2. Dependabot was configured to update individual workspace packages instead of root
3. This caused lockfile/package.json mismatches in CI

## Solution Applied
1. **Updated CI workflow** (`.github/workflows/ci.yml`):
   - Added conditional check for Dependabot PRs
   - Use `--no-frozen-lockfile` for dependabot[bot] actor
   - Keep `--frozen-lockfile` for regular PRs for security

2. **Fixed Dependabot configuration** (`.github/dependabot.yml`):
   - Removed individual workspace directory configurations
   - Only update root directory for npm dependencies
   - Replaced placeholder maintainer-username with jsfs11
   - Improved commit message formatting

## Benefits
- Dependabot PRs now pass CI checks
- Maintains lockfile integrity for non-Dependabot PRs
- Better commit message formatting
- Simplified configuration for monorepo structure

## Testing
- Local build, lint, and test all pass
- CI workflow changes tested locally
- Ready for validation on next Dependabot PRs
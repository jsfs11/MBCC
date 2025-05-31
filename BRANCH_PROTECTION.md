# Branch Protection Rules Setup Guide

This document outlines the recommended branch protection rules for the MBCC monorepo to ensure code quality and maintain a stable codebase.

## Required Settings for `staging` branch

### 1. Require a pull request before merging
- **Require approvals**: 1 minimum
- **Dismiss stale PR approvals when new commits are pushed**: ✅ Enabled
- **Require review from code owners**: ✅ Enabled (if CODEOWNERS file exists)
- **Restrict pushes that create files that change the code owner**: ✅ Enabled

### 2. Require status checks to pass before merging
- **Require branches to be up to date before merging**: ✅ Enabled
- **Required status checks**:
  - `lint` - ESLint checks for all packages
  - `test` - Jest tests with 85% coverage requirement
  - `build` - Successful build for all packages

### 3. Require conversation resolution before merging
- ✅ **Enabled** - All PR conversations must be resolved before merging

### 4. Require signed commits (Recommended)
- ✅ **Enabled** - Ensures commit authenticity and security

### 5. Require linear history (Recommended)
- ✅ **Enabled** - Prevents merge commits, keeps history clean

### 6. Restrict pushes and force pushes
- **Restrict pushes**: ✅ Enabled for all users (including admins)
- **Allow force pushes**: ❌ Disabled
- **Allow deletions**: ❌ Disabled

## GitHub Repository Settings Configuration

### Step-by-Step Setup:

1. **Navigate to Repository Settings**
   - Go to your repository on GitHub
   - Click on "Settings" tab
   - Select "Branches" from the left sidebar

2. **Add Branch Protection Rule**
   - Click "Add rule"
   - Enter branch name pattern: `staging`

3. **Configure Protection Settings**
   ```
   ☑️ Require a pull request before merging
       ☑️ Require approvals (1)
       ☑️ Dismiss stale PR approvals when new commits are pushed
       ☑️ Require review from code owners
   
   ☑️ Require status checks to pass before merging
       ☑️ Require branches to be up to date before merging
       Required status checks:
           - lint
           - test  
           - build
   
   ☑️ Require conversation resolution before merging
   ☑️ Require signed commits
   ☑️ Require linear history
   ☑️ Do not allow bypassing the above settings
   ```

4. **Save the Rule**
   - Click "Create" to apply the branch protection rule

## Additional Recommendations

### Code Owners File
Create a `.github/CODEOWNERS` file to automatically request reviews from specific team members:

```
# Global owners
* @team-lead @senior-dev

# Mobile package
/packages/mobile/ @mobile-team @react-native-expert

# Server package  
/packages/server/ @backend-team @node-expert

# CI/CD configurations
/.github/ @devops-team @team-lead
/turbo.json @devops-team
```

### Repository Settings
Additional repository-level settings to consider:

1. **General Settings**
   - Disable "Allow merge commits" (to enforce linear history)
   - Enable "Allow squash merging" 
   - Disable "Allow rebase merging" (optional, based on team preference)

2. **Security Settings**
   - Enable "Restrict pushes that create files that change the code owner"
   - Enable vulnerability alerts
   - Enable security updates

3. **Notifications**
   - Configure team notifications for failed CI builds
   - Set up Slack/email integration for critical alerts

## Enforcement Strategy

### For Development Teams
- All developers must work on feature branches
- No direct pushes to `staging` branch allowed
- All changes must go through PR review process
- CI checks must pass before merge approval

### For Emergency Fixes
- Create hotfix branches from `staging`
- Follow same PR process but with expedited review
- Consider temporary bypass only for critical production issues
- Document all bypasses and review post-incident

## Monitoring and Maintenance

### Regular Reviews
- Monthly review of branch protection effectiveness
- Quarterly assessment of CI/CD pipeline performance
- Annual review of team access and permissions

### Metrics to Track
- PR merge time
- CI build success rate
- Code coverage trends
- Security vulnerability resolution time

## Troubleshooting Common Issues

### Status Check Failures
- **Lint failures**: Run `pnpm lint` locally before pushing
- **Test failures**: Ensure all tests pass with `pnpm test`
- **Build failures**: Verify build works with `pnpm build`

### Permission Issues
- Ensure team members have appropriate repository access
- Verify GitHub Apps have necessary permissions
- Check if branch protection rules are correctly configured

### CI/CD Pipeline Issues
- Monitor GitHub Actions workflow runs
- Check for dependency conflicts after updates
- Verify Turborepo cache is functioning correctly

## Contact and Support

For questions about branch protection setup or CI/CD pipeline issues:
- Create an issue in the repository
- Contact the DevOps team
- Refer to the CI/CD Implementation Plan documentation
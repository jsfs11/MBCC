# CI/CD Implementation Plan - Detailed Fixes

## Overview
This document outlines the specific fixes needed to complete the CI/CD implementation for the MBCC monorepo.

## Issues Identified

### 1. Missing Testing Dependencies

#### Mobile Package (`packages/mobile/package.json`)
**Missing Dependencies:**
```json
"devDependencies": {
  "@testing-library/react-native": "^12.4.2",
  "@testing-library/jest-native": "^5.4.3",
  "react-test-renderer": "18.2.0"
}
```

#### Server Package (`packages/server/package.json`)
**Missing Dependencies:**
```json
"devDependencies": {
  "@jest/types": "^29.6.3",
  "supertest": "^6.3.4",
  "@types/supertest": "^6.0.2"
}
```

### 2. Turbo Configuration Issues

#### Current `turbo.json` Problems:
- Test task unnecessarily depends on build
- Missing clean task definition
- Suboptimal caching configuration

#### Required Changes to `turbo.json`:
```json
{
  "$schema": "https://turborepo.org/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".expo/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "clean": {
      "cache": false
    }
  }
}
```

### 3. Jest Configuration Improvements

#### Mobile Jest Config (`packages/mobile/jest.config.js`)
**Add:**
```javascript
module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '@testing-library/jest-native/extend-expect'
  ],
  testMatch: ['**/__tests__/**/*.test.(ts|tsx|js)'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.stories.{ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|@expo|@unimodules)/)',
  ],
};
```

#### Server Jest Config (`packages/server/jest.config.js`)
**Add:**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.(ts|js)'],
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
```

### 4. GitHub Workflow Enhancements

#### Current Issues in `.github/workflows/ci.yml`:
- Missing mobile build artifacts upload
- Suboptimal Turborepo caching
- No conditional job execution for affected packages

#### Required Workflow Updates:

**Add Mobile Build Artifacts:**
```yaml
- name: Upload build artifacts (mobile)
  uses: actions/upload-artifact@v4
  with:
    name: mobile-build
    path: packages/mobile/.expo/
  if: hashFiles('packages/mobile/**') != ''
```

**Improve Turborepo Caching:**
```yaml
- name: Restore Turborepo cache
  uses: actions/cache@v4
  with:
    path: .turbo
    key: ${{ runner.os }}-turbo-${{ hashFiles('**/pnpm-lock.yaml') }}-${{ github.sha }}
    restore-keys: |
      ${{ runner.os }}-turbo-${{ hashFiles('**/pnpm-lock.yaml') }}-
      ${{ runner.os }}-turbo-
```

### 5. Additional CI/CD Components

#### Dependabot Configuration (`.github/dependabot.yml`)
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    reviewers:
      - "maintainer-username"
    assignees:
      - "maintainer-username"
  
  - package-ecosystem: "npm"
    directory: "/packages/mobile"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
  
  - package-ecosystem: "npm"
    directory: "/packages/server"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

#### Branch Protection Documentation
Create `BRANCH_PROTECTION.md` with GitHub repository settings:

```markdown
# Branch Protection Rules

## Required Settings for `staging` branch:

1. **Require a pull request before merging**
   - Require approvals: 1
   - Dismiss stale PR approvals when new commits are pushed: ✅
   - Require review from code owners: ✅

2. **Require status checks to pass before merging**
   - Require branches to be up to date before merging: ✅
   - Required status checks:
     - `lint`
     - `test`
     - `build`

3. **Require conversation resolution before merging**: ✅

4. **Require signed commits**: ✅ (recommended)

5. **Require linear history**: ✅ (recommended)

6. **Do not allow bypassing the above settings**: ✅
```

### 6. Package Version Alignment

#### Root Package.json Issues:
- React Native version mismatch with mobile package
- Missing workspace configuration optimization

#### Required Updates to Root `package.json`:
```json
{
  "name": "mbcc",
  "version": "1.0.0",
  "description": "Mood-Based Content Curator - A Daylio × Spotify Wrapped style app",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "clean": "turbo run clean",
    "test:coverage": "turbo run test -- --coverage"
  },
  "devDependencies": {
    "@types/react-native": "^0.73.0",
    "turbo": "^1.13.4"
  },
  "packageManager": "pnpm@8.15.0",
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=8.0.0"
  }
}
```

## Implementation Priority

### Phase 1: Critical Dependencies (High Priority)
1. ✅ Add missing testing dependencies to mobile package
2. ✅ Add missing testing dependencies to server package
3. ✅ Update Jest configurations with proper setup

### Phase 2: Configuration Optimization (High Priority)
1. ✅ Fix Turbo configuration
2. ✅ Enhance GitHub workflow
3. ✅ Add proper caching strategies

### Phase 3: Additional Components (Medium Priority)
1. ✅ Add Dependabot configuration
2. ✅ Create branch protection documentation
3. ✅ Add Jest setup files

### Phase 4: Testing & Validation (High Priority)
1. ✅ Test CI pipeline with sample commits
2. ✅ Verify coverage reporting works
3. ✅ Validate Turborepo caching

## Expected Results

After implementation:
- ✅ Complete testing setup for both packages
- ✅ Optimized CI pipeline with proper caching
- ✅ 85% code coverage enforcement
- ✅ Automated dependency updates
- ✅ Clear branch protection guidelines
- ✅ Fast feedback loop for developers

## Rollback Plan

If issues arise:
1. Revert package.json changes
2. Restore original turbo.json
3. Rollback GitHub workflow changes
4. Remove new configuration files

## Testing Strategy

1. **Local Testing:**
   ```bash
   pnpm install
   pnpm lint
   pnpm test
   pnpm build
   ```

2. **CI Testing:**
   - Create test PR with small changes
   - Verify all jobs pass
   - Check coverage reports
   - Validate artifact uploads

3. **Performance Testing:**
   - Monitor CI run times
   - Verify cache hit rates
   - Check resource usage

## Next Steps

1. Switch to Code mode for implementation
2. Apply all package dependency updates
3. Update configuration files
4. Test the complete pipeline
5. Document any additional findings
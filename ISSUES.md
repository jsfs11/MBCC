# MBCC - Known Issues and Technical Debt

> Last Updated: 2025-10-23
> Status: Active Development

## Overview

This document tracks known issues, technical debt, and areas for improvement in the MBCC (Mood-Based Content Curator) project. Issues are prioritized by severity and impact.

---

## 🔴 Critical Issues

### 1. TypeScript Strict Mode Disabled in Mobile Package

**Status:** Open
**Priority:** Critical
**Effort:** ~30 minutes
**Impact:** Type safety, runtime errors

**Problem:**
- `packages/mobile/tsconfig.json` has `"strict": false` and `"noImplicitAny": false`
- This contradicts project documentation claiming strict mode is enabled
- Type errors pass silently, no null checking, runtime errors go undetected
- Server package correctly has `"strict": true`, creating inconsistency

**Location:**
- File: `packages/mobile/tsconfig.json`
- Lines: 11, 14

**Expected Behavior:**
- Mobile should use strict TypeScript like the server
- All type errors should be caught at compile time
- Null/undefined checks should be enforced

**Steps to Fix:**
1. Enable `"strict": true` in `packages/mobile/tsconfig.json`
2. Enable `"noImplicitAny": true`
3. Fix resulting TypeScript errors (estimated 10-20 errors)
4. Add proper type annotations throughout codebase

**Benefits:**
- Catch bugs at compile time instead of runtime
- Better IDE autocomplete and IntelliSense
- Consistent TypeScript configuration across monorepo
- Safer refactoring

---

### 2. Zero Test Coverage for Mobile Application

**Status:** Open
**Priority:** Critical
**Effort:** ~6-8 hours
**Impact:** Code quality, maintainability, confidence in changes

**Problem:**
- Only 1 dummy test exists: `packages/mobile/__tests__/dummy.test.ts`
- 1,018 lines of code in App.tsx with 0% actual test coverage
- ErrorBoundary component completely untested
- All 5 main components untested (MoodSelector, ActivityInput, EmotionIntensity, NoteInput, MoodHistoryList)
- 3 utility functions untested
- Context provider untested
- CI/CD passes despite no real tests

**Untested Code:**
- `packages/mobile/App.tsx` - All 1,018 lines
- ErrorBoundary component
- MoodSelector component
- ActivityInput component
- EmotionIntensity component (with Animated API)
- NoteInput component
- MoodHistoryList component
- Date formatting utilities
- Error handling logic
- Context provider and state management

**Location:**
- Test file: `packages/mobile/__tests__/dummy.test.ts`
- Untested code: `packages/mobile/App.tsx`

**Steps to Fix:**
1. Create test file structure:
   - `__tests__/components/MoodSelector.test.tsx`
   - `__tests__/components/ActivityInput.test.tsx`
   - `__tests__/components/EmotionIntensity.test.tsx`
   - `__tests__/components/NoteInput.test.tsx`
   - `__tests__/components/MoodHistoryList.test.tsx`
   - `__tests__/context/MoodContext.test.tsx`
   - `__tests__/utils/dateFormatting.test.ts`
   - `__tests__/App.test.tsx`
   - `__tests__/ErrorBoundary.test.tsx`

2. Write comprehensive tests (estimated 200+ test cases):
   - Component rendering tests
   - User interaction tests
   - State management tests
   - Error boundary tests
   - Integration tests
   - Snapshot tests

3. Aim for minimum 80% coverage threshold

**Benefits:**
- Catch regressions early
- Safe refactoring
- Documentation through tests
- Confidence in deployments

---

## 🟠 High Priority Issues

### 3. Server Missing Structured Logging

**Status:** Open
**Priority:** High
**Effort:** ~2 hours
**Impact:** Observability, debugging, monitoring

**Problem:**
- 16 raw `console.log()` statements throughout server code
- No log levels (debug, info, warn, error)
- No correlation IDs for request tracking
- No structured logging format (JSON)
- Difficult to parse logs in production
- No integration with log aggregation tools

**Location:**
- File: `packages/server/src/index.ts`
- Lines: 68, 116, 123, 125, 152, 204, 216, 303, 459, 469, 482, 491, 495, 512, 525, 536, 547

**Current Code Example:**
```javascript
console.log('Initializing sentiment analysis pipeline...');
console.log('Server started on port:', PORT);
console.log({timestamp, method, url, statusCode, duration});
```

**Recommended Solution:**
Implement structured logging with winston or pino

**Expected Code Example:**
```javascript
logger.info('Initializing sentiment analysis pipeline', {
  component: 'sentiment',
  stage: 'initialization'
});
logger.info('Server started', {
  port: PORT,
  environment: process.env.NODE_ENV
});
logger.info('Request completed', {
  timestamp,
  method,
  url,
  statusCode,
  duration,
  correlationId
});
```

**Steps to Fix:**
1. Install winston or pino: `pnpm add winston`
2. Create logger configuration: `packages/server/src/utils/logger.ts`
3. Replace all console.log calls with logger calls
4. Add log levels appropriately (debug, info, warn, error)
5. Add request correlation IDs
6. Configure log rotation for production

**Benefits:**
- Better production debugging
- Integration with monitoring tools (DataDog, Splunk, etc.)
- Searchable, parseable logs
- Performance monitoring
- Request tracing

---

### 4. Missing TypeScript Return Type Annotations

**Status:** Open
**Priority:** High
**Effort:** ~30 minutes
**Impact:** Type safety, code clarity

**Problem:**
- 7 functions missing explicit return types in server code
- ESLint warnings for `@typescript-eslint/explicit-function-return-type`
- Reduces type safety and code readability

**Location:**
- File: `packages/server/__tests__/health.test.ts` - Line 6
- File: `packages/server/__tests__/moods.test.ts` - Line 6
- File: `packages/server/__tests__/rate-limit.test.ts` - Lines 5, 10
- File: `packages/server/__tests__/sentiment.test.ts` - Line 6
- File: `packages/server/src/index.ts` - Line 8

**Steps to Fix:**
1. Add explicit return types to all test functions
2. Add return type to index.ts function
3. Enable strict enforcement in ESLint config

**Example Fix:**
```typescript
// Before
async function testHealthEndpoint() {
  const response = await request(app).get('/api/health');
  expect(response.status).toBe(200);
}

// After
async function testHealthEndpoint(): Promise<void> {
  const response = await request(app).get('/api/health');
  expect(response.status).toBe(200);
}
```

---

### 5. Server Test Coverage Below Threshold (70.36%)

**Status:** Open
**Priority:** High
**Effort:** ~2-3 hours
**Impact:** Code quality, confidence

**Problem:**
- Current coverage: 70.36%
- Target: 80%+ (industry best practice)
- 163 uncovered lines in critical paths
- Missing tests for:
  - Error handler function (never called in tests)
  - Server startup function (never called)
  - POST /api/moods endpoint (only GET tested)
  - CORS configuration
  - 404 handler
  - Graceful shutdown logic

**Location:**
- Test files: `packages/server/__tests__/*.test.ts`
- Uncovered code: `packages/server/src/index.ts`

**Steps to Fix:**
1. Add tests for POST /api/moods endpoint
2. Add tests for error handler middleware
3. Add tests for CORS configuration
4. Add tests for 404 handler
5. Add tests for graceful shutdown
6. Add integration tests for sentiment analysis pipeline
7. Add error path testing (database failures, network errors)

**Estimated Additional Tests:** 15-20 test cases

**Benefits:**
- Better error handling verification
- Safer refactoring
- Higher confidence in edge cases

---

### 6. Monolithic Mobile App Component (1,018 Lines)

**Status:** Open
**Priority:** High
**Effort:** ~4 hours
**Impact:** Maintainability, testability, reusability

**Problem:**
- Single file `App.tsx` contains 1,018 lines
- Violates Single Responsibility Principle
- Contains:
  - Type definitions
  - Custom hooks
  - Utility functions
  - 6 separate components
  - Context provider
  - 234 lines of styles
- Impossible to test components individually
- Cannot reuse utilities across project
- Difficult to maintain and understand
- Poor code organization

**Location:**
- File: `packages/mobile/App.tsx` (1,018 lines)

**Recommended Structure:**
```
packages/mobile/
├── src/
│   ├── components/
│   │   ├── MoodSelector.tsx
│   │   ├── ActivityInput.tsx
│   │   ├── EmotionIntensity.tsx
│   │   ├── NoteInput.tsx
│   │   ├── MoodHistoryList.tsx
│   │   └── ErrorBoundary.tsx
│   ├── context/
│   │   └── MoodContext.tsx
│   ├── hooks/
│   │   └── useMoodState.ts
│   ├── types/
│   │   └── mood.types.ts
│   ├── utils/
│   │   └── dateFormatting.ts
│   ├── styles/
│   │   └── theme.ts
│   └── App.tsx (entry point, ~100 lines)
└── __tests__/
    ├── components/
    ├── context/
    ├── hooks/
    └── utils/
```

**Steps to Fix:**
1. Create directory structure above
2. Extract type definitions to `src/types/mood.types.ts`
3. Extract utilities to `src/utils/dateFormatting.ts`
4. Extract context to `src/context/MoodContext.tsx`
5. Extract each component to separate files
6. Extract styles to theme file
7. Update App.tsx to import and compose components
8. Write individual tests for each module

**Benefits:**
- Each component can be tested independently
- Utilities can be reused
- Easier to understand and maintain
- Better separation of concerns
- Easier code reviews
- Enables component library development

---

### 7. Inconsistent Jest Configuration Across Packages

**Status:** Open
**Priority:** Medium
**Effort:** ~30 minutes
**Impact:** Developer experience, consistency

**Problem:**
- Different coverage thresholds:
  - Mobile: 85% (global, branches, functions, lines, statements)
  - Server: 50% (all metrics)
- Different Jest presets:
  - Mobile: `"ts-jest"` (legacy)
  - Server: `"ts-jest/presets/default-esm"` (ESM)
- Different configuration styles:
  - Mobile: `jest.config.js`
  - Server: `jest.config.cjs`
- Inconsistent test environments
- Confusing for developers switching between packages

**Location:**
- File: `packages/mobile/jest.config.js`
- File: `packages/server/jest.config.cjs`

**Recommended Changes:**
1. Standardize coverage threshold to 80% for both packages
2. Use same Jest preset (ESM if server uses it)
3. Create shared Jest configuration in root
4. Use consistent file naming

**Steps to Fix:**
1. Create `jest.config.base.js` in root
2. Update both packages to extend base config
3. Set coverage threshold to 80%
4. Align presets and transformers
5. Update documentation

**Benefits:**
- Consistent testing standards
- Easier to maintain
- Clear expectations for all developers
- Reusable test utilities

---

## 🟢 Low Priority / Technical Debt

### 8. Deprecated Dependencies

**Status:** Open
**Priority:** Low
**Impact:** Long-term maintainability

**Deprecation Warnings:**
- `@types/react-native@0.73.0` - deprecated
- `@testing-library/jest-native@5.4.3` - deprecated
- `eslint@8.57.1` - version no longer supported

**Recommendation:**
- Upgrade to ESLint 9.x when ready (breaking changes)
- Monitor for React Native type updates
- Check for jest-native alternative or upgrade

---

### 9. Deprecated Jest Configuration Pattern

**Status:** Open
**Priority:** Low
**Impact:** Minor warning noise

**Problem:**
- ts-jest config under `globals` is deprecated
- Should move to transform configuration

**Location:**
- File: `packages/server/jest.config.cjs`

**Warning:**
```
ts-jest[ts-jest-transformer] (WARN) Define `ts-jest` config under `globals` is deprecated.
```

**Steps to Fix:**
Update jest.config.cjs to use new format:
```javascript
transform: {
  '^.+\\.tsx?$': ['ts-jest', { /* config here */ }]
}
```

---

### 10. Missing Configuration Documentation

**Status:** Open
**Priority:** Low
**Impact:** Developer onboarding

**Missing/Incomplete Documentation:**
- Environment variables (.env.example)
- API endpoint documentation
- Component prop documentation
- Testing strategy guide
- Contributing guidelines
- Deployment instructions

**Recommendation:**
- Create comprehensive README files
- Document all environment variables
- Add JSDoc comments to components
- Create CONTRIBUTING.md
- Add API documentation (Swagger/OpenAPI)

---

## 📊 Issue Statistics

| Category | Count | Total Effort |
|----------|-------|--------------|
| Critical | 2 | ~8 hours |
| High | 5 | ~13 hours |
| Low | 3 | ~2 hours |
| **TOTAL** | **10** | **~23 hours** |

---

## 🎯 Recommended Roadmap

### Week 1: Quick Wins
1. ✅ Fix security vulnerabilities (COMPLETED)
2. ✅ Clean up dependencies (COMPLETED)
3. Enable TypeScript strict mode in mobile
4. Add missing return type annotations
5. Fix deprecated Jest configuration

### Week 2: Testing
1. Refactor App.tsx into smaller components
2. Create comprehensive mobile test suite
3. Improve server test coverage to 80%+

### Week 3: Quality
1. Implement structured logging
2. Standardize Jest configuration
3. Add missing documentation

### Week 4: Polish
1. Upgrade deprecated dependencies
2. Add API documentation
3. Create contribution guidelines

---

## 📝 Notes

- All security vulnerabilities have been resolved as of 2025-10-23
- Dependencies have been cleaned up and standardized
- Project uses pnpm workspaces for monorepo management
- Server is production-ready from security perspective
- Mobile app needs significant testing and refactoring work

---

## 🔗 Related Documents

- `ARCHITECTURE.md` - System architecture overview
- `CI_CD_IMPLEMENTATION_PLAN.md` - CI/CD setup plan
- `package.json` - Dependency configuration
- `turbo.json` - Monorepo build configuration

---

**Last Reviewed:** 2025-10-23
**Next Review:** 2025-11-23

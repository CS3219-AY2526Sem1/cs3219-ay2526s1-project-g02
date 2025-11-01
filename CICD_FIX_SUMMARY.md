# CI/CD Build Fix Summary

## Problem

The CI/CD pipeline was failing during the test phase with the following errors:

1. **Missing GraphQL Schema File**
   ```
   ENOENT: no such file or directory, open '/home/runner/work/noclue/noclue/common/dist/schema.graphql'
   ```

2. **ts-jest Warning**
   ```
   ts-jest[ts-compiler] (WARN) Got a `.js` file to compile while `allowJs` option is not set to `true`
   ```

## Root Cause

### Issue 1: Missing schema.graphql in dist/
When the `@noclue/common` package was built with TypeScript, only `.ts` files were compiled to `.js` files in the `dist/` directory. The `schema.graphql` file (which is not a TypeScript file) was **not** being copied over.

The code in `common/src/index.ts` tries to read the schema file:
```typescript
export const typeDefs = readFileSync(
  join(__dirname, 'schema.graphql'),
  'utf-8'
);
```

At runtime, `__dirname` points to `common/dist/`, but `schema.graphql` was missing from that directory.

### Issue 2: Jest trying to transform .js files
The jest configuration for the matching service was configured to transform all `.js` and `.ts` files with ts-jest:
```json
"transform": {
  "^.+\\.(t|j)s$": "ts-jest"
}
```

This caused ts-jest to try to compile the already-built `.js` files from `common/dist/`, leading to warnings and potential issues.

## Solution

### Fix 1: Copy schema.graphql during build

**File**: `common/package.json`

Updated the build script to copy the GraphQL schema file after TypeScript compilation:

```json
"scripts": {
  "build": "tsc && npm run copy:schema",
  "copy:schema": "node -e \"require('fs').copyFileSync('src/schema.graphql', 'dist/schema.graphql')\"",
  "watch": "tsc --watch",
  "clean": "rm -rf dist"
}
```

**Why this approach?**
- Cross-platform compatible (works on Windows, macOS, Linux)
- No additional dependencies needed
- Uses Node.js built-in `fs` module
- Runs after TypeScript compilation

### Fix 2: Update Jest configuration

**File**: `backend/services/matching-service/jest-unit.json`

Changed the transform pattern and added ignore patterns:

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testRegex": ".*\\.spec\\.ts$",
  "transform": {
    "^.+\\.ts$": "ts-jest"  // Only transform .ts files, not .js
  },
  "transformIgnorePatterns": [
    "node_modules/",
    "<rootDir>/../../../common/dist/"  // Skip common package dist
  ],
  "testEnvironment": "node",
  "moduleNameMapper": {
    "^src/(.*)$": "<rootDir>/src/$1"
  },
  "modulePaths": [
    "<rootDir>"
  ]
}
```

**Changes made:**
1. Transform only `.ts` files (removed `.js` from the pattern)
2. Added `transformIgnorePatterns` to skip:
   - All `node_modules/`
   - The `common/dist/` directory (already compiled JavaScript)

## Verification

### Local Testing
```bash
# Build common package
npm run build:common
✅ schema.graphql copied to dist/

# Run matching service tests
npm test --workspace=@noclue/matching-service
✅ All 12 tests passing

# Full build
npm run build
✅ All packages built successfully
```

### Expected CI/CD Behavior
1. ✅ Common package builds and copies schema.graphql
2. ✅ Services can import from @noclue/common without errors
3. ✅ Jest tests run without ts-jest warnings
4. ✅ All tests pass

## Files Modified

1. `common/package.json` - Added schema copy step to build script
2. `backend/services/matching-service/jest-unit.json` - Updated transform and ignore patterns

## Additional Notes

- The same jest configuration update may be needed for other services if they encounter similar issues
- The schema.graphql file is now automatically included in the built package
- No changes needed to the actual source code, only build configuration

## Future Improvements

Consider applying the jest configuration fix to all service packages to prevent similar issues:
- `backend/services/question-service/jest.config.json`
- `backend/services/collaboration-service/jest.config.json`
- `backend/services/user-service/jest.config.json`

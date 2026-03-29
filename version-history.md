# Version History

This file tracks the automatic version increments for the Nexo mobile app.

## How Versioning Works

- **Current Version**: 1.0.01
- **Increment**: +0.0001 per build
- **Files Updated**: app.json, package.json, android/app/build.gradle

## Build History

| Version | Date | Build Type | Notes |
|---------|------|------------|-------|
| 1.0.01  | Current | - | Starting version |

## Commands

- `npm run increment-version` - Increment version only
- `npm run build:apk` - Increment version + build preview APK
- `npm run build:production` - Increment version + build production APK

## Manual Version Check

To see current versions in all files:
```bash
# Check app.json
grep '"version"' app.json

# Check package.json  
grep '"version"' package.json

# Check build.gradle
grep -E 'versionName|versionCode' android/app/build.gradle
```

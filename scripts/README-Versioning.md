# Automatic Versioning System

This system automatically increments your app version by 0.0001 each time you build, ensuring each APK has a higher version number for app store updates.

## How It Works

The script updates three files simultaneously:
- **app.json** - Expo version used by the build system
- **package.json** - NPM version for consistency
- **android/app/build.gradle** - Android `versionName` and `versionCode`

## Version Format

- **Starting**: 1.0.01
- **First increment**: 1.0011 (1.0.01 + 0.0001)
- **Second increment**: 1.0012 (1.0011 + 0.0001)
- **And so on...**

The `versionCode` (integer) also increments by 1 each time, which is required for Android app stores.

## Usage

### Option 1: Build with Auto-Increment (Recommended)
```bash
# Build preview APK with version increment
npm run build:apk

# Build production APK with version increment  
npm run build:production
```

### Option 2: Manual Version Increment
```bash
# Just increment version without building
npm run increment-version

# Then build manually
npx eas build --platform android --profile preview
```

## What Gets Updated

When you run the version increment:

**Before:**
- app.json: `"version": "1.0.01"`
- package.json: `"version": "1.0.0"`
- build.gradle: `versionCode 1` and `versionName "1.0.01"`

**After:**
- app.json: `"version": "1.0011"`
- package.json: `"version": "1.0011"`
- build.gradle: `versionCode 2` and `versionName "1.0011"`

## Build Commands

| Command | Description |
|---------|-------------|
| `npm run increment-version` | Only increment version numbers |
| `npm run build:apk` | Increment version + build preview APK |
| `npm run build:production` | Increment version + build production APK |

## Troubleshooting

### Check Current Versions
```bash
# PowerShell
Select-String '"version"' app.json, package.json
Select-String 'versionName|versionCode' android/app/build.gradle

# Or manually check files:
# - app.json line 5
# - package.json line 4  
# - android/app/build.gradle lines 94-95
```

### Reset Version (if needed)
If you need to reset to a specific version, manually edit all three files:
1. app.json - `"version": "your.version"`
2. package.json - `"version": "your.version"`
3. android/app/build.gradle - `versionCode X` and `versionName "your.version"`

## Benefits

✅ **Automatic**: No manual version management  
✅ **Consistent**: All files stay in sync  
✅ **Store Compatible**: `versionCode` increments for Android  
✅ **Simple**: Just run `npm run build:apk`  
✅ **Traceable**: Clear version progression (1.0.01 → 1.0011 → 1.0012...)

## Notes

- The script is safe to run multiple times
- Each build will have a unique version number
- App stores will recognize each build as an update
- Version history is tracked in `version-history.md`

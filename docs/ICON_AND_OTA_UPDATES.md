# App icon and OTA updates

## Can the icon be updated via OTA?

**No.** Over-the-air (OTA) updates only deliver a new **JavaScript bundle**. They do not change anything that is compiled into the native app binary, including:

- App icon (launcher icon)
- Splash screen (native)
- App display name
- Permissions / native code

So **changing the app icon always requires a new native build** (and users get the new icon when they install that build, e.g. from the store).

---

## How to update the app icon

1. **Replace the image files** (keep the same names and dimensions recommended below):

   | File                              | Purpose                            | Suggested size                                 |
   | --------------------------------- | ---------------------------------- | ---------------------------------------------- |
   | `assets/images/icon.png`          | Main icon (iOS, fallback)          | 1024×1024 px                                   |
   | `assets/images/adaptive-icon.png` | Android adaptive icon (foreground) | 1024×1024 px, important content in center ~66% |
   | `assets/images/favicon.png`       | Web favicon                        | 48×48 or 192×192                               |
   | `assets/images/splash-icon.png`   | Splash screen (optional)           | As needed                                      |

   Your config already points to these in `app.json`; no config change needed if you keep the same paths.

2. **Create a new native build** so the new icon is baked in:

   ```bash
   # Android (e.g. AAB for Play Store)
   npx eas build --platform android --profile production

   # Or local/preview
   npx eas build --platform android --profile preview
   ```

3. **Distribute the new build** (Play Store, internal testing, or direct install). Users who install this build will see the new icon. Existing users on an older build will keep the old icon until they install the new one.

---

## What OTA updates are for

Use **EAS Update** (OTA) for:

- Bug fixes and small changes in JavaScript/TypeScript
- New screens or features that don’t need new native code or assets
- Content or copy changes
- Config changes that are read at runtime from your JS bundle

OTA does **not** change:

- App icon
- Native splash screen
- App name in the system launcher
- Permissions or native modules

---

## Publishing an OTA update (EAS Update)

If you use EAS Update for JS-only changes:

1. Install and configure `expo-updates` and set `runtimeVersion` in `app.json` / `app.config.js` (see [Expo docs](https://docs.expo.dev/eas-update/introduction/)).

2. Publish an update:

   ```bash
   npx eas update --branch production --message "Bug fix or feature update"
   ```

3. Users who already have a build that checks for updates will receive the new bundle on next launch (or when you trigger a check). The **icon will not change** until they install a new native build that contains the new icon.

---

**Summary:** To get a new icon on users’ devices, replace the icon assets, create a new EAS (or local) build, and distribute that build. Use OTA only for JS/content updates; it cannot update the app icon.

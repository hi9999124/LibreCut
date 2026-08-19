# Android app (offline)

This packages LibreCut's editor as a standalone Android APK using
[Capacitor](https://capacitorjs.com/) — no live deployment or backend
required, unlike [`docs/android-apk.md`](android-apk.md)'s Trusted Web
Activity approach. Everything the app needs ships inside the APK.

## What works, what doesn't

The editor (`/projects`, `/editor/[id]`) is IndexedDB/WASM-based and runs
entirely on-device, so it works as-is. What doesn't work in this build,
because they need a live server this packaged app doesn't have:

- Accounts / sign-in
- Freesound search (the Sounds panel's search)
- Feedback submission, health checks
- The marketing site (blog, changelog, roadmap, etc.) — not included at all;
  the app opens straight to `/projects`
- AI video generation still works if the device has internet — it calls
  fal.ai directly with your own key, same as the web app (see the main
  README's "Generating AI video" section)

## How it's built

`scripts/build-android-offline.sh`:

1. Copies the repo (with `bun.lock`, so dependency versions stay pinned —
   see the comment at the top of the script) into a scratch directory.
2. In that copy, removes routes that need a live backend (`/api/*` and the
   marketing pages) and swaps in `apps/mobile-android/overrides/page.tsx`
   (redirects `/` straight to `/projects`) and `next.config.ts`
   (`output: "export"`).
3. Runs `bun run build`, producing a static `out/` directory.
4. Copies `out/` into `apps/mobile-android/android`'s committed native
   Capacitor project (`app/src/main/assets/public`).

The real `apps/web` source tree is never touched — the script works on a
throwaway copy. `apps/mobile-android/android` is a real, persistent Capacitor
Android project (Java/Gradle/manifest); only its bundled web assets get
regenerated per build.

## Building the APK

**Locally**, if you have the Android SDK set up:

```bash
bash scripts/build-android-offline.sh
cd apps/mobile-android/android
./gradlew assembleDebug
```

The APK lands at `apps/mobile-android/android/app/build/outputs/apk/debug/app-debug.apk`.

**Via CI** (no local Android SDK needed): go to **Actions → Build Android
APK (Offline app) → Run workflow**. It builds the same way and publishes the
APK as a draft GitHub Release and a workflow artifact.

This build is debug-signed (Android's default debug key), which is fine to
install and try but not for wider distribution — see
[`docs/android-apk.md`](android-apk.md#stable-updates-across-builds-optional)
for how to configure a persistent release-signing key if you want to take
this further.

## Installing

Android blocks installs from outside the Play Store by default. Enable
"Install unknown apps" for whatever app you use to open the downloaded
`.apk`, or run `adb install app-debug.apk` with a device connected over USB
debugging.

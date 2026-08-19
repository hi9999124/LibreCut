# Android APK (Trusted Web Activity)

LibreCut doesn't ship native Android code — the app is a Next.js web app.
`.github/workflows/build-android-apk.yml` wraps a **live deployment** of that
web app into an installable `.apk` using a
[Trusted Web Activity](https://developer.chrome.com/docs/android/trusted-web-activity/)
(TWA), via Google's [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap)
CLI. A TWA is a thin native shell around Chrome that renders your deployed
site full-screen — it is not an offline app, and it needs the deployment to
stay reachable to keep working.

This is scaffolding, not a battle-tested pipeline: it hasn't been run
end-to-end yet because that requires a live URL, which this repo doesn't have
by default. Expect to iterate on the first real run.

## Prerequisites

1. **Deploy LibreCut somewhere with a public HTTPS URL.** This repo is set
   up for Cloudflare via `wrangler.jsonc` (`bun run deploy:web`), but Vercel
   or any other host that can run the Next.js app works too.
2. Confirm `<your-url>/manifest.json` loads and its icons resolve — Bubblewrap
   reads the PWA manifest to fill in the app's identity.

## Building the APK

1. Go to **Actions → Build Android APK (TWA) → Run workflow**.
2. Enter the live `site_url` (e.g. `https://librecut.example.com`).
   Optionally override `package_id` (defaults to `app.librecut.twa`).
3. Once the run finishes, download the APK from the **workflow's artifacts**,
   or from the **draft GitHub Release** it creates (tagged
   `android-build-<run number>`).
4. Publish the draft release (or just share the artifact link) once you've
   verified the APK installs and loads correctly on a device.

### Installing on a device

Android blocks installs from outside the Play Store by default. Enable
"Install unknown apps" for the browser or file manager you use to open the
downloaded `.apk`, or run `adb install app-release-signed.apk` with a device
connected over USB debugging.

## Stable updates across builds (optional)

Every run without a configured signing key generates a **new, random** key,
so each APK is independently installable but Android won't treat one build as
an update to a previous one (you'd need to uninstall the old one first). To
get real update behavior:

1. Generate a keystore once and keep it somewhere safe:
   ```bash
   keytool -genkeypair -v -keystore librecut.keystore -alias librecut \
     -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Add these as **repository secrets**:
   - `ANDROID_KEYSTORE_BASE64` — `base64 -w0 librecut.keystore`
   - `ANDROID_KEYSTORE_PASSWORD`
   - `ANDROID_KEY_PASSWORD`
3. Re-run the workflow — it'll sign with your persistent key instead of
   generating a throwaway one.

## Files

- `android/twa-manifest.template.json` — Bubblewrap's TWA config, with
  `__SITE_URL__` / `__SITE_HOST__` placeholders the workflow fills in from
  your `site_url` input.
- `.github/workflows/build-android-apk.yml` — the build itself.

If a Bubblewrap flag or manifest field is outdated by the time you run this
(the CLI changes fairly often), check the
[Bubblewrap CLI docs](https://github.com/GoogleChromeLabs/bubblewrap/blob/main/packages/cli/README.md)
against `android/twa-manifest.template.json` and adjust.

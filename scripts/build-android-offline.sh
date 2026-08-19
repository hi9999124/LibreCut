#!/usr/bin/env bash
# Builds the offline Android app: a Capacitor shell around a trimmed, fully
# static export of the editor (no server/API routes, no marketing pages --
# those need a live backend this packaged app doesn't have). See
# docs/android-offline-app.md.
#
# This never touches the real apps/web source tree: it copies the whole repo
# into a scratch directory (keeping bun.lock so dependency versions stay
# pinned to what's actually committed -- installing without it would let a
# fresh `bun install` drift to newer, untested package versions), trims and
# reconfigures the apps/web copy there, builds it, and drops the static
# output into apps/mobile-android/android's (committed) native project.
# Run from the repo root.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$(mktemp -d)"
trap 'rm -rf "$BUILD_DIR"' EXIT

echo "==> Copying repo (for bun.lock + workspace context) into scratch build dir: $BUILD_DIR"
cp "$REPO_ROOT/package.json" "$REPO_ROOT/bun.lock" "$BUILD_DIR/"
mkdir -p "$BUILD_DIR/apps"
cp -r "$REPO_ROOT/apps/web" "$BUILD_DIR/apps/web"
# Other workspace members only need their package.json present so
# `bun install --frozen-lockfile` sees a consistent workspace -- their
# actual contents aren't needed to build apps/web.
mkdir -p "$BUILD_DIR/apps/mobile-android"
cp "$REPO_ROOT/apps/mobile-android/package.json" "$BUILD_DIR/apps/mobile-android/package.json"
cd "$BUILD_DIR/apps/web"
rm -rf node_modules out .next

echo "==> Trimming routes that need a live server/backend"
rm -rf src/app/api
rm -rf src/app/blog src/app/brand src/app/changelog src/app/contributors
rm -rf src/app/privacy src/app/roadmap src/app/sponsors src/app/terms
rm -f src/app/robots.ts src/app/sitemap.ts
rm -rf src/app/rss.xml

echo "==> Applying Android build overrides"
cp "$REPO_ROOT/apps/mobile-android/overrides/page.tsx" src/app/page.tsx
cp "$REPO_ROOT/apps/mobile-android/overrides/next.config.ts" next.config.ts

echo "==> Installing dependencies (pinned to the committed bun.lock)"
bun install --frozen-lockfile

echo "==> Building static export"
export DATABASE_URL="${DATABASE_URL:-postgresql://opencut:opencut@localhost:5432/opencut}"
export BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET:-offline-build-placeholder-secret}"
export NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-http://localhost:3000}"
export UPSTASH_REDIS_REST_URL="${UPSTASH_REDIS_REST_URL:-https://placeholder.example.com}"
export UPSTASH_REDIS_REST_TOKEN="${UPSTASH_REDIS_REST_TOKEN:-placeholder}"
export NEXT_PUBLIC_MARBLE_API_URL="${NEXT_PUBLIC_MARBLE_API_URL:-https://placeholder.example.com}"
export MARBLE_WORKSPACE_KEY="${MARBLE_WORKSPACE_KEY:-placeholder}"
export FREESOUND_CLIENT_ID="${FREESOUND_CLIENT_ID:-placeholder}"
export FREESOUND_API_KEY="${FREESOUND_API_KEY:-placeholder}"
bun run build

echo "==> Copying static output into apps/mobile-android"
rm -rf "$REPO_ROOT/apps/mobile-android/out"
cp -r out "$REPO_ROOT/apps/mobile-android/out"

echo "==> Installing Capacitor CLI"
cd "$REPO_ROOT/apps/mobile-android"
bun install --frozen-lockfile

echo "==> Syncing into the native Android project"
bunx cap sync android

echo "==> Done. Native project ready at apps/mobile-android/android"
echo "    Build the APK with:"
echo "    cd apps/mobile-android/android && ./gradlew assembleDebug"

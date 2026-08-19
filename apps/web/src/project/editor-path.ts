/**
 * Builds the URL to open a project in the editor. A plain path segment on
 * the normal (server-rendered) web app. The offline Android build swaps
 * this file for a version that targets the single static `/editor/_`
 * shell with the id as a query param instead -- see
 * apps/mobile-android/overrides/editor-path.ts and
 * docs/android-offline-app.md. Static export can only serve the one path it
 * pre-rendered, so a real per-project path segment would 404 there.
 */
export function buildEditorPath({ projectId }: { projectId: string }): string {
	return `/editor/${projectId}`;
}

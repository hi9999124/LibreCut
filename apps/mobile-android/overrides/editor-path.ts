/**
 * Offline-build override of @/project/editor-path.ts (see the comment
 * there). Static export only pre-renders /editor/_ (the one placeholder
 * param from generateStaticParams in app/editor/[project_id]/page.tsx), so
 * every project opens that same shell and passes its real id as a query
 * param instead of a path segment -- editor-client.tsx reads it back out.
 */
export function buildEditorPath({ projectId }: { projectId: string }): string {
	return `/editor/_?id=${encodeURIComponent(projectId)}`;
}

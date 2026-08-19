import { EditorClient } from "./editor-client";

/**
 * Project IDs are created client-side (IndexedDB), so there's nothing to
 * enumerate at build time. This placeholder exists so `output: "export"`
 * builds (e.g. the Android app shell) have a static HTML/JS shell for this
 * route shape; real navigation to a project happens via the client router,
 * which reads the actual id from the URL in `EditorClient`.
 */
export function generateStaticParams() {
	return [{ project_id: "_" }];
}

export default function Editor() {
	return <EditorClient />;
}

import { useMemo } from "react";
import { useEditor } from "@/editor/use-editor";
import { findTrackInSceneTracks, type TimelineElement } from "@/timeline";

/**
 * Subscribes to render tracks and returns the live (preview-aware) version of
 * an element alongside helpers for previewing and committing updates.
 *
 * Use this wherever property fields need to reflect in-progress preview state
 * (e.g. a slider being dragged) rather than the last committed value.
 */
export function useElementPreview<T extends TimelineElement>({
	trackId,
	elementId,
	fallback,
}: {
	trackId: string;
	elementId: string;
	fallback: T;
}) {
	const editor = useEditor();
	const previewTracks = useEditor((e) => e.timeline.getPreviewTracks());

	const renderElement = useMemo(() => {
		const tracks = previewTracks ?? editor.scenes.getActiveScene().tracks;
		return (
			(findTrackInSceneTracks({ tracks, trackId })?.elements.find(
				(element) => element.id === elementId,
			) as T | undefined) ?? fallback
		);
	}, [previewTracks, trackId, elementId, fallback, editor.scenes]);

	const previewUpdates = (updates: Partial<TimelineElement>) =>
		editor.timeline.previewElements({
			updates: [{ trackId, elementId, updates }],
		});

	const commit = () => editor.timeline.commitPreview();

	return { renderElement, previewUpdates, commit };
}

import type { AiVideoModel } from "./types";

export const CUSTOM_MODEL_ID = "custom";

/**
 * A small, honest starter list. fal.ai adds and renames video models
 * often (Seedance, Kling, Luma, Wan, ...), so rather than guess at every
 * slug we keep a couple of well-known ones and let people paste any
 * fal.ai model path via "Custom model" — see fal.ai/models for the
 * current catalog and exact input schema of each model.
 */
export const AI_VIDEO_MODELS: AiVideoModel[] = [
	{
		id: "fal-ai/bytedance/seedance/v1/pro/text-to-video",
		label: "Seedance 1.0 Pro — Text to Video",
		description:
			"ByteDance's Seedance model. Cinematic, high-motion clips from a text prompt.",
		mode: "text-to-video",
	},
	{
		id: "fal-ai/bytedance/seedance/v1/pro/image-to-video",
		label: "Seedance 1.0 Pro — Image to Video",
		description: "Animates a still image into a short video clip.",
		mode: "image-to-video",
	},
	{
		id: CUSTOM_MODEL_ID,
		label: "Custom model…",
		description:
			"Paste any fal.ai model path (e.g. a newer Seedance release) and, optionally, raw JSON input.",
		mode: "any",
		isCustom: true,
	},
];

export const DEFAULT_AI_VIDEO_MODEL_ID = AI_VIDEO_MODELS[0].id;

export const ASPECT_RATIO_OPTIONS = ["16:9", "9:16", "1:1"] as const;
export const DURATION_OPTIONS = [
	{ value: "5", label: "5s" },
	{ value: "10", label: "10s" },
] as const;
export const RESOLUTION_OPTIONS = ["480p", "720p", "1080p"] as const;

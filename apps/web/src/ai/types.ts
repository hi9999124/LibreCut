export type AiGenerationMode = "text-to-video" | "image-to-video";

export interface AiVideoModel {
	id: string;
	label: string;
	description: string;
	mode: AiGenerationMode | "any";
	isCustom?: boolean;
}

export interface GeneratedClip {
	id: string;
	prompt: string;
	modelLabel: string;
	mediaAssetId: string;
	thumbnailUrl?: string;
	createdAt: number;
}

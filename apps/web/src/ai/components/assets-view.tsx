"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import {
	Section,
	SectionContent,
	SectionField,
	SectionFields,
} from "@/components/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	AiVideoIcon,
	Cancel01Icon,
	ImageAdd02Icon,
	PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { useEditor } from "@/editor/use-editor";
import { useAiSettingsStore } from "@/ai/ai-settings-store";
import { useAssetsPanelStore } from "@/components/editor/panels/assets/assets-panel-store";
import {
	AI_VIDEO_MODELS,
	ASPECT_RATIO_OPTIONS,
	DEFAULT_AI_VIDEO_MODEL_ID,
	DURATION_OPTIONS,
	RESOLUTION_OPTIONS,
} from "@/ai/models";
import type { AiGenerationMode, GeneratedClip } from "@/ai/types";
import {
	cancelFalJob,
	extractVideoUrl,
	FalRequestError,
	getFalResult,
	pollFalJob,
	submitFalJob,
} from "@/ai/fal-client";
import { processMediaAssets } from "@/media/processing";
import { buildElementFromMedia } from "@/timeline/element-utils";
import { DEFAULT_NEW_ELEMENT_DURATION } from "@/timeline/creation";
import { mediaTimeFromSeconds } from "@/wasm";
import { cn } from "@/utils/ui";

const MAX_HISTORY = 12;

type GenerationState =
	| { status: "idle"; error: string | null }
	| { status: "generating"; step: string };

type GenerationAction =
	| { type: "start"; step: string }
	| { type: "update_step"; step: string }
	| { type: "succeed" }
	| { type: "fail"; error: string };

const IDLE_STATE: GenerationState = { status: "idle", error: null };

/* eslint-disable opencut/prefer-object-params -- React reducers must accept (state, action). */
function generationReducer(
	state: GenerationState,
	action: GenerationAction,
): GenerationState {
	switch (action.type) {
		case "start":
			return { status: "generating", step: action.step };
		case "update_step":
			if (state.status !== "generating") return state;
			return { status: "generating", step: action.step };
		case "succeed":
			return { status: "idle", error: null };
		case "fail":
			return { status: "idle", error: action.error };
	}
}
/* eslint-enable opencut/prefer-object-params */

function readFileAsDataUrl({ file }: { file: File }): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			if (typeof reader.result === "string") {
				resolve(reader.result);
			} else {
				reject(new Error("Could not read image file"));
			}
		};
		reader.onerror = () => reject(new Error("Could not read image file"));
		reader.readAsDataURL(file);
	});
}

function slugifyForFilename({ text }: { text: string }): string {
	const slug = text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 48);
	return slug || "ai-video";
}

export function AiGenerationView() {
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActive());
	const imageAssets = useEditor((e) =>
		e.media.getAssets().filter((asset) => asset.type === "image"),
	);
	const falApiKey = useAiSettingsStore((s) => s.falApiKey);
	const setActiveTab = useAssetsPanelStore((s) => s.setActiveTab);
	const requestRevealMedia = useAssetsPanelStore((s) => s.requestRevealMedia);

	const [mode, setMode] = useState<AiGenerationMode>("text-to-video");
	const [modelId, setModelId] = useState(DEFAULT_AI_VIDEO_MODEL_ID);
	const [customModelId, setCustomModelId] = useState("");
	const [prompt, setPrompt] = useState("");
	const [aspectRatio, setAspectRatio] = useState<string>(
		ASPECT_RATIO_OPTIONS[0],
	);
	const [duration, setDuration] = useState<string>(DURATION_OPTIONS[0].value);
	const [resolution, setResolution] = useState<string>(
		RESOLUTION_OPTIONS[1],
	);
	const [advancedInput, setAdvancedInput] = useState("");
	const [sourceImageAssetId, setSourceImageAssetId] = useState<string | null>(
		null,
	);
	const [uploadedImage, setUploadedImage] = useState<File | null>(null);
	const [history, setHistory] = useState<GeneratedClip[]>([]);

	const [state, dispatch] = useReducer(generationReducer, IDLE_STATE);
	const abortRef = useRef<AbortController | null>(null);
	const cancelUrlRef = useRef<string | null>(null);
	const imageInputRef = useRef<HTMLInputElement>(null);

	const isGenerating = state.status === "generating";
	const hasApiKey = falApiKey.trim().length > 0;

	const selectedModel = useMemo(
		() => AI_VIDEO_MODELS.find((model) => model.id === modelId),
		[modelId],
	);
	const isCustomModel = selectedModel?.isCustom ?? false;
	const effectiveModelId = isCustomModel ? customModelId.trim() : modelId;

	const uploadedImageUrl = useMemo(
		() => (uploadedImage ? URL.createObjectURL(uploadedImage) : null),
		[uploadedImage],
	);
	useEffect(() => {
		return () => {
			if (uploadedImageUrl) URL.revokeObjectURL(uploadedImageUrl);
		};
	}, [uploadedImageUrl]);

	const previewImageUrl =
		uploadedImageUrl ??
		imageAssets.find((asset) => asset.id === sourceImageAssetId)
			?.thumbnailUrl ??
		null;

	const handleModelChange = (value: string) => {
		setModelId(value);
		const nextModel = AI_VIDEO_MODELS.find((model) => model.id === value);
		if (nextModel && nextModel.mode !== "any") {
			setMode(nextModel.mode);
		}
	};

	const handleImageFile = ({ file }: { file: File }) => {
		setUploadedImage(file);
		setSourceImageAssetId(null);
	};

	const buildInput = async (): Promise<Record<string, unknown>> => {
		const input: Record<string, unknown> = { prompt: prompt.trim() };

		if (mode === "image-to-video") {
			if (uploadedImage) {
				input.image_url = await readFileAsDataUrl({ file: uploadedImage });
			} else if (sourceImageAssetId) {
				const asset = imageAssets.find((a) => a.id === sourceImageAssetId);
				if (asset) {
					input.image_url = await readFileAsDataUrl({ file: asset.file });
				}
			}
		}

		if (!isCustomModel) {
			input.aspect_ratio = aspectRatio;
			input.duration = duration;
			input.resolution = resolution;
		}

		if (isCustomModel && advancedInput.trim()) {
			try {
				const parsed = JSON.parse(advancedInput);
				if (parsed && typeof parsed === "object") {
					Object.assign(input, parsed);
				}
			} catch {
				throw new Error("Advanced input isn't valid JSON");
			}
		}

		return input;
	};

	const handleCancel = () => {
		abortRef.current?.abort();
		if (cancelUrlRef.current) {
			void cancelFalJob({ cancelUrl: cancelUrlRef.current, apiKey: falApiKey });
		}
	};

	const handleGenerate = async () => {
		if (!hasApiKey) {
			toast.error("Add your fal.ai API key first", {
				description: "Settings → AI",
				action: {
					label: "Open settings",
					onClick: () => setActiveTab("settings"),
				},
			});
			return;
		}

		if (!prompt.trim()) {
			dispatch({ type: "fail", error: "Write a prompt first" });
			return;
		}

		if (!effectiveModelId) {
			dispatch({ type: "fail", error: "Choose or paste a model ID" });
			return;
		}

		if (
			mode === "image-to-video" &&
			!uploadedImage &&
			!sourceImageAssetId
		) {
			dispatch({
				type: "fail",
				error: "Pick a source image for image-to-video",
			});
			return;
		}

		if (!activeProject) {
			dispatch({ type: "fail", error: "No active project" });
			return;
		}

		const controller = new AbortController();
		abortRef.current = controller;

		dispatch({ type: "start", step: "Preparing request..." });

		try {
			const input = await buildInput();

			dispatch({ type: "update_step", step: "Submitting to fal.ai..." });
			const job = await submitFalJob({
				modelId: effectiveModelId,
				apiKey: falApiKey,
				input,
				signal: controller.signal,
			});
			cancelUrlRef.current = job.cancel_url;

			await pollFalJob({
				statusUrl: job.status_url,
				apiKey: falApiKey,
				signal: controller.signal,
				onProgress: (status) => {
					if (status.status === "IN_QUEUE") {
						dispatch({
							type: "update_step",
							step:
								status.queue_position != null
									? `Queued (position ${status.queue_position})...`
									: "Queued...",
						});
					} else {
						const lastLog = status.logs?.[status.logs.length - 1]?.message;
						dispatch({
							type: "update_step",
							step: lastLog ? lastLog : "Generating...",
						});
					}
				},
			});

			dispatch({ type: "update_step", step: "Fetching result..." });
			const result = await getFalResult({
				responseUrl: job.response_url,
				apiKey: falApiKey,
				signal: controller.signal,
			});

			const videoUrl = extractVideoUrl({ result });
			if (!videoUrl) {
				throw new Error("fal.ai didn't return a video for this model");
			}

			dispatch({ type: "update_step", step: "Downloading clip..." });
			const videoResponse = await fetch(videoUrl, { signal: controller.signal });
			if (!videoResponse.ok) {
				throw new Error("Could not download the generated clip");
			}
			const videoBlob = await videoResponse.blob();
			const videoFile = new File(
				[videoBlob],
				`${slugifyForFilename({ text: prompt })}.mp4`,
				{ type: videoBlob.type || "video/mp4" },
			);

			dispatch({ type: "update_step", step: "Importing into project..." });
			const [processedAsset] = await processMediaAssets({
				files: [videoFile],
			});
			if (!processedAsset) {
				throw new Error("Could not import the generated clip");
			}

			const savedAsset = await editor.media.addMediaAsset({
				projectId: activeProject.metadata.id,
				asset: processedAsset,
			});
			if (!savedAsset) {
				throw new Error("Could not save the generated clip");
			}

			setHistory((previous) =>
				[
					{
						id: savedAsset.id,
						prompt: prompt.trim(),
						modelLabel: selectedModel?.label ?? effectiveModelId,
						mediaAssetId: savedAsset.id,
						thumbnailUrl: savedAsset.thumbnailUrl,
						createdAt: Date.now(),
					},
					...previous,
				].slice(0, MAX_HISTORY),
			);

			toast.success("Video generated", {
				description: "Added to your media library",
			});
			dispatch({ type: "succeed" });
		} catch (error) {
			if (error instanceof DOMException && error.name === "AbortError") {
				dispatch({ type: "fail", error: "Cancelled" });
				return;
			}

			const message =
				error instanceof FalRequestError
					? error.message
					: error instanceof Error
						? error.message
						: "Generation failed";

			console.error("AI video generation failed:", error);
			dispatch({ type: "fail", error: message });
		} finally {
			if (abortRef.current === controller) {
				abortRef.current = null;
			}
			cancelUrlRef.current = null;
		}
	};

	const handleAddToTimeline = ({ clip }: { clip: GeneratedClip }) => {
		const asset = editor.media
			.getAssets()
			.find((a) => a.id === clip.mediaAssetId);
		if (!asset) {
			toast.error("This clip is no longer in your media library");
			return;
		}

		const elementDuration =
			asset.duration != null
				? mediaTimeFromSeconds({ seconds: asset.duration })
				: DEFAULT_NEW_ELEMENT_DURATION;
		const element = buildElementFromMedia({
			mediaId: asset.id,
			mediaType: asset.type,
			name: asset.name,
			duration: elementDuration,
			startTime: editor.playback.getCurrentTime(),
		});
		editor.timeline.insertElement({ element, placement: { mode: "auto" } });
		toast.success("Added to timeline");
	};

	return (
		<PanelView
			title="AI video"
			contentClassName="px-0 flex flex-col h-full"
		>
			<Section showTopBorder={false} showBottomBorder={false} className="flex-1">
				<SectionContent className="flex flex-col gap-4 pt-1">
					{!hasApiKey && (
						<div className="border-border bg-accent/50 flex items-start gap-2 rounded-md border p-3">
							<HugeiconsIcon
								icon={AiVideoIcon}
								className="text-muted-foreground mt-0.5 size-4 shrink-0"
							/>
							<div className="flex flex-col gap-1.5">
								<p className="text-sm">
									Generate video with your own fal.ai key — it never touches
									LibreCut&apos;s servers.
								</p>
								<Button
									size="sm"
									variant="outline"
									className="w-fit"
									onClick={() => setActiveTab("settings")}
								>
									Add API key
								</Button>
							</div>
						</div>
					)}

					<Tabs
						value={mode}
						onValueChange={(value) => {
							if (value === "text-to-video" || value === "image-to-video") {
								setMode(value);
							}
						}}
					>
						<TabsList className="w-full">
							<TabsTrigger className="flex-1" value="text-to-video">
								Text to video
							</TabsTrigger>
							<TabsTrigger className="flex-1" value="image-to-video">
								Image to video
							</TabsTrigger>
						</TabsList>
					</Tabs>

					<SectionFields>
						<SectionField label="Model">
							<Select value={modelId} onValueChange={handleModelChange}>
								<SelectTrigger>
									<SelectValue placeholder="Select a model" />
								</SelectTrigger>
								<SelectContent>
									{AI_VIDEO_MODELS.filter(
										(model) => model.mode === "any" || model.mode === mode,
									).map((model) => (
										<SelectItem key={model.id} value={model.id}>
											{model.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{selectedModel && (
								<p className="text-muted-foreground text-xs">
									{selectedModel.description}
								</p>
							)}
						</SectionField>

						{isCustomModel && (
							<SectionField label="Model ID">
								<Input
									placeholder="fal-ai/bytedance/seedance/v1/pro/text-to-video"
									value={customModelId}
									onChange={(event) => setCustomModelId(event.target.value)}
									spellCheck={false}
								/>
							</SectionField>
						)}

						{mode === "image-to-video" && (
							<SectionField label="Source image">
								<div className="flex flex-wrap gap-2">
									{imageAssets.slice(0, 8).map((asset) => (
										<button
											key={asset.id}
											type="button"
											onClick={() => {
												setSourceImageAssetId(asset.id);
												setUploadedImage(null);
											}}
											className={cn(
												"border-foreground/15 hover:border-primary size-14 shrink-0 overflow-hidden rounded-sm border bg-cover bg-center",
												sourceImageAssetId === asset.id &&
													!uploadedImage &&
													"border-primary border-2",
											)}
											style={{
												backgroundImage: asset.thumbnailUrl
													? `url(${asset.thumbnailUrl})`
													: undefined,
											}}
											aria-label={`Use ${asset.name} as source image`}
										/>
									))}
									<button
										type="button"
										onClick={() => imageInputRef.current?.click()}
										className={cn(
											"border-foreground/15 hover:border-primary text-muted-foreground flex size-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-sm border border-dashed",
											uploadedImage && "border-primary border-2",
										)}
										aria-label="Upload a source image"
									>
										<HugeiconsIcon icon={ImageAdd02Icon} className="size-4" />
									</button>
									<input
										ref={imageInputRef}
										type="file"
										accept="image/*"
										className="hidden"
										onChange={(event) => {
											const file = event.target.files?.[0];
											if (file) handleImageFile({ file });
											if (event.target) event.target.value = "";
										}}
									/>
								</div>
							</SectionField>
						)}

						<SectionField label="Prompt">
							<Textarea
								placeholder="A drone shot flying over a neon-lit city at night..."
								value={prompt}
								onChange={(event) => setPrompt(event.target.value)}
								className="min-h-20"
							/>
						</SectionField>

						{!isCustomModel && (
							<div className="grid grid-cols-3 gap-2">
								<SectionField label="Aspect">
									<Select value={aspectRatio} onValueChange={setAspectRatio}>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{ASPECT_RATIO_OPTIONS.map((ratio) => (
												<SelectItem key={ratio} value={ratio}>
													{ratio}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</SectionField>
								<SectionField label="Duration">
									<Select value={duration} onValueChange={setDuration}>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{DURATION_OPTIONS.map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</SectionField>
								<SectionField label="Quality">
									<Select value={resolution} onValueChange={setResolution}>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{RESOLUTION_OPTIONS.map((option) => (
												<SelectItem key={option} value={option}>
													{option}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</SectionField>
							</div>
						)}

						{isCustomModel && (
							<SectionField label="Advanced input (JSON, optional)">
								<Textarea
									placeholder={`{ "aspect_ratio": "16:9" }`}
									value={advancedInput}
									onChange={(event) => setAdvancedInput(event.target.value)}
									className="min-h-16 font-mono text-xs"
								/>
							</SectionField>
						)}
					</SectionFields>

					{previewImageUrl && mode === "image-to-video" && (
						<div className="border-border relative aspect-video w-24 overflow-hidden rounded-sm border">
							<Image
								src={previewImageUrl}
								alt="Source"
								fill
								sizes="100vw"
								className="object-cover"
								unoptimized
							/>
						</div>
					)}

					<div className="flex items-center gap-2">
						<Button
							type="button"
							className="flex-1"
							onClick={handleGenerate}
							disabled={isGenerating}
						>
							{isGenerating && <Spinner className="mr-1" />}
							{isGenerating ? state.step : "Generate video"}
						</Button>
						{isGenerating && (
							<Button
								type="button"
								variant="outline"
								size="icon"
								onClick={handleCancel}
								aria-label="Cancel generation"
							>
								<HugeiconsIcon icon={Cancel01Icon} className="size-4" />
							</Button>
						)}
					</div>

					{state.status === "idle" && state.error && (
						<div className="bg-destructive/10 border-destructive/20 rounded-md border p-3">
							<p className="text-destructive text-sm">{state.error}</p>
						</div>
					)}

					{history.length > 0 && (
						<div className="flex flex-col gap-2 border-t pt-3">
							<span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
								Recent generations
							</span>
							<div className="flex flex-col gap-2">
								{history.map((clip) => (
									<div
										key={clip.id}
										className="border-border flex items-center gap-2 rounded-md border p-2"
									>
										<div className="bg-muted relative size-12 shrink-0 overflow-hidden rounded-sm">
											{clip.thumbnailUrl && (
												<Image
													src={clip.thumbnailUrl}
													alt=""
													fill
													sizes="100vw"
													className="object-cover"
													unoptimized
												/>
											)}
										</div>
										<div className="min-w-0 flex-1">
											<p className="truncate text-sm">{clip.prompt}</p>
											<p className="text-muted-foreground truncate text-xs">
												{clip.modelLabel}
											</p>
										</div>
										<Button
											size="sm"
											variant="ghost"
											onClick={() => {
												requestRevealMedia(clip.mediaAssetId);
											}}
											aria-label="Reveal in media"
										>
											Media
										</Button>
										<Button
											size="icon"
											variant="outline"
											onClick={() => handleAddToTimeline({ clip })}
											aria-label="Add to timeline"
										>
											<HugeiconsIcon icon={PlusSignIcon} className="size-4" />
										</Button>
									</div>
								))}
							</div>
						</div>
					)}

					{history.length === 0 && !isGenerating && (
						<div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center text-sm">
							<HugeiconsIcon icon={AiVideoIcon} className="size-6 opacity-50" />
							<span>Generated clips will show up here</span>
						</div>
					)}
				</SectionContent>
			</Section>
		</PanelView>
	);
}

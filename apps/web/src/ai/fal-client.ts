const FAL_QUEUE_BASE = "https://queue.fal.run";
const FAL_STATUS_POLL_INTERVAL_MS = 2000;

export class FalRequestError extends Error {
	status?: number;

	constructor({ message, status }: { message: string; status?: number }) {
		super(message);
		this.name = "FalRequestError";
		this.status = status;
	}
}

interface FalQueueSubmitResponse {
	request_id: string;
	status_url: string;
	response_url: string;
	cancel_url: string;
}

export interface FalQueueStatus {
	status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED";
	queue_position?: number;
	logs?: { message: string }[];
}

function falHeaders({ apiKey }: { apiKey: string }): HeadersInit {
	return {
		Authorization: `Key ${apiKey}`,
		"Content-Type": "application/json",
	};
}

async function parseFalErrorMessage({
	response,
}: {
	response: Response;
}): Promise<string> {
	try {
		const body = await response.json();
		if (typeof body?.detail === "string") return body.detail;
		if (Array.isArray(body?.detail)) {
			return body.detail
				.map((entry: { msg?: string }) => entry.msg)
				.filter(Boolean)
				.join(", ");
		}
		return response.status === 401 || response.status === 403
			? "That API key was rejected by fal.ai. Double-check it in Settings."
			: JSON.stringify(body);
	} catch {
		return response.statusText || `Request failed with status ${response.status}`;
	}
}

/** Submits a generation job to fal.ai's async queue. `modelId` is the fal endpoint path, e.g. "fal-ai/bytedance/seedance/v1/pro/text-to-video". */
export async function submitFalJob({
	modelId,
	apiKey,
	input,
	signal,
}: {
	modelId: string;
	apiKey: string;
	input: Record<string, unknown>;
	signal?: AbortSignal;
}): Promise<FalQueueSubmitResponse> {
	const response = await fetch(`${FAL_QUEUE_BASE}/${modelId}`, {
		method: "POST",
		headers: falHeaders({ apiKey }),
		body: JSON.stringify(input),
		signal,
	});

	if (!response.ok) {
		throw new FalRequestError({
			message: await parseFalErrorMessage({ response }),
			status: response.status,
		});
	}

	return response.json();
}

function waitOrAbort({
	delayMs,
	signal,
}: {
	delayMs: number;
	signal?: AbortSignal;
}): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) {
			reject(new DOMException("Aborted", "AbortError"));
			return;
		}

		const timer = setTimeout(resolve, delayMs);
		signal?.addEventListener(
			"abort",
			() => {
				clearTimeout(timer);
				reject(new DOMException("Aborted", "AbortError"));
			},
			{ once: true },
		);
	});
}

/** Polls a queue job until it completes, invoking `onProgress` on every status check. */
export async function pollFalJob({
	statusUrl,
	apiKey,
	signal,
	onProgress,
}: {
	statusUrl: string;
	apiKey: string;
	signal?: AbortSignal;
	onProgress?: (status: FalQueueStatus) => void;
}): Promise<void> {
	for (;;) {
		const response = await fetch(`${statusUrl}?logs=1`, {
			headers: falHeaders({ apiKey }),
			signal,
		});

		if (!response.ok) {
			throw new FalRequestError({
				message: await parseFalErrorMessage({ response }),
				status: response.status,
			});
		}

		const status: FalQueueStatus = await response.json();
		onProgress?.(status);

		if (status.status === "COMPLETED") return;

		await waitOrAbort({ delayMs: FAL_STATUS_POLL_INTERVAL_MS, signal });
	}
}

/** Fetches the final output of a completed queue job. */
export async function getFalResult({
	responseUrl,
	apiKey,
	signal,
}: {
	responseUrl: string;
	apiKey: string;
	signal?: AbortSignal;
}): Promise<Record<string, unknown>> {
	const response = await fetch(responseUrl, {
		headers: falHeaders({ apiKey }),
		signal,
	});

	if (!response.ok) {
		throw new FalRequestError({
			message: await parseFalErrorMessage({ response }),
			status: response.status,
		});
	}

	return response.json();
}

/** Best-effort cancellation; the poll loop aborting locally is what actually stops the UI from waiting. */
export async function cancelFalJob({
	cancelUrl,
	apiKey,
}: {
	cancelUrl: string;
	apiKey: string;
}): Promise<void> {
	try {
		await fetch(cancelUrl, { method: "PUT", headers: falHeaders({ apiKey }) });
	} catch {
		// Best-effort: the client already stopped waiting on this job.
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function readStringUrl(value: unknown): string | null {
	if (isRecord(value) && typeof value.url === "string") {
		return value.url;
	}
	return null;
}

/** Video-generation endpoints return the clip under different keys depending on the model; this covers the common shapes. */
export function extractVideoUrl({
	result,
}: {
	result: Record<string, unknown>;
}): string | null {
	const fromVideo = readStringUrl(result.video);
	if (fromVideo) return fromVideo;

	const videos = result.videos;
	if (Array.isArray(videos)) {
		const fromVideos = readStringUrl(videos[0]);
		if (fromVideos) return fromVideos;
	}

	for (const value of Object.values(result)) {
		const fromValue = readStringUrl(value);
		if (fromValue) return fromValue;
	}

	return null;
}

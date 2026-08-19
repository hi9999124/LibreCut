import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AiSettingsState {
	falApiKey: string;
	setFalApiKey: ({ apiKey }: { apiKey: string }) => void;
	clearFalApiKey: () => void;
}

/**
 * BYOK: the key lives only in this browser's localStorage and is sent
 * directly from the browser to fal.ai when generating — LibreCut's own
 * servers never see it.
 */
export const useAiSettingsStore = create<AiSettingsState>()(
	persist(
		(set) => ({
			falApiKey: "",
			setFalApiKey: ({ apiKey }) => set({ falApiKey: apiKey.trim() }),
			clearFalApiKey: () => set({ falApiKey: "" }),
		}),
		{
			name: "librecut-ai-settings",
			version: 1,
		},
	),
);

export function hasFalApiKey(): boolean {
	return useAiSettingsStore.getState().falApiKey.trim().length > 0;
}

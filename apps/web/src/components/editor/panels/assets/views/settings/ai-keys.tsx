"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
	Section,
	SectionContent,
	SectionField,
	SectionFields,
	SectionHeader,
	SectionTitle,
} from "@/components/section";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAiSettingsStore } from "@/ai/ai-settings-store";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	CheckmarkCircle02Icon,
	Key01Icon,
	LinkSquare02Icon,
} from "@hugeicons/core-free-icons";

export function AiKeysSettings() {
	const { falApiKey, setFalApiKey, clearFalApiKey } = useAiSettingsStore();
	const [draftKey, setDraftKey] = useState(falApiKey);
	const [showKey, setShowKey] = useState(false);

	const hasSavedKey = falApiKey.trim().length > 0;
	const isDirty = draftKey.trim() !== falApiKey.trim();

	const handleSave = () => {
		setFalApiKey({ apiKey: draftKey });
		toast.success("fal.ai API key saved to this browser");
	};

	const handleClear = () => {
		clearFalApiKey();
		setDraftKey("");
		toast.success("fal.ai API key removed");
	};

	return (
		<div className="flex flex-col">
			<Section showTopBorder={false}>
				<SectionHeader>
					<SectionTitle className="flex items-center gap-2">
						<HugeiconsIcon icon={Key01Icon} className="size-4" />
						fal.ai API key
					</SectionTitle>
					{hasSavedKey && (
						<span className="text-constructive flex items-center gap-1 text-xs">
							<HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-3.5" />
							Connected
						</span>
					)}
				</SectionHeader>
				<SectionContent className="flex flex-col gap-3">
					<p className="text-muted-foreground text-sm">
						Bring your own key to generate AI video clips (Seedance and other
						fal.ai models) right from the AI panel. It&apos;s stored only in
						this browser and sent directly to fal.ai — LibreCut&apos;s servers
						never see it, and generation cost is billed to your own fal.ai
						account.
					</p>
					<SectionFields>
						<SectionField label="API key">
							<Input
								type="password"
								placeholder="fal-ai key, e.g. 1234abcd-...:5678efgh..."
								value={draftKey}
								showPassword={showKey}
								onShowPasswordChange={setShowKey}
								onChange={(event) => setDraftKey(event.target.value)}
								autoComplete="off"
								spellCheck={false}
							/>
						</SectionField>
					</SectionFields>
					<div className="flex items-center gap-2">
						<Button
							size="sm"
							onClick={handleSave}
							disabled={!isDirty || draftKey.trim().length === 0}
						>
							Save key
						</Button>
						{hasSavedKey && (
							<Button size="sm" variant="outline" onClick={handleClear}>
								Remove key
							</Button>
						)}
						<Button size="sm" variant="ghost" className="ml-auto" asChild>
							<a
								href="https://fal.ai/dashboard/keys"
								target="_blank"
								rel="noreferrer noopener"
								className="flex items-center gap-1"
							>
								Get a key
								<HugeiconsIcon icon={LinkSquare02Icon} className="size-3.5" />
							</a>
						</Button>
					</div>
				</SectionContent>
			</Section>
		</div>
	);
}

"use client";

import { Button } from "../ui/button";
import { ArrowRight } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AiVideoIcon, SparklesIcon } from "@hugeicons/core-free-icons";
import Image from "next/image";
import { Handlebars } from "./handlebars";
import Link from "next/link";

export function Hero() {
	return (
		<div className="relative flex min-h-[calc(100svh-4.5rem)] flex-col items-center justify-between overflow-hidden px-4 text-center">
			<Image
				className="absolute top-0 left-0 -z-50 size-full object-cover opacity-85 invert dark:invert-0"
				src="/landing-page-dark.png"
				height={1903.5}
				width={1269}
				alt="LibreCut video editor landing page background"
			/>
			<div
				aria-hidden
				className="bg-primary/25 pointer-events-none absolute top-1/4 -left-32 -z-40 size-[28rem] rounded-full blur-[110px]"
			/>
			<div
				aria-hidden
				className="bg-secondary-foreground/20 pointer-events-none absolute top-1/3 -right-32 -z-40 size-[26rem] rounded-full blur-[110px]"
			/>
			<div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center">
				<div className="border-foreground/10 bg-background/40 text-muted-foreground mx-auto mb-6 flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-md">
					<HugeiconsIcon icon={SparklesIcon} className="text-primary size-3.5" />
					Every feature free, forever — bring your own AI key
				</div>

				<div className="inline-block text-4xl font-bold tracking-tighter md:text-[4rem]">
					<h1>The open source</h1>
					<Handlebars>Video editor</Handlebars>
				</div>

				<p className="text-muted-foreground mx-auto mt-10 max-w-xl text-base font-light tracking-wide sm:text-xl">
					A simple but powerful video editor that gets the job done. Works on
					any platform — no paywalls, no watermarks, nothing locked behind a
					subscription.
				</p>

				<div className="mt-8 flex flex-wrap items-center justify-center gap-4">
					<Link href="/projects">
						<Button
							type="submit"
							size="lg"
							className="h-11 text-base shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_8px_30px_-8px_var(--primary)]"
						>
							Try early beta
							<ArrowRight className="ml-0.5" />
						</Button>
					</Link>
					<Link href="/projects">
						<Button
							type="button"
							size="lg"
							variant="outline"
							className="bg-background/40 h-11 text-base backdrop-blur-md"
						>
							<HugeiconsIcon icon={AiVideoIcon} className="size-4" />
							Generate AI video
						</Button>
					</Link>
				</div>
			</div>
		</div>
	);
}

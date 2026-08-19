import type { MutableRefObject } from "react";
import { ACTIONS, type TAction } from "./definitions";

export type { TAction };

export type TActionArgsMap = {
	"seek-forward": { seconds: number } | undefined;
	"seek-backward": { seconds: number } | undefined;
	"jump-forward": { seconds: number } | undefined;
	"jump-backward": { seconds: number } | undefined;
	"remove-media-asset": { projectId: string; assetId: string };
	"remove-media-assets": { projectId: string; assetIds: string[] };
};

type TKeysWithValueUndefined<T> = {
	[K in keyof T]: undefined extends T[K] ? K : never;
}[keyof T];

export type TActionWithArgs = keyof TActionArgsMap;

export type TActionWithOptionalArgs =
	| TActionWithNoArgs
	| TKeysWithValueUndefined<TActionArgsMap>;

export type TActionWithNoArgs = Exclude<TAction, TActionWithArgs>;

export type TArgOfAction<A extends TAction> = A extends TActionWithArgs
	? TActionArgsMap[A]
	: undefined;

export type TActionFunc<A extends TAction> = A extends TActionWithArgs
	? (arg: TArgOfAction<A>, trigger?: TInvocationTrigger) => void
	: (_?: undefined, trigger?: TInvocationTrigger) => void;

export type TInvocationTrigger = "keypress" | "mouseclick";

export type TBoundActionList = {
	[A in TAction]?: Array<TActionFunc<A>>;
};

export type TActionHandlerOptions =
	| MutableRefObject<boolean>
	| boolean
	| undefined;

const ACTION_SET: ReadonlySet<string> = new Set(Object.keys(ACTIONS));

/**
 * Actions whose `TActionArgsMap` entry requires args (no `| undefined`).
 * Keep this in sync with `TActionArgsMap` above -- it can't be derived at
 * runtime since the `| undefined` distinction is erased with the types.
 */
const ACTIONS_REQUIRING_ARGS: ReadonlySet<TAction> = new Set([
	"remove-media-asset",
	"remove-media-assets",
] satisfies TActionWithArgs[]);

export function isAction(value: unknown): value is TAction {
	return typeof value === "string" && ACTION_SET.has(value);
}

export function isActionWithOptionalArgs(
	value: unknown,
): value is TActionWithOptionalArgs {
	return isAction(value) && !ACTIONS_REQUIRING_ARGS.has(value);
}

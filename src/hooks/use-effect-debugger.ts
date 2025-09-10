import { useEffect, useRef } from "react";

// Generic type for previous value hook
const usePrevious = <T>(value: T, initialValue: T): T => {
	const ref = useRef<T>(initialValue);
	useEffect(() => {
		ref.current = value;
	});
	return ref.current;
};

type EffectHook = () => void;
type Dependency = unknown;

export const useEffectDebugger = (
	effectHook: EffectHook,
	dependencies: Dependency[],
	dependencyNames: (string | number)[] = [],
) => {
	const previousDeps = usePrevious<Dependency[]>(dependencies, []);

	const changedDeps = dependencies.reduce<
		Record<string | number, { before: Dependency; after: Dependency }>
	>((accum, dependency, index) => {
		if (dependency !== previousDeps[index]) {
			const keyName = dependencyNames[index] ?? index;
			return {
				// biome-ignore lint/performance/noAccumulatingSpread: no other way to do this
				...accum,
				[keyName]: {
					before: previousDeps[index],
					after: dependency,
				},
			};
		}
		return accum;
	}, {});

	if (Object.keys(changedDeps).length) {
		console.log("[use-effect-debugger] ", changedDeps);
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: no other way to do this
	useEffect(effectHook, dependencies);
};

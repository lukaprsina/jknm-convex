export type Prettify<T> = {
	[K in keyof T]: T[K];
} & {};

export function exhaustive_check(x: never): never {
	throw new Error(`Unexpected value: ${x}`);
}

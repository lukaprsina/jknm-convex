type _Prettify<T> = {
	[K in keyof T]: T[K];
} & {};

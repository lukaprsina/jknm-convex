// Browser-safe path.extname and path.basename
export function extname_b(filePath: string): string {
	const base = filePath.split(/[\\/]/).pop() || "";
	const idx = base.lastIndexOf(".");
	return idx > 0 ? base.slice(idx) : "";
}

export function basename_b(filePath: string): string {
	return filePath.split(/[\\/]/).pop() || "";
}

export function join_b(...segments: string[]): string {
	// Filter out empty segments, join with '/', and normalize redundant slashes
	return segments
		.filter(Boolean)
		.join("/")
		.replace(/\/{2,}/g, "/");
}

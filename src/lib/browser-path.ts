// Browser-safe path.extname and path.basename
export function extname(filePath: string): string {
	const base = filePath.split(/[\\/]/).pop() || "";
	const idx = base.lastIndexOf(".");
	return idx > 0 ? base.slice(idx) : "";
}

export function basename(filePath: string): string {
	return filePath.split(/[\\/]/).pop() || "";
}

export function join(...segments: string[]): string {
	// Filter out empty segments, join with '/', and normalize redundant slashes
	return segments
		.filter(Boolean)
		.join("/")
		.replace(/\/{2,}/g, "/");
}

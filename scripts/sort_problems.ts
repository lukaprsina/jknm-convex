import { promises as fs } from "node:fs";

async function main() {
	// resolve directory of this file in ESM-friendly way
	// const __filename = fileURLToPath(import.meta.url);
	// const repo_root = path.resolve(path.dirname(__filename));
	// const input_path = path.join(repo_root, "converter/problems.json");
	// const output_path = path.join(repo_root, "converter/problems_sorted.json");
	const input_path = "converter/problems.json";
	const output_path = "converter/problems_sorted.json";

	try {
		const raw = await fs.readFile(input_path, "utf8");
		const data = JSON.parse(raw);

		if (!Array.isArray(data)) {
			console.error(`Expected an array in ${input_path}`);
			process.exitCode = 2;
			return;
		}

		// biome-ignore lint/suspicious/noExplicitAny: just sorting JSON data
		const sorted = data.slice().sort((a: any, b: any) => {
			const a_val = normalizeLegacyId(a?.legacy_id);
			const b_val = normalizeLegacyId(b?.legacy_id);

			if (a_val === b_val) return 0;
			// handle NaN by sending it to the end
			if (Number.isNaN(a_val)) return 1;
			if (Number.isNaN(b_val)) return -1;
			return a_val < b_val ? -1 : 1;
		});

		await fs.writeFile(
			output_path,
			`${JSON.stringify(sorted, null, 2)}\n`,
			"utf8",
		);
		console.log(`Wrote sorted file to ${output_path} (${sorted.length} items)`);
	} catch (err) {
		const error_message =
			err instanceof Error ? err.message : JSON.stringify(err);
		console.error("Error:", error_message);
		process.exitCode = 1;
	}
}

// biome-ignore lint/suspicious/noExplicitAny: just sorting JSON data
function normalizeLegacyId(val: any): number {
	if (val === null || val === undefined) return Number.NaN;
	if (typeof val === "number") return val;
	// try numeric string
	const n = Number(val);
	return Number.isFinite(n) ? n : Number.NaN;
}

// Run when executed directly. Avoid CommonJS `require.main` to be compatible with ESM runtimes.
main();

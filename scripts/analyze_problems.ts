import { promises as fs } from "node:fs";
import type { ProblemEntry } from "~/lib/converter/converter-db";

async function main() {
	const input_path = "converter/problems_sorted.json";

	const raw = await fs.readFile(input_path, "utf8");
	const data = JSON.parse(raw) as ProblemEntry[];

	// from legacy_id to count of occurrences
	const legacy_id_map = new Map<number, number>();
	for (const entry of data) {
		if (!entry.legacy_id)
			throw new Error(`Entry missing legacy_id: ${JSON.stringify(entry)}`);
		const count = legacy_id_map.get(entry.legacy_id) ?? 0;
		legacy_id_map.set(entry.legacy_id, count + 1);
	}

	console.log("Legacy ID counts:");
	const sorted_legacy_ids = Array.from(legacy_id_map.entries()).sort(
		(a, b) => a[0] - b[0],
	);
	for (const [legacy_id, count] of sorted_legacy_ids) {
		console.log(`  ${legacy_id}: ${count}`);
	}

	console.log(`Total unique legacy IDs: ${legacy_id_map.size}`);
	console.log(`Total problem entries: ${data.length}`);
}

main();

/* 
Legacy ID counts:
  270: 28 - draft
  271: 12 - draft
  302: 32
  304: 28
  310: 28
  351: 44
  387: 48
  447: 88
  493: 104
  495: 2 - caption deserialized to multiple nodes
  539: 52
  555: 52
  591: 64
  615: 120
  619: 4 - caption deserialized to multiple nodes
  635: 68
  637: 52
  643: 40
  652: 52
Total unique legacy IDs: 19
Total problem entries: 918
*/

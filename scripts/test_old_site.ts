// Simple Bun script: fetch a range of pages once per second and collect ids
const startId = 657;
const endId = 684;

async function main() {
	const badIds: number[] = [];
	for (let id = startId; id <= endId; id++) {
		const url = `https://www.jknm.si/si/?id=${id}`;
		try {
			// Bun provides a global fetch. If running in another environment that
			// doesn't have fetch, this will throw and the catch will record the id.
			const res = await fetch(url, { method: "GET" });
			if (res.status !== 200) {
				badIds.push(id);
				console.log(`${id}: status ${res.status}`);
			} else {
				console.log(`${id}: OK`);
			}
		} catch (e) {
			console.log(`${id}: fetch error - ${e}`);
			badIds.push(id);
		}

		// wait 1 second between requests
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}

	console.log("Done. Non-200 ids:", badIds);
}

// Run main when the script is executed directly
if (import.meta.main) {
	main().catch((e) => {
		console.error("Script failed:", e);
		process.exit(1);
	});
}

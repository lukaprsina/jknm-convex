import { createWriteStream } from "node:fs";
import { access, mkdir, stat } from "node:fs/promises";
import { dirname, extname } from "node:path";
import { pipeline } from "node:stream/promises";
import {
	GetObjectCommand,
	HeadObjectCommand,
	ListObjectsV2Command,
	S3Client,
} from "@aws-sdk/client-s3";
import mime from "mime-types";

// Load environment variables
const AWS_REGION = process.env.AWS_REGION;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

if (!AWS_REGION || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
	console.error(
		"Missing required environment variables: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY",
	);
	process.exit(1);
}

const s3 = new S3Client({
	region: AWS_REGION,
	endpoint: `https://s3.${AWS_REGION}.backblazeb2.com`,
	credentials: {
		accessKeyId: AWS_ACCESS_KEY_ID,
		secretAccessKey: AWS_SECRET_ACCESS_KEY,
	},
});

async function shouldDownload(
	bucketName: string,
	key: string,
	outPath: string,
): Promise<boolean> {
	try {
		await access(outPath);
		// File exists locally, check if we should re-download
		const localStats = await stat(outPath);

		// Get remote file info
		const head = await s3.send(
			new HeadObjectCommand({ Bucket: bucketName, Key: key }),
		);

		// Compare sizes - if different, re-download
		if (localStats.size !== (head.ContentLength || 0)) {
			console.log(`Size mismatch for ${key}, will re-download`);
			return true;
		}

		// File exists and size matches, skip download
		return false;
	} catch (_error) {
		// File doesn't exist locally, should download
		return true;
	}
}

async function downloadBucket(bucketName: string, localDir: string) {
	const MAX_CONCURRENT_DOWNLOADS = 30; // Limit concurrent downloads
	const allObjects: string[] = [];
	let continuationToken: string | undefined;

	// First, collect all object keys
	console.log("Collecting file list...");
	do {
		const list = await s3.send(
			new ListObjectsV2Command({
				Bucket: bucketName,
				ContinuationToken: continuationToken,
			}),
		);
		const objs = list.Contents ?? [];
		for (const obj of objs) {
			if (obj.Key) {
				allObjects.push(obj.Key);
			}
		}
		continuationToken = list.IsTruncated
			? list.NextContinuationToken
			: undefined;
	} while (continuationToken);

	console.log(`Found ${allObjects.length} files to process`);

	// Filter out already downloaded files, with progress reporting
	const filesToDownload: string[] = [];
	let checkedCount = 0;
	for (const key of allObjects) {
		const outPath = `${localDir}/${key}`;
		if (await shouldDownload(bucketName, key, outPath)) {
			filesToDownload.push(key);
		}
		checkedCount++;
		if (checkedCount % 500 === 0) {
			console.log(`Checked ${checkedCount}/${allObjects.length} files...`);
		}
	}
	if (checkedCount % 500 !== 0) {
		console.log(`Checked ${checkedCount}/${allObjects.length} files...`);
	}
	console.log(
		`${filesToDownload.length} files need to be downloaded (${allObjects.length - filesToDownload.length} already exist)`,
	);

	if (filesToDownload.length === 0) {
		console.log("All files are already downloaded!");
		return;
	}

	// Download files with concurrency control
	const errors: string[] = [];
	let completedCount = 0;

	for (let i = 0; i < filesToDownload.length; i += MAX_CONCURRENT_DOWNLOADS) {
		const batch = filesToDownload.slice(i, i + MAX_CONCURRENT_DOWNLOADS);
		const batchPromises = batch.map((key) => {
			const outPath = `${localDir}/${key}`;
			return downloadObject(bucketName, key, outPath);
		});

		const batchResults = await Promise.allSettled(batchPromises);

		batchResults.forEach((result, batchIndex) => {
			const key = batch[batchIndex];
			if (result.status === "fulfilled") {
				completedCount++;
				if (completedCount % 500 === 0) {
					console.log(
						`Downloaded ${completedCount}/${filesToDownload.length} files...`,
					);
				}
			} else {
				errors.push(`${key}: ${result.reason}`);
			}
		});

		console.log(
			`Progress: ${completedCount}/${filesToDownload.length} completed, ${errors.length} errors`,
		);
	}
	if (completedCount % 500 !== 0) {
		console.log(
			`Downloaded ${completedCount}/${filesToDownload.length} files...`,
		);
	}

	console.log(
		`\nDownload completed: ${completedCount} successful, ${errors.length} failed`,
	);

	if (errors.length > 0) {
		console.error("\nErrors encountered:");
		errors.forEach((error) => {
			console.error(error);
		});
	}
}

async function downloadObject(bucket: string, key: string, outPath: string) {
	try {
		// Create directory if it doesn't exist
		const dir = dirname(outPath);
		await mkdir(dir, { recursive: true });

		// check metadata
		const head = await s3.send(
			new HeadObjectCommand({ Bucket: bucket, Key: key }),
		);
		let contentType = head.ContentType;
		if (!contentType) {
			const ext = extname(key);
			contentType = mime.lookup(ext) || "application/octet-stream";
			console.warn(`no content-type for ${key}, guessing ${contentType}`);
		}
		const get = await s3.send(
			new GetObjectCommand({ Bucket: bucket, Key: key }),
		);
		const body = get.Body;
		if (!body || typeof body === "string")
			throw new Error("unexpected body type");
		await pipeline(body as NodeJS.ReadableStream, createWriteStream(outPath));
		console.log(`wrote ${outPath} (content-type: ${contentType})`);
	} catch (error) {
		throw new Error(
			`Failed to download ${key}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

// bun run .\scripts\sync_from_b2_to_fs.ts jknm-novice "C:\Users\luka\Desktop\jknm-b2\jknm-novice"
(async () => {
	const bucket = process.argv[2];
	const outdir = process.argv[3];
	if (!bucket || !outdir) {
		console.error("use: node script.js <bucket> <localDir>");
		process.exit(1);
	}
	await downloadBucket(bucket, outdir);
})();

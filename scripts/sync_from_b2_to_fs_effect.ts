import { dirname, extname } from "node:path";
import {
	GetObjectCommand,
	HeadObjectCommand,
	ListObjectsV2Command,
	S3Client,
} from "@aws-sdk/client-s3";
import { FileSystem } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { Config, Console, Effect, Array as EffectArray, pipe } from "effect";
import mime from "mime-types";

// Define our error types
class MissingEnvironmentVariableError extends Error {
	readonly _tag = "MissingEnvironmentVariableError";
	constructor(variable: string) {
		super(`Missing required environment variable: ${variable}`);
	}
}

class DownloadError extends Error {
	readonly _tag = "DownloadError";
	constructor(key: string, cause: unknown) {
		super(
			`Failed to download ${key}: ${cause instanceof Error ? cause.message : String(cause)}`,
		);
	}
}

class InvalidArgumentsError extends Error {
	readonly _tag = "InvalidArgumentsError";
	constructor() {
		super("Usage: script.ts <bucket> <localDir>");
	}
}

// Configuration interface
interface SyncConfig {
	bucket: string;
	localDir: string;
	maxConcurrentDownloads: number;
	progressReportInterval: number;
}

// S3 object info
interface S3ObjectInfo {
	key: string;
	size: number;
}

// Create S3 client effect
const createS3Client = Effect.gen(function* () {
	const awsRegion = yield* Config.string("AWS_REGION");
	const awsAccessKeyId = yield* Config.string("AWS_ACCESS_KEY_ID");
	const awsSecretAccessKey = yield* Config.string("AWS_SECRET_ACCESS_KEY");

	return new S3Client({
		region: awsRegion,
		endpoint: `https://s3.${awsRegion}.backblazeb2.com`,
		credentials: {
			accessKeyId: awsAccessKeyId,
			secretAccessKey: awsSecretAccessKey,
		},
	});
});

// Get all objects from S3 bucket
const getAllObjects = (s3Client: S3Client, bucketName: string) =>
	Effect.gen(function* () {
		yield* Console.log("Collecting file list...");

		const allObjects: S3ObjectInfo[] = [];
		let continuationToken: string | undefined;

		while (true) {
			const listCommand = new ListObjectsV2Command({
				Bucket: bucketName,
				ContinuationToken: continuationToken,
			});

			const response = yield* Effect.tryPromise({
				try: () => s3Client.send(listCommand),
				catch: (error: unknown) =>
					new Error(`Failed to list objects: ${error}`),
			});

			const contents = response.Contents ?? [];
			for (const obj of contents) {
				if (obj.Key && obj.Size !== undefined) {
					allObjects.push({ key: obj.Key, size: obj.Size });
				}
			}

			if (!response.IsTruncated) break;
			continuationToken = response.NextContinuationToken;
		}

		yield* Console.log(`Found ${allObjects.length} files to process`);
		return allObjects;
	});

// Check if file should be downloaded
const shouldDownload = (
	bucketName: string,
	s3Client: S3Client,
	objectInfo: S3ObjectInfo,
	outPath: string,
) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;

		const fileExists = yield* fs.exists(outPath);
		if (!fileExists) {
			return true;
		}

		// File exists locally, check if we should re-download
		const localStats = yield* fs.stat(outPath);

		// Get remote file info
		const headCommand = new HeadObjectCommand({
			Bucket: bucketName,
			Key: objectInfo.key,
		});
		const remoteInfo = yield* Effect.tryPromise({
			try: () => s3Client.send(headCommand),
			catch: (error: unknown) =>
				new Error(`Failed to get remote file info: ${error}`),
		});

		// Compare sizes - if different, re-download
		const remoteSize = remoteInfo.ContentLength || 0;
		if (Number(localStats.size) !== remoteSize) {
			yield* Console.log(
				`Size mismatch for ${objectInfo.key}, will re-download`,
			);
			return true;
		}

		return false;
	});

// Download a single object
const downloadObject = (
	s3Client: S3Client,
	bucketName: string,
	objectInfo: S3ObjectInfo,
	outPath: string,
) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;

		// Create directory if it doesn't exist
		const dir = dirname(outPath);
		yield* fs.makeDirectory(dir, { recursive: true });

		// Get metadata first
		const headCommand = new HeadObjectCommand({
			Bucket: bucketName,
			Key: objectInfo.key,
		});
		const headResponse = yield* Effect.tryPromise({
			try: () => s3Client.send(headCommand),
			catch: (error: unknown) => new DownloadError(objectInfo.key, error),
		});

		let contentType = headResponse.ContentType;
		if (!contentType) {
			const ext = extname(objectInfo.key);
			contentType = mime.lookup(ext) || "application/octet-stream";
			yield* Console.log(
				`No content-type for ${objectInfo.key}, guessing ${contentType}`,
			);
		}

		// Download the file
		const getCommand = new GetObjectCommand({
			Bucket: bucketName,
			Key: objectInfo.key,
		});
		const response = yield* Effect.tryPromise({
			try: () => s3Client.send(getCommand),
			catch: (error: unknown) => new DownloadError(objectInfo.key, error),
		});

		const body = response.Body;
		if (!body || typeof body === "string") {
			return yield* Effect.fail(
				new DownloadError(objectInfo.key, "Unexpected body type"),
			);
		}

		// Convert stream to buffer and write to file
		const content = yield* Effect.tryPromise({
			try: async () => {
				const readable = body as NodeJS.ReadableStream;
				const chunks: Buffer[] = [];
				for await (const chunk of readable) {
					chunks.push(chunk as Buffer);
				}
				return Buffer.concat(chunks);
			},
			catch: (error: unknown) => new DownloadError(objectInfo.key, error),
		});

		// Use FileSystem to write the file
		yield* fs.writeFile(outPath, content);

		yield* Console.log(`Wrote ${outPath} (content-type: ${contentType})`);
	});

// Filter objects that need to be downloaded
const filterObjectsToDownload = (
	s3Client: S3Client,
	config: SyncConfig,
	allObjects: S3ObjectInfo[],
) =>
	Effect.gen(function* () {
		const filesToDownload: S3ObjectInfo[] = [];
		let checkedCount = 0;

		for (const obj of allObjects) {
			const outPath = `${config.localDir}/${obj.key}`;
			const needsDownload = yield* shouldDownload(
				config.bucket,
				s3Client,
				obj,
				outPath,
			);

			if (needsDownload) {
				filesToDownload.push(obj);
			}

			checkedCount++;
			if (checkedCount % config.progressReportInterval === 0) {
				yield* Console.log(
					`Checked ${checkedCount}/${allObjects.length} files...`,
				);
			}
		}

		if (checkedCount % config.progressReportInterval !== 0) {
			yield* Console.log(
				`Checked ${checkedCount}/${allObjects.length} files...`,
			);
		}

		yield* Console.log(
			`${filesToDownload.length} files need to be downloaded (${allObjects.length - filesToDownload.length} already exist)`,
		);

		return filesToDownload;
	});

// Download files with concurrency control
const downloadFiles = (
	s3Client: S3Client,
	config: SyncConfig,
	filesToDownload: S3ObjectInfo[],
) =>
	Effect.gen(function* () {
		if (filesToDownload.length === 0) {
			yield* Console.log("All files are already downloaded!");
			return { successful: 0, failed: 0, errors: [] };
		}

		const errors: string[] = [];
		let completedCount = 0;

		// Process files in batches with concurrency control
		const batches = EffectArray.chunksOf(
			filesToDownload,
			config.maxConcurrentDownloads,
		);

		for (const batch of batches) {
			const batchEffects = batch.map((obj: S3ObjectInfo) => {
				const outPath = `${config.localDir}/${obj.key}`;
				return downloadObject(s3Client, config.bucket, obj, outPath).pipe(
					Effect.as(obj.key),
					Effect.catchAll((error: unknown) => {
						const errorMsg = `${obj.key}: ${error instanceof Error ? error.message : String(error)}`;
						errors.push(errorMsg);
						return Effect.succeed(null);
					}),
				);
			});

			const batchResults = yield* Effect.all(batchEffects, {
				concurrency: "unbounded",
			});

			// Count successful downloads
			for (const result of batchResults) {
				if (result !== null) {
					completedCount++;
					if (completedCount % config.progressReportInterval === 0) {
						yield* Console.log(
							`Downloaded ${completedCount}/${filesToDownload.length} files...`,
						);
					}
				}
			}

			yield* Console.log(
				`Progress: ${completedCount}/${filesToDownload.length} completed, ${errors.length} errors`,
			);
		}

		if (completedCount % config.progressReportInterval !== 0) {
			yield* Console.log(
				`Downloaded ${completedCount}/${filesToDownload.length} files...`,
			);
		}

		return { successful: completedCount, failed: errors.length, errors };
	});

// Main sync function
const syncBucket = (config: SyncConfig) =>
	Effect.gen(function* () {
		const s3Client = yield* createS3Client;

		// Get all objects from S3
		const allObjects = yield* getAllObjects(s3Client, config.bucket);

		// Filter objects that need to be downloaded
		const filesToDownload = yield* filterObjectsToDownload(
			s3Client,
			config,
			allObjects,
		);

		// Download files
		const result = yield* downloadFiles(s3Client, config, filesToDownload);

		yield* Console.log(
			`\nDownload completed: ${result.successful} successful, ${result.failed} failed`,
		);

		if (result.errors.length > 0) {
			yield* Console.log("\nErrors encountered:");
			for (const error of result.errors) {
				yield* Console.log(error);
			}
		}

		return result;
	});

// Parse command line arguments
const parseArguments = (args: string[]) =>
	Effect.gen(function* () {
		const bucket = args[2];
		const localDir = args[3];

		if (!bucket || !localDir) {
			return yield* Effect.fail(new InvalidArgumentsError());
		}

		return {
			bucket,
			localDir,
			maxConcurrentDownloads: 30,
			progressReportInterval: 500,
		};
	});

// Main program
const program = Effect.gen(function* () {
	const config = yield* parseArguments(process.argv);
	const result = yield* syncBucket(config);
	return result;
});

// Enhanced error handling
const handleErrors = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
	pipe(
		effect,
		Effect.catchAll((error: unknown) =>
			Effect.gen(function* () {
				if (error instanceof MissingEnvironmentVariableError) {
					yield* Console.error(`Environment Error: ${error.message}`);
				} else if (error instanceof InvalidArgumentsError) {
					yield* Console.error(`Usage Error: ${error.message}`);
				} else {
					yield* Console.error(`Unexpected Error: ${error}`);
				}
				yield* Effect.fail(error);
			}),
		),
	);

// Run the program
const main = pipe(program, handleErrors, Effect.provide(NodeContext.layer));

// Execute with proper error handling
Effect.runPromise(main).then(
	(result: unknown) => {
		if (result && typeof result === "object" && "successful" in result) {
			const typedResult = result as {
				successful: number;
				failed: number;
				errors: string[];
			};
			console.log(
				`Sync completed successfully: ${typedResult.successful} files downloaded`,
			);
		} else {
			console.log("Sync completed successfully");
		}
		process.exit(0);
	},
	(error: unknown) => {
		console.error("Sync failed:", error);
		process.exit(1);
	},
);

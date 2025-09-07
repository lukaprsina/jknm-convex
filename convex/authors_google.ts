"use node";

import { admin_directory_v1, auth } from "@googleapis/admin";
import type { JWTInput } from "google-auth-library";
import { internalAction } from "./_generated/server";

export const get_users = internalAction({
	args: {},
	handler: async (_ctx) => {
		const creds_json = Buffer.from(
			process.env.JKNM_SERVICE_ACCOUNT_CREDENTIALS!,
			"base64",
		).toString();

		const creds = JSON.parse(creds_json) as JWTInput;

		const client = new auth.GoogleAuth({
			credentials: creds,
			scopes: ["https://www.googleapis.com/auth/admin.directory.user.readonly"],
		});

		const admin = new admin_directory_v1.Admin({
			auth: client,
		});

		const res = await admin.users.list({
			customer: process.env.JKNM_WORKSPACE_ID,
			maxResults: 100,
			orderBy: "email",
		});

		// console.log("Fetched users:", res.data.users);

		if (!res.ok) {
			throw new Error(`Failed to fetch users: ${res.statusText}`);
		}

		if (!res.data.users || res.data.users.length === 0) {
			console.log("No users found.");
			return;
		}

		// Define the type for authors
		type Author = {
			name: string;
			email: string;
			google_id: string;
		};

		let suspended_count = 0;
		let invalid_count = 0;
		const authors = (res.data.users ?? []).reduce((acc: Author[], u) => {
			if (
				typeof u.primaryEmail !== "string" ||
				typeof u.name?.fullName !== "string" ||
				typeof u.id !== "string"
			) {
				invalid_count++;
				return acc; // guard: skip invalid user
			}

			if (u.suspended) {
				suspended_count++;
				return acc; // guard: skip suspended users
			}

			acc.push({
				name: u.name.fullName,
				email: u.primaryEmail,
				google_id: u.id,
			});
			return acc;
		}, []);

		console.log(`Fetched ${authors.length} authors from Google Workspace.`, {
			suspended_count,
			invalid_count,
		});

		// await ctx.runMutation(internal.authors.diff_google_authors, { authors });
	},
});

"use node";

import { admin_directory_v1, auth } from "@googleapis/admin";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

export const get_users = internalAction({
	args: {},
	handler: async (ctx) => {
		const creds_json = Buffer.from(
			process.env.JKNM_SERVICE_ACCOUNT_CREDENTIALS!,
			"base64",
		).toString();

		const creds = JSON.parse(creds_json);

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

		const authors = res.data.users
			.filter(
				(
					u,
				): u is {
					name: { fullName: string };
					primaryEmail: string;
					id: string;
				} =>
					typeof u.primaryEmail === "string" &&
					typeof u.name?.fullName === "string" &&
					typeof u.id === "string",
			)
			.map((u) => ({
				name: u.name.fullName,
				email: u.primaryEmail,
				google_id: u.id,
			}));

		await ctx.runMutation(internal.authors.diff_google_authors, { authors });
	},
});

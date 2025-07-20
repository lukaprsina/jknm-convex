import {
	type AuthFunctions,
	BetterAuth,
	type PublicAuthFunctions,
} from "@convex-dev/better-auth";
import { api, components, internal } from "./_generated/api";
import type { DataModel, Id } from "./_generated/dataModel";
import { type MutationCtx, type QueryCtx, query } from "./_generated/server";

const authFunctions: AuthFunctions = internal.auth;
const publicAuthFunctions: PublicAuthFunctions = api.auth;

export const betterAuthComponent = new BetterAuth(components.betterAuth, {
	authFunctions,
	publicAuthFunctions,
	// verbose: true,
});

export const {
	createUser,
	deleteUser,
	updateUser,
	createSession,
	isAuthenticated,
} = betterAuthComponent.createAuthFunctions<DataModel>({
	onCreateUser: async (ctx, user) => {
		const existing_author = await ctx.db
			.query("authors")
			.withIndex("by_email", (q) => q.eq("email", user.email))
			.first();

		if (!existing_author) {
			throw new Error(
				`No author found for email ${user.email}. Please create an author first.`,
			);
		}

		// We'll use onUpdateUser to keep it synced.
		const user_id = await ctx.db.insert("users", {
			email: user.email,
			author_id: existing_author._id,
		});

		// Patch the user with the new user_id
		await ctx.db.patch(existing_author._id, {
			user_id,
		});

		// This function must return the user id.
		return user_id;
	},
	onDeleteUser: async (ctx, user_id) => {
		// Delete the user's data if the user is being deleted
		/* const todos = await ctx.db
			.query('todos')
			.withIndex('userId', (q) => q.eq('userId', userId as Id<'users'>))
			.collect()
			await asyncMap(todos, async (todo) => {
			await ctx.db.delete(todo._id)
		}) */
		// Unlink the user from the author, but keep the author record
		const author = await ctx.db
			.query("authors")
			.filter((q) => q.eq("user_id", user_id))
			.first();

		if (!author) {
			throw new Error(`Author not found for user ID ${user_id}`);
		}

		await ctx.db.patch(author._id, {
			user_id: undefined,
		});

		ctx.db.delete(user_id as Id<"users">);
	},
	// shouldn't happen
	/* onUpdateUser: async (ctx, user) => {
		// Keep the user's email synced
		const user_id = user.userId as Id<"users">;
		await ctx.db.patch(user_id, {
			email: user.email,
		});
	}, */
});

export type BetterAuthUser = {
	createdAt: number;
	updatedAt: number;
	image: string | null;
	name: string | null;
	userId: Id<"users">;
	emailVerified: boolean;
};

export async function get_user(ctx: QueryCtx | MutationCtx) {
	// Get user data from Better Auth - email, name, image, etc.
	const user_metadata = (await betterAuthComponent.getAuthUser(
		ctx,
	)) as BetterAuthUser | null;

	if (!user_metadata) {
		console.warn("No user metadata found in Better Auth.");
		return null;
	}

	// Get user data from your application's database (skip this if you have no
	// fields in your users table schema)
	const user = await ctx.db.get(user_metadata.userId as Id<"users">);

	if (!user) {
		console.warn(
			`User with ID ${user_metadata.userId} not found in the database.`,
		);
		return null;
	}

	return {
		...user,
		...user_metadata,
	};
}

// Example function for getting the current user
// Feel free to edit, omit, etc.
export const getCurrentUser = query({
	args: {},
	handler: get_user,
});

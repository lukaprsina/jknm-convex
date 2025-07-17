import type { Id, TableNames } from "@convex/_generated/dataModel";
import type { SystemTableNames } from "convex/server";

export function without_system_fields<
	T extends TableNames | SystemTableNames,
	U extends { _creationTime: number; _id: Id<T> },
>(doc: U) {
	const { _id, _creationTime, ...rest } = doc;
	return rest;
}

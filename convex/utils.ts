import type { Id, TableNames } from "@convex/_generated/dataModel";

export function without_system_fields<
	T extends { _creationTime: number; _id: Id<TableNames> },
>(doc: T) {
	const { _id, _creationTime, ...rest } = doc;
	return rest;
}

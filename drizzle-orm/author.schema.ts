import { relations } from "drizzle-orm";
import {
	integer,
	pgEnum,
	pgTable,
	primaryKey,
	serial,
	text,
	varchar,
} from "drizzle-orm/pg-core";
import { Article } from "./article.schema";

export const author_type_enum = pgEnum("author_type", ["member", "guest"]);

// guests have name only
export const Author = pgTable("author", {
	id: serial().primaryKey(),
	author_type: author_type_enum().notNull(),
	name: varchar({ length: 255 }).notNull(),
	google_id: varchar({ length: 255 }),
	email: text(),
	image: varchar({ length: 255 }),
});

export const ArticlesToAuthors = pgTable(
	"p_articles_to_authors",
	{
		published_id: integer().notNull(),
		author_id: integer().notNull(),
		order: integer().default(0).notNull(),
	},
	(articles_to_authors) => [
		primaryKey({
			columns: [
				articles_to_authors.published_id,
				articles_to_authors.author_id,
			],
		}),
	],
);

export const ArticlesToAuthorsRelations = relations(
	ArticlesToAuthors,
	({ one }) => ({
		article: one(Article, {
			fields: [ArticlesToAuthors.published_id],
			references: [Article.id],
		}),
		author: one(Author, {
			fields: [ArticlesToAuthors.author_id],
			references: [Author.id],
		}),
	}),
);

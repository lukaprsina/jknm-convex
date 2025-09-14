export interface Article {
	// id: number;
	old_id: number;
	title: string;
	url: string;
	created_at: Date;
	updated_at: Date;
	content: Content;
	content_preview: string;
	thumbnail_crop: ThumbnailCrop | null;
	published_articles_to_authors: PublishedArticlesToAuthor[];
}

export interface Content {
	time: number;
	blocks: Block[];
	version: string;
}

export interface Block {
	id: string;
	type: BlockType;
	data: Data;
}

export interface Data {
	text?: string;
	level?: number;
	caption?: string;
	withBorder?: boolean;
	withBackground?: boolean;
	stretched?: boolean;
	file?: DataFile;
	style?: "unordered";
	items?: string[];
	service?: "youtube";
	source?: string;
	embed?: string;
	width?: number;
	height?: number;
}

export interface DataFile {
	url: string;
	width: number;
	height: number;
}

export type BlockType = "embed" | "header" | "image" | "list" | "paragraph";

export interface PublishedArticlesToAuthor {
	published_id: number;
	author_id: number;
	order: number;
	author: Author;
}

export interface Author {
	id: number;
	author_type: "guest" | "member";
	name: string;
	google_id: null | string;
	email: null | string;
	image: null | string;
}

export interface ThumbnailCrop {
	image_url: string;
	uploaded_custom_thumbnail?: boolean;
	unit: "%";
	x: number;
	y: number;
	width: number;
	height: number;
}

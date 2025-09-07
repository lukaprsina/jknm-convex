export interface Article {
	id: number;
	old_id: number | null;
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
	version: Version;
}

export interface Block {
	id: string;
	type: Type;
	data: Data;
}

export interface Data {
	text?: string;
	level?: number;
	caption?: string;
	withBorder?: boolean;
	withBackground?: boolean;
	stretched?: boolean;
	file?: File;
	style?: Style;
	items?: string[];
	service?: Service;
	source?: string;
	embed?: string;
	width?: number;
	height?: number;
}

export interface File {
	url: string;
	width: number;
	height: number;
}

export enum Service {
	Youtube = "youtube",
}

export enum Style {
	Unordered = "unordered",
}

export enum Type {
	Embed = "embed",
	Header = "header",
	Image = "image",
	List = "list",
	Paragraph = "paragraph",
}

export enum Version {
	The2306 = "2.30.6",
	The2310RC7 = "2.31.0-rc.7",
}

export interface PublishedArticlesToAuthor {
	published_id: number;
	author_id: number;
	order: number;
	author: Author;
}

export interface Author {
	id: number;
	author_type: AuthorType;
	name: string;
	google_id: null | string;
	email: null | string;
	image: null | string;
}

export enum AuthorType {
	Guest = "guest",
	Member = "member",
}

export interface ThumbnailCrop {
	image_url: string;
	uploaded_custom_thumbnail?: boolean;
	unit: Unit;
	x: number;
	y: number;
	width: number;
	height: number;
}

export enum Unit {
	Empty = "%",
}

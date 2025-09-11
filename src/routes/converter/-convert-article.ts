import type { TElement } from "platejs";
import type { PlateEditor } from "platejs/react";
import { record_problem } from "~/lib/converter-db";
import { stage_media } from "./-stage-media";
import type { Article } from "./-types";

export async function convert_article(
	article: Article,
	editor: PlateEditor,
): Promise<TElement[]> {
	const value: TElement[] = [];
	let mediaOrder = 0;

	for (const block of article.content.blocks) {
		if (block.type === "paragraph") {
			if (!block.data.text) throw new Error("Paragraph block missing text");

			const html = editor.api.html.deserialize({ element: block.data.text });
			const node: TElement = {
				type: "p",
				children: html,
			};

			value.push(node);
		} else if (block.type === "header") {
			if (!block.data.text) throw new Error("Header block missing text");
			const html = editor.api.html.deserialize({ element: block.data.text });
			const level = Number(block.data.level);
			if (level < 1 || level > 6)
				throw new Error("Header block with invalid level");
			const node: TElement = {
				type: `h${level}`,
				children: html,
			};
			value.push(node);
		} else if (block.type === "list") {
			if (block.data.style !== "unordered")
				throw new Error("Only unordered lists are supported");
			if (!block.data.items) throw new Error("List block missing items");
			const html_list = `<ul role="list" style="list-style-type:disc">${block.data.items.map((item) => `<li role="listitem" aria-level="1">${item}</li>`).join("")}</ul>`;
			const html = editor.api.html.deserialize({ element: html_list });
			for (const h of html) {
				h.listStyleType = "disc";
			}

			const node: TElement = {
				type: "ul",
				children: html,
			};

			value.push(node);
		} else if (block.type === "embed") {
			if (!block.data.source) throw new Error("Embed block missing source");
			if (block.data.service !== "youtube")
				throw new Error("Only youtube embeds are supported");
			const iframe_html = `<iframe src="${block.data.source}" frameborder="0" allowfullscreen style="width:100%;min-height:300px"></iframe>`;
			const html = editor.api.html.deserialize({ element: iframe_html });
			if (html.length !== 1)
				throw new Error("Embed deserialized to multiple nodes");

			value.push(html[0] as TElement);
		} else if (block.type === "image") {
			const img_url = block.data.file?.url;
			if (!img_url) throw new Error("Image block missing file url");

			try {
				// Stage the media and get the final URL
				const finalUrl = await stage_media(img_url, article.id, mediaOrder++);

				const img_html = `<img src="${finalUrl}" />`;
				const html = editor.api.html.deserialize({ element: img_html });
				if (html.length !== 1)
					throw new Error("Figure deserialized to multiple nodes");
				const first_html = html[0];
				const caption = block.data.caption;
				if (caption) {
					const caption_html = editor.api.html.deserialize({
						element: caption,
					});
					if (caption_html.length !== 1)
						throw new Error("Caption deserialized to multiple nodes");
					Object.assign(first_html, { caption: caption_html });
				}

				value.push(first_html as TElement);
			} catch (error) {
				console.error("Failed to stage media:", img_url, error);
				await record_problem(
					article.id,
					"missing_media",
					`Failed to stage media: ${img_url} - ${error}`,
					img_url,
				);
				// Add placeholder for missing media
				const placeholder_html = `<p>[Missing image: ${img_url}]</p>`;
				const html = editor.api.html.deserialize({ element: placeholder_html });
				value.push(html[0] as TElement);
			}
		}
	}

	return value;
}

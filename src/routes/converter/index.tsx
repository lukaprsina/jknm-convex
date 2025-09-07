import fs from "node:fs/promises";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Button } from "~/components/ui/button";
import type { Article } from "./-types";
import { unified } from "unified";
import rehypeParse from "rehype-parse";
import { visit } from "unist-util-visit";
import { Element } from "hast";

const CONTENT_PATH = "src/content/articles.json";

const get_articles = createServerFn().handler(async () => {
  const file = await fs.readFile(CONTENT_PATH, "utf-8");
  const articles = JSON.parse(file) as Article[];
  return articles;
});

export const Route = createFileRoute("/converter/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <Button
        onClick={async () => {
          const articles = await get_articles();
          analyze_articles(articles);
        }}
      >
        Analyze
      </Button>
    </div>
  );
}

const parser = unified().use(rehypeParse, { fragment: true });

async function analyze_articles(articles: Article[]) {
  const text_tags = new Map<string, string[]>();
  const caption_tags = new Map<string, string[]>();
  const files = new Map<string, string[]>();
  const embeds = new Map<string, string[]>();
  const urls = new Map<string, string[]>();
  const relative_urls = new Map<string, string[]>();

  function extract_domain(node: Element, id: string) {
    if (node.tagName === "a") {
      const href = node.properties?.href;
      if (typeof href === "string") {
        try {
        const obj = new URL(href);

        const prev = urls.get(obj.hostname) ?? [];
        urls.set(obj.hostname, [...prev, id]);
      } catch (_e) {
        const prev = relative_urls.get(href) ?? [];
        relative_urls.set(href, [...prev, id]);
      }
    } else if (Array.isArray(href)) {
        throw new Error("Unexpected array href");
      }
    }
  }

  for (const article of articles) {
    for (const block of article.content.blocks) {
      const data = block.data;

      if (typeof data.text === "string") {
        const tree = parser.parse(data.text);

        visit(tree, "element", (node) => {
          const prev = text_tags.get(node.tagName) ?? [];
          text_tags.set(node.tagName, [...prev, article.id.toString()]);

          extract_domain(node, article.id.toString());
        });
      }

      if (typeof data.caption === "string") {
        const tree = parser.parse(data.caption);

        visit(tree, "element", (node) => {
          const prev = caption_tags.get(node.tagName) ?? [];
          caption_tags.set(node.tagName, [...prev, article.id.toString()]);

          extract_domain(node, article.id.toString());
        });
      }

      if (typeof data.file?.url === "string") {
        const prev = files.get(article.id.toString()) ?? [];
        files.set(article.id.toString(), [...prev, data.file.url]);
      }

      if (typeof data.source === "string") {
        const prev = embeds.get(article.id.toString()) ?? [];
        embeds.set(article.id.toString(), [...prev, data.source]);
      }
    }
  }

  console.log({ text_tags, caption_tags, files, embeds, urls, relative_urls });
}

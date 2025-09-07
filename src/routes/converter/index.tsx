import fs from "node:fs/promises";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Button } from "~/components/ui/button";
import { BlockType, Article } from "./-types";
import { unified } from "unified";
import rehypeParse from "rehype-parse";
import { visit } from "unist-util-visit";
import { Element } from "hast";
import { Plate, useEditorMounted, useEditorRef, usePlateEditor } from "platejs/react";
import { EditorKit } from "~/components/editor-kit";
import { Editor, EditorContainer } from "~/components/plate-ui/editor";
import { createContext, use, useEffect, useState } from "react";
import { TElement } from "platejs";

const CONTENT_PATH = "src/content/articles.json";
const HTML_DOC = `
<!DOCTYPE html>
<html>
<body>

<h1>My First Heading</h1>

<p>My first paragraph.</p>

</body>
</html>
`

const get_articles = createServerFn().handler(async () => {
  const file = await fs.readFile(CONTENT_PATH, "utf-8");
  const articles = JSON.parse(file) as Article[];
  return articles;
});

const EditorContext = createContext<{ index: number; articles: Article[] } | undefined>(undefined);

function ArticlePlateEditor() {
  const editor = usePlateEditor({
    plugins: EditorKit,
  });

  return (
    <Plate editor={editor}>
      <ConfiguredPlateEditor />
    </Plate>
  );
}

function ConfiguredPlateEditor() {
  const editor = useEditorRef();
  const editor_context = use(EditorContext);
  const mounted = useEditorMounted()

  useEffect(() => {
    if (!editor_context || !mounted) return;
    const article = editor_context.articles[editor_context.index];
    if (!article) return;
    console.log("Loading article", article.id, article.title);

    editor.tf.reset();

    const value: TElement[] = [];
    
    for (const block of article.content.blocks) {
      if (block.type === "paragraph") {
        if (!block.data.text) throw new Error("Paragraph block missing text");
        console.log("Inserting paragraph", block.data.text);

        const node: TElement = {
          type: "p",
          children: [{ text: block.data.text }],
        };

        value.push(node);
      }
    }

    editor.tf.setValue(value)
    // editor.transforms.init
    // const slateValue = editor.api.html.deserialize({element:"<p>hi</p>"});
  }, [editor_context, editor, mounted]);

  return (
    <EditorContainer>
      <Editor spellCheck={false} variant="article" />
    </EditorContainer>
  );
}

export const Route = createFileRoute("/converter/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [index, setIndex] = useState(0);
  const [articles, setArticles] = useState<Article[]>([]);

  return (
    <EditorContext value={{ index, articles }}>
      <div>
        <Button
          onClick={async () => {
            const articles = await get_articles();
            console.log("Loaded articles", articles.length);
            setArticles(articles);
            // analyze_articles(articles);
          }}
        >
          Load articles
        </Button>
        <Button
          onClick={async () => {
            setIndex((i) => i - 1);
          }}
        >
          Previous
        </Button>
        <Button
          onClick={async () => {
            setIndex((i) => i + 1);
          }}
        >
          Next
        </Button>
        <div>Article Index: {index}</div>
        <ArticlePlateEditor />
      </div>
    </EditorContext>
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
  const image_urls = new Map<string, string[]>();

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

        const src = data.file.url;
        const id = article.id.toString();

        if (typeof src === "string") {
          try {
            const obj = new URL(src);
            const prev = image_urls.get(obj.hostname) ?? [];
            image_urls.set(obj.hostname, [...prev, id]);
          } catch (_e) {
            const prev = image_urls.get(src) ?? [];
            image_urls.set(src, [...prev, id]);
          }
        }
      }

      if (typeof data.source === "string") {
        const prev = embeds.get(article.id.toString()) ?? [];
        embeds.set(article.id.toString(), [...prev, data.source]);
      }
    }
  }

  console.log({ text_tags, caption_tags, files, embeds, urls, relative_urls, image_urls });
}

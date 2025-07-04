// Example usage of the Convex blog schema
// This file shows how to use the articles, authors, and articles_to_authors functions

import { api } from "./_generated/api";

// Example: Creating an author
async function createAuthor(ctx: any) {
    const authorId = await ctx.runMutation(api.authors.create, {
        author_type: "member",
        name: "John Doe",
        email: "john@example.com",
        google_id: "google_123456",
        image: "https://example.com/avatar.jpg"
    });

    return authorId;
}

// Example: Creating an article
async function createArticle(ctx: any) {
    const articleId = await ctx.runMutation(api.articles.create, {
        title: "My First Blog Post",
        slug: "my-first-blog-post",
        url: "/articles/my-first-blog-post",
        status: "published",
        content_markdown: "This is the content of my first blog post. It supports **markdown** and can be searched!",
        content_html: "<p>This is the content of my first blog post. It supports <strong>markdown</strong> and can be searched!</p>",
        excerpt: "This is a short excerpt for SEO and previews.",
        meta_description: "My first blog post - learn about our new blog!"
    });

    return articleId;
}

// Example: Associating an author with an article
async function associateAuthorWithArticle(ctx: any, articleId: string, authorId: string) {
    await ctx.runMutation(api.articles_to_authors.addAuthorToArticle, {
        article_id: articleId,
        author_id: authorId,
        order: 0 // First author
    });
}

// Example: Getting published articles with pagination
async function getPublishedArticles(ctx: any) {
    const result = await ctx.runQuery(api.articles.getPublished, {
        paginationOpts: {
            numItems: 10,
            cursor: null
        }
    });

    return result;
}

// Example: Searching articles
async function searchArticles(ctx: any, searchTerm: string) {
    const result = await ctx.runQuery(api.articles.searchArticles, {
        searchTerm,
        paginationOpts: {
            numItems: 5,
            cursor: null
        }
    });

    return result;
}

// Example: Getting an article with its authors
async function getArticleWithAuthors(ctx: any, slug: string) {
    const article = await ctx.runQuery(api.articles.getBySlug, { slug });

    if (!article) {
        return null;
    }

    const authors = await ctx.runQuery(api.articles_to_authors.getAuthorsForArticle, {
        article_id: article._id
    });

    return {
        ...article,
        authors
    };
}

// Example: Incrementing view count when someone visits an article
async function viewArticle(ctx: any, slug: string) {
    const article = await ctx.runQuery(api.articles.getBySlug, { slug });

    if (article) {
        await ctx.runMutation(api.articles.incrementViewCount, {
            id: article._id
        });
    }

    return article;
}

// React component examples:

/*
// In a React component - get published articles
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function BlogList() {
  const articles = useQuery(api.articles.getPublished, {
    paginationOpts: { numItems: 10, cursor: null }
  });

  if (!articles) return <div>Loading...</div>;

  return (
    <div>
      {articles.page.map(article => (
        <div key={article._id}>
          <h2>{article.title}</h2>
          <p>{article.excerpt}</p>
          <a href={`/articles/${article.slug}`}>Read more</a>
        </div>
      ))}
    </div>
  );
}

// In a React component - search articles
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function SearchArticles() {
  const [searchTerm, setSearchTerm] = useState("");
  
  const searchResults = useQuery(
    api.articles.searchArticles,
    searchTerm ? {
      searchTerm,
      paginationOpts: { numItems: 10, cursor: null }
    } : "skip"
  );

  return (
    <div>
      <input
        type="text"
        placeholder="Search articles..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      
      {searchResults?.page.map(article => (
        <div key={article._id}>
          <h3>{article.title}</h3>
          <p>{article.excerpt}</p>
        </div>
      ))}
    </div>
  );
}

// In a React component - create new article
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function CreateArticle() {
  const createArticle = useMutation(api.articles.create);

  const handleSubmit = async (formData: FormData) => {
    const articleId = await createArticle({
      title: formData.get("title") as string,
      slug: formData.get("slug") as string,
      url: `/articles/${formData.get("slug")}`,
      status: "draft",
      content_markdown: formData.get("content") as string,
      excerpt: formData.get("excerpt") as string,
    });
    
    console.log("Created article:", articleId);
  };

  return (
    <form action={handleSubmit}>
      <input name="title" placeholder="Article title" required />
      <input name="slug" placeholder="article-slug" required />
      <input name="excerpt" placeholder="Short excerpt" />
      <textarea name="content" placeholder="Article content (markdown)" />
      <button type="submit">Create Article</button>
    </form>
  );
}
*/

export {
    createAuthor,
    createArticle,
    associateAuthorWithArticle,
    getPublishedArticles,
    searchArticles,
    getArticleWithAuthors,
    viewArticle
};

import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { api } from 'convex/_generated/api';

export const Route = createFileRoute('/novica/$article_slug/')({
    component: RouteComponent,
    loader: async ({ context, params }) => {
        const { article_slug } = params;
        if (!article_slug) {
            throw new Error('Article slug is required');
        }

        const article = await context.queryClient.ensureQueryData(
            convexQuery(api.articles.get_by_slug, { slug: article_slug, user_id: context.user?._id }),
        );

        return { article };
    }
})

const route_api = getRouteApi("/novica/$article_slug/");

function RouteComponent() {
    const { article_slug } = route_api.useParams();
    const { user } = route_api.useRouteContext()

    const { data: article } = useSuspenseQuery(
        convexQuery(api.articles.get_by_slug, { slug: article_slug, user_id: user?._id }),
    );

    if (!article?.content_markdown) {
        return null;
    }

    const editor = createSlateEditor({
        plugins: BaseEditorKit,
        nodeId: false, // Disable NodeIdPlugin to prevent hydration mismatches
        value: (editor) => {
            return editor
                .getApi(MarkdownPlugin)
                .markdown.deserialize(article.content_markdown ?? "# No article");
        },
    });

    return <PlateStatic editor={editor} />;
}

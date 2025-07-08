import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { api } from 'convex/_generated/api';
import { PlateEditorFromMarkdown } from '~/components/plate-editor-from-markdown';

export const Route = createFileRoute('/admin/osnutki/$draft_id/uredi/')({
  component: RouteComponent,
})

const draft_id_route_api = getRouteApi("/admin/osnutki/$draft_id/uredi/")

function RouteComponent() {
  const { draft_id } = draft_id_route_api.useParams();

  const { data: article } = useSuspenseQuery(
    convexQuery(api.articles.get_draft_by_slug, { slug: draft_id }),
  );

  if (!article.content_markdown) {
    throw new Error(`No content found for the article with ID: ${draft_id}`);
  }

  return (
    <div className="overflow-hidden flex w-full flex-grow m-2 outline-2 outline-red-400">
    	<PlateEditorFromMarkdown markdown={article.content_markdown} />
    </div>
  );
}

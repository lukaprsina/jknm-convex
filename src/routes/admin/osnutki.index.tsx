import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'

export const Route = createFileRoute('/admin/osnutki/')({
  component: RouteComponent,
  loader: async ({ context }) => {
    const drafts = await context.queryClient.ensureQueryData(
      convexQuery(api.articles.get_all_drafts, {})
    )

    return {
      drafts,
    }
  }
})

const draft_route = getRouteApi("/admin/osnutki/")

function RouteComponent() {
  const { drafts } = draft_route.useLoaderData()

  return <div>
    {drafts.map(draft => (
      <a
        key={draft._id}
        href={`${draft_route.id}/${draft.slug}`}
      >
        {draft.title}
      </a>
    ))
    }
  </div >
}

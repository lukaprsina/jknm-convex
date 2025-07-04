import { createFileRoute } from '@tanstack/react-router'
import { Footer2 } from '~/components/layout/footer2'
import { Navbar1 } from '~/components/layout/navbar1'
import { usePaginatedQuery, usePreloadedQuery } from "convex/react"
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { useSuspenseQuery } from '@tanstack/react-query'
// import NavigationMenu from '~/components/layout/navigation-menu'
// import { Footer } from '~/components/layout/footer'

const DEFAULT_NUM_ITEMS = 10

export const Route = createFileRoute('/')({
  component: Home,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(convexQuery(api.articles.get_paginated_published, {
      paginationOpts: { cursor: null, numItems: DEFAULT_NUM_ITEMS }
    }))
  }
})

function Home() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.articles.get_paginated_published,
    {},
    { initialNumItems: DEFAULT_NUM_ITEMS },
  );

  const { data } = useSuspenseQuery(convexQuery(api.articles.get_paginated_published, { paginationOpts: { cursor: null, numItems: DEFAULT_NUM_ITEMS } }));

  console.log("Home results:", results, "status:", status);

  return (
    <div className="w-full">
      <Navbar1 />
      <main className="w-full flex-grow">
        {/* <pre>{JSON.stringify(data, null, 2)}</pre> */}
        {results?.map(({ _id, title }) => <div key={_id}>{title}</div>)}
        <button onClick={() => loadMore(5)} disabled={status !== "CanLoadMore"}>
          Load More
        </button>
      </main>
      <Footer2 />
    </div>
  )
}

import { createFileRoute } from '@tanstack/react-router'
import React from 'react';
import { Footer2 } from '~/components/layout/footer2'
import { Navbar1 } from '~/components/layout/navbar1'
import { usePaginatedQuery } from "convex/react"
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { useIntersectionObserver } from 'usehooks-ts'
import { AccordionDemo } from '~/components/filter-accordion';

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

  // Sentinel for infinite loading
  const { isIntersecting, ref } = useIntersectionObserver({ threshold: 0.5 });

  // Only load more if the sentinel is visible and we can load more
  React.useEffect(() => {
    if (isIntersecting && status === "CanLoadMore") {
      loadMore(5);
    }
  }, [isIntersecting, status, loadMore]);

  return (
    // <div className="w-full flex-grow">
    <>
      <Navbar1 />
      <AccordionDemo />
      <main className="w-full flex-grow">
        {results?.map(({ _id, title }) => <div key={_id}>{title}</div>)}
        {/* Sentinel for infinite scroll */}
        {status === "CanLoadMore" && (
          <div ref={ref} style={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span>Loading more...</span>
          </div>
        )}
      </main>
      <Footer2 />
    </>
    // </div>
  )
}

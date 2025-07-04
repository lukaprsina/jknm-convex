import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/boards/$boardId')({
  component: Home,
  // pendingComponent: () => <Loader />,
  /* loader: async ({ params, context: { queryClient } }) => {
    await queryClient.ensureQueryData(boardQueries.detail(params.boardId))
  }, */
})

function Home() {
  const { boardId } = Route.useParams()

  return <>{boardId}</>
  // return <Board boardId={boardId} />
}

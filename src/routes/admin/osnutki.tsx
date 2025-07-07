import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/osnutki')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/osnutki"!</div>
}

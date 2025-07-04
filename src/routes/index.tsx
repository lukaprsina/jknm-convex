import { createFileRoute } from '@tanstack/react-router'
import { Footer } from '~/components/layout/footer'
import NavigationMenu from '~/components/layout/navigation-menu'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <>
      <NavigationMenu />
      <main className="flex-grow">
        <div>Home</div>
        <div>Content</div>
      </main>
      <Footer />
    </>
  )
}

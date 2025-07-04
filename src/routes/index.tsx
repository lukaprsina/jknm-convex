import { createFileRoute } from '@tanstack/react-router'
import { Footer } from '~/components/layout/footer'
import { Footer2 } from '~/components/layout/footer2'
import { Navbar1 } from '~/components/layout/navbar1'
import NavigationMenu from '~/components/layout/navigation-menu'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <>
      <Navbar1 />
      <main className="flex-grow">
        <div>Home</div>
        <div>Content</div>
      </main>
      <Footer2 />
    </>
  )
}

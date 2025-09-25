import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/test/")({
	component: RouteComponent,
});

function RouteComponent() {
	return <HomePage />;
}

function HomePage() {
	return (
		// This is the main scrollable container
		<div className="min-h-[200vh] bg-gray-50">
			{/* The header now ONLY contains the first row that scrolls away */}
			<header className="bg-gray-100 py-4">
				<div className="container mx-auto flex items-center justify-between px-6">
					<h1 className="font-bold text-xl">My Website</h1>
					<div className="flex items-center space-x-4">
						<span>Search</span>
						<span>Icons</span>
					</div>
				</div>
			</header>

			{/* The nav is now a SIBLING to the header, not a child. This is the fix. */}
			<nav className="sticky top-0 border-gray-200 border-b bg-white/80 py-4 backdrop-blur-md">
				<div className="container mx-auto flex items-center justify-center px-6">
					<ul className="flex space-x-6">
						<li>
							<a href="#" className="text-gray-600 hover:text-black">
								Home
							</a>
						</li>
						<li>
							<a href="#" className="text-gray-600 hover:text-black">
								About
							</a>
						</li>
						<li>
							<a href="#" className="text-gray-600 hover:text-black">
								Projects
							</a>
						</li>
						<li>
							<a href="#" className="text-gray-600 hover:text-black">
								Contact
							</a>
						</li>
					</ul>
				</div>
			</nav>

			{/* The rest of the page content follows as a sibling */}
			<main className="container mx-auto px-6 py-8">
				<h2 className="mb-4 font-bold text-2xl">Page Content</h2>
				<p>
					The navigation bar is now sticky because its parent container (`div`
					with `min-h-[200vh]`) remains on the page while the content scrolls.
				</p>
				<div className="mt-8 space-y-4">
					{Array.from({ length: 20 }).map((_, i) => (
						<div key={i} className="h-24 rounded-lg bg-gray-200 p-4">
							Placeholder content
						</div>
					))}
				</div>
			</main>
		</div>
	);
}

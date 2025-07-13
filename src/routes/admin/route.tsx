import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { AdminSidebar } from "./-sidebar";

export const Route = createFileRoute("/admin")({
	component: Page,
	beforeLoad: async ({ context }) => {
		console.log("Admin route beforeLoad", context.userId);
		if (!context.userId) throw notFound();
	},
});

export default function Page() {
	/* const { data: draft_articles } = useSuspenseQuery(
		convexQuery(api.articles.get_all_of_status, { status: "draft" }),
	);

	console.log("Draft articles:", draft_articles); // Debugging line */

	return (
		<SidebarProvider className="min-w-0 max-w-full">
			<AdminSidebar />
			<SidebarInset className="min-w-0 max-w-full">
				<Outlet />
			</SidebarInset>
		</SidebarProvider>
	);
}

/* 
<header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
	<div className="flex items-center gap-2 px-4">
		<SidebarTrigger className="-ml-1" />
		<Separator
			orientation="vertical"
			className="mr-2 data-[orientation=vertical]:h-4"
		/>
		<Breadcrumb>
			<BreadcrumbList>
				<BreadcrumbItem className="hidden md:block">
					<BreadcrumbLink href="#">
						Building Your Application
					</BreadcrumbLink>
				</BreadcrumbItem>
				<BreadcrumbSeparator className="hidden md:block" />
				<BreadcrumbItem>
					<BreadcrumbPage>Data Fetching</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	</div>
</header>
*/

/* 
<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
    <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <div className="bg-muted/50 aspect-video rounded-xl" />
        <div className="bg-muted/50 aspect-video rounded-xl" />
        <div className="bg-muted/50 aspect-video rounded-xl" />
    </div>
    <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min" />
</div>
*/

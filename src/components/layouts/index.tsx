import { AppSidebar } from "~/components/layouts/app-sidebar";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { DesktopHeader } from "./desktop-header";

export default function Layout({ children }: { children: React.ReactNode }) {
	return (
		<div className="[--header-height:calc(--spacing(20))]">
			<SidebarProvider className="flex min-h-0 w-full flex-col">
				{/* <SiteHeader /> */}
				<DesktopHeader />
				<div className="flex flex-1">
					<AppSidebar />
					<SidebarInset>{children}</SidebarInset>
				</div>
			</SidebarProvider>
		</div>
	);
}

/* 
<div className="flex flex-1 flex-col gap-4 p-4">
  <div className="grid auto-rows-min gap-4 md:grid-cols-3">
    <div className="bg-muted/50 aspect-video rounded-xl" />
    <div className="bg-muted/50 aspect-video rounded-xl" />
    <div className="bg-muted/50 aspect-video rounded-xl" />
  </div>
  <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min" />
</div>
*/

import { FolderIcon } from "lucide-react";
import { NavProjects } from "~/components/nav-projects";
import { Sidebar, SidebarContent, SidebarRail } from "~/components/ui/sidebar";

/* 
projects: {
    name: string
    url: string
    icon: LucideIcon
  }[]
 */
const data = {
    projects: [{
        name: "Osnutki",
        url: "/admin/osnutki",
        icon: FolderIcon,
    }]
}

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar collapsible="icon" {...props}>
            {/* <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader> */}
            <SidebarContent>
                {/* <NavMain items={data.navMain} /> */}
                <NavProjects projects={data.projects} />
            </SidebarContent>
            {/* <SidebarFooter>
                <NavUser user={data.user} />
            </SidebarFooter> */}
            <SidebarRail />
        </Sidebar>
    )
}

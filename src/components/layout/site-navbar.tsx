import {
	BookIcon,
	type LucideIcon,
	Menu,
	SunsetIcon,
	TreesIcon,
	ZapIcon,
} from "lucide-react";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
} from "~/components/ui/navigation-menu";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "~/components/ui/sheet";

interface MenuItem {
	title: string;
	url: string;
	description?: string;
	icon?: LucideIcon;
	items?: MenuItem[];
}

export interface SiteNavbarProps {
	logo?: {
		url: string;
		src: string;
		alt: string;
		title: string;
	};
	menu?: MenuItem[];
}

export const SiteNavbar = ({
	logo = {
		url: "https://www.shadcnblocks.com",
		src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/shadcnblockscom-icon.svg",
		alt: "logo",
		title: "Shadcnblocks.com",
	},
	menu = [
		{ title: "Home", url: "#" },
		{
			title: "Products",
			url: "#",
			items: [
				{
					title: "Blog",
					description: "The latest industry news, updates, and info",
					// className="size-5 shrink-0"
					icon: BookIcon,
					url: "#",
				},
				{
					title: "Company",
					description: "Our mission is to innovate and empower the world",
					icon: TreesIcon,
					url: "#",
				},
				{
					title: "Careers",
					description: "Browse job listing and discover our workspace",
					icon: SunsetIcon,
					url: "#",
				},
				{
					title: "Support",
					description:
						"Get in touch with our support team or visit our community forums",
					icon: ZapIcon,
					url: "#",
				},
			],
		},
		{
			title: "Resources",
			url: "#",
			items: [
				{
					title: "Help Center",
					description: "Get all the answers you need right here",
					icon: ZapIcon,
					url: "#",
				},
				{
					title: "Contact Us",
					description: "We are here to help you with any questions you have",
					icon: SunsetIcon,
					url: "#",
				},
				{
					title: "Status",
					description: "Check the current status of our services and APIs",
					icon: TreesIcon,
					url: "#",
				},
				{
					title: "Terms of Service",
					description: "Our terms and conditions for using our services",
					icon: BookIcon,
					url: "#",
				},
			],
		},
		{
			title: "Pricing",
			url: "#",
		},
		{
			title: "Blog",
			url: "#",
		},
	],
}: SiteNavbarProps) => {
	return (
		<section className="py-4">
			{/* https://v3.tailwindcss.com/docs/container - you have to center it manually now */}
			<div className="container mx-auto px-4">
				{/* Desktop Menu */}
				<nav className="hidden justify-between lg:flex">
					<div className="flex items-center gap-6">
						{/* Logo */}
						<a href={logo.url} className="flex items-center gap-2">
							<img src={logo.src} className="max-h-8" alt={logo.alt} />
							<span className="font-semibold text-lg tracking-tighter">
								{logo.title}
							</span>
						</a>
						<div className="flex items-center">
							<NavigationMenu viewport={false}>
								<NavigationMenuList>
									{menu.map((item) => renderMenuItem(item))}
								</NavigationMenuList>
							</NavigationMenu>
						</div>
					</div>
				</nav>

				{/* Mobile Menu */}
				<div className="block lg:hidden">
					<div className="flex items-center justify-between">
						{/* Logo */}
						<a href={logo.url} className="flex items-center gap-2">
							<img src={logo.src} className="max-h-8" alt={logo.alt} />
						</a>
						<Sheet>
							<SheetTrigger asChild>
								<Button variant="outline" size="icon">
									<Menu className="size-4" />
								</Button>
							</SheetTrigger>
							<SheetContent className="overflow-y-auto">
								<SheetHeader>
									<SheetTitle>
										<a href={logo.url} className="flex items-center gap-2">
											<img src={logo.src} className="max-h-8" alt={logo.alt} />
										</a>
									</SheetTitle>
								</SheetHeader>
								<div className="flex flex-col gap-6 p-4">
									<Accordion
										type="single"
										collapsible
										className="flex w-full flex-col gap-4"
									>
										{menu.map((item) => renderMobileMenuItem(item))}
									</Accordion>
								</div>
							</SheetContent>
						</Sheet>
					</div>
				</div>
			</div>
		</section>
	);
};

const renderMenuItem = (item: MenuItem) => {
	if (item.items) {
		return (
			<NavigationMenuItem key={item.title}>
				<NavigationMenuTrigger>{item.title}</NavigationMenuTrigger>
				<NavigationMenuContent className="z-10 w-80! bg-popover text-popover-foreground">
					{item.items.map((subItem) => (
						<NavigationMenuLink asChild key={subItem.title} className="w-80">
							<SubMenuLink item={subItem} />
						</NavigationMenuLink>
					))}
				</NavigationMenuContent>
			</NavigationMenuItem>
		);
	}

	return (
		<NavigationMenuItem key={item.title}>
			<NavigationMenuLink
				href={item.url}
				className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 font-medium text-sm transition-colors hover:bg-muted hover:text-accent-foreground"
			>
				{item.title}
			</NavigationMenuLink>
		</NavigationMenuItem>
	);
};

const renderMobileMenuItem = (item: MenuItem) => {
	if (item.items) {
		return (
			<AccordionItem key={item.title} value={item.title} className="border-b-0">
				<AccordionTrigger className="py-0 font-semibold text-md hover:no-underline">
					{item.title}
				</AccordionTrigger>
				<AccordionContent className="mt-2">
					{item.items.map((subItem) => (
						<SubMenuLink key={subItem.title} item={subItem} />
					))}
				</AccordionContent>
			</AccordionItem>
		);
	}

	return (
		<a key={item.title} href={item.url} className="font-semibold text-md">
			{item.title}
		</a>
	);
};

const SubMenuLink = ({ item }: { item: MenuItem }) => {
	return (
		<a
			className="flex select-none flex-row gap-4 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-muted hover:text-accent-foreground"
			href={item.url}
		>
			{item.icon && (
				<div className="text-foreground">
					<item.icon />
				</div>
			)}
			<div>
				<div className="font-semibold text-sm">{item.title}</div>
				{item.description && (
					<p className="text-muted-foreground text-sm leading-snug">
						{item.description}
					</p>
				)}
			</div>
		</a>
	);
};

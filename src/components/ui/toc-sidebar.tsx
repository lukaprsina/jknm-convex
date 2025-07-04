"use client";

import * as React from "react";

import { useTocSideBar, useTocSideBarState } from "@platejs/toc/react";
import { cn } from "~/lib/utils";
import { Button } from "./button";

export interface TocSidebarProps {
	className?: string;
	open?: boolean;
	rootMargin?: string;
	topOffset?: number;
}

export function TocSidebar({
	className,
	open = true,
	rootMargin = "0px 0px 0px 0px",
	topOffset = 80,
}: TocSidebarProps) {
	const state = useTocSideBarState({
		open,
		rootMargin,
		topOffset,
	});

	const { navProps, onContentClick } = useTocSideBar(state);

	const { headingList, activeContentId } = state;

	if (headingList.length === 0) {
		return null;
	}

	return (
		<div
			{...navProps}
			ref={navProps.ref as React.RefObject<HTMLDivElement>}
			className={cn(
				"bg-background/95 supports-[backdrop-filter]:bg-background/60 fixed top-1/2 right-4 z-50 max-h-96 w-64 -translate-y-1/2 overflow-y-auto rounded-lg border p-4 shadow-lg backdrop-blur",
				className,
			)}
		>
			<div className="text-foreground mb-2 text-sm font-medium">
				Table of Contents
			</div>
			<nav className="space-y-1">
				{headingList.map((item) => (
					<Button
						key={item.id}
						variant="ghost"
						size="sm"
						className={cn(
							"text-muted-foreground h-auto w-full justify-start px-2 py-1.5 text-left font-normal",
							"hover:bg-accent hover:text-accent-foreground",
							"focus-visible:bg-accent focus-visible:text-accent-foreground",
							activeContentId === item.id && "bg-accent text-accent-foreground",
							{
								"pl-2": item.depth === 1,
								"pl-4": item.depth === 2,
								"pl-6": item.depth === 3,
								"pl-8": item.depth === 4,
								"pl-10": item.depth === 5,
								"pl-12": item.depth === 6,
							},
						)}
						onClick={(e) => onContentClick(e, item, "smooth")}
					>
						<span className="truncate text-xs">{item.title}</span>
					</Button>
				))}
			</nav>
		</div>
	);
}

// components/Header.tsx
import { useEffect, useRef, useState } from "react";
import { cn } from "~/lib/utils";
import { Button } from "./ui/button";

const LOGO_HEIGHT = 120; // px
const NAV_HEIGHT = 64; // px
const THROTTLE_MS = 1000; // adjust as needed

export function Header() {
	const [showNav, setShowNav] = useState(true);
	const [sticky, setSticky] = useState(false);
	const lastY = useRef(0);
	const skipFirst = useRef(true);
	const ticking = useRef(false);

	useEffect(() => {
		function onScroll() {
			const y = window.scrollY;
			if (skipFirst.current) {
				skipFirst.current = false;
				lastY.current = y;
				return;
			}
			if (ticking.current) return;
			ticking.current = true;
			setTimeout(() => {
				const delta = y - lastY.current;
				// toggle sticky when past logo
				setSticky(y > LOGO_HEIGHT);
				// show/hide nav when scrolling up/down and past logo
				if (y > LOGO_HEIGHT) {
					if (delta > 0)
						setShowNav(false); // scrolling down => hide
					else if (delta < 0) setShowNav(true); // up => show
				}
				lastY.current = y;
				ticking.current = false;
			}, THROTTLE_MS);
		}
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	return (
		<header className="w-full select-none">
			{/* row 1: centered logo */}
			<div
				className="flex items-center justify-center"
				style={{ height: LOGO_HEIGHT }}
			>
				<img src="/logo.svg" alt="logo" className="h-full object-contain" />
			</div>

			{/* row 2: navbar */}
			<nav
				className={cn(
					"flex w-full items-center justify-between bg-white px-6",
					"z-50 transition-transform duration-200 ease-in-out",
					// position
					sticky
						? "fixed top-0 right-0 left-0 shadow-md"
						: "absolute top-[120px]",
					// show/hide
					showNav ? "translate-y-0" : "-translate-y-full",
				)}
				style={{ height: NAV_HEIGHT }}
			>
				<div className="flex gap-4">
					<Button variant="ghost">home</Button>
					<Button variant="ghost">about</Button>
					<Button variant="ghost">contact</Button>
				</div>
			</nav>

			{/* avoid content jump when nav is sticky */}
			{sticky && <div style={{ height: NAV_HEIGHT }} />}
		</header>
	);
}

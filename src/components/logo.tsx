import { Link } from "@tanstack/react-router";
import { cn } from "~/lib/utils";

export function Logo({ className }: { className?: string }) {
	return (
		<Link to="/" className={cn("flex items-center gap-2", className)}>
			<img src="/logo.svg" /* className="max-h-24" */ alt="logo" />
		</Link>
	);
}

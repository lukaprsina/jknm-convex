import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/novica/$article_slug/uredi")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/novica/$article_id/uredi"!</div>;
}

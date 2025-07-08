import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Authenticated, Unauthenticated } from "convex/react";
import { Home } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { auth_client } from "~/lib/auth-client";

export const Route = createFileRoute("/prijava/")({
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = useNavigate();

	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");

	return (
		<div className="flex flex-col gap-6">
			<Card className="overflow-hidden p-0">
				<CardContent className="grid p-0 md:grid-cols-2">
					<div className="p-6 md:p-8">
						<div className="flex flex-col gap-16">
							<div className="flex flex-col items-center text-center">
								{" "}
								<h1 className="font-bold text-2xl">
									<Unauthenticated>Jamarski klub Novo mesto</Unauthenticated>
									<Authenticated>Uspešno prijavljeni</Authenticated>
								</h1>
								<p className="text-balance text-muted-foreground">
									<Unauthenticated>
										Prijava je možna samo z Google računom info@jknm.si.
									</Unauthenticated>
									<Authenticated>Dobrodošli nazaj!</Authenticated>
								</p>
							</div>

							{errorMessage && (
								<div className="rounded-md bg-destructive/10 p-3 text-center text-destructive text-sm">
									{errorMessage}
								</div>
							)}

							<div className="grid gap-4">
								<Authenticated>
									<Button
										type="button"
										onClick={async () => {
											setIsLoading(true);
											try {
												await auth_client.signOut();
												navigate({ to: "/" });
											} catch {
												setErrorMessage("Napaka pri odjavi");
											} finally {
												setIsLoading(false);
											}
										}}
										disabled={isLoading}
										variant="destructive"
										className="w-full"
									>
										{isLoading ? "Odjavljanje..." : "Odjava"}
									</Button>
								</Authenticated>
								<Unauthenticated>
									<Button
										type="button"
										onClick={async () => {
											setIsLoading(true);
											try {
												await auth_client.signIn.social({
													provider: "google",
													callbackURL: "/",
												});
											} catch {
												setErrorMessage("Napaka pri prijavi");
											} finally {
												setIsLoading(false);
											}
										}}
										disabled={isLoading}
										className="w-full"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 24 24"
											className="mr-2 h-4 w-4"
										>
											<path
												d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
												fill="currentColor"
											/>
										</svg>
										{isLoading ? "Prijavljanje..." : "Prijava z Google"}
									</Button>
								</Unauthenticated>

								<Button
									type="button"
									variant="outline"
									className="w-full"
									asChild
								>
									<Link to="/">
										<Home className="mr-2 h-4 w-4" />
										Domača stran
									</Link>
								</Button>
							</div>
						</div>
					</div>
					<div className="relative hidden bg-muted md:flex md:items-center md:justify-center">
						<div className="relative flex h-full w-full items-center justify-center">
							<img
								src="/logo.svg"
								alt="JKNM logo"
								className="h-1/2 min-h-1/2 w-1/2 min-w-1/2 object-contain"
							/>
						</div>
					</div>
				</CardContent>
			</Card>
			<div className="text-balance text-center text-muted-foreground text-xs">
				Jamarski klub Novo mesto - Specialisti za dokumentirano raziskovanje in
				ohranjanje čistega ter zdravega podzemskega sveta.
			</div>
		</div>
	);
}

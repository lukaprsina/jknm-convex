import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Authenticated, Unauthenticated, useConvexAuth } from "convex/react";
import { Home } from "lucide-react";
import { useState } from "react";
import { GoogleIcon } from "~/components/icons";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { auth_client } from "~/lib/auth-client";

export const Route = createFileRoute("/prijava/")({
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = useNavigate();
	const auth = useConvexAuth();

	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");

	if (auth.isLoading) {
		return null;
	}

	return (
		<div className="flex min-h-screen items-center justify-center p-6">
			<div className="w-full max-w-3xl">
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
											<GoogleIcon />
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
				<div className="mt-4 text-balance text-center text-muted-foreground text-xs">
					Jamarski klub Novo mesto - Specialisti za dokumentirano raziskovanje
					in ohranjanje čistega ter zdravega podzemskega sveta.
				</div>
			</div>
		</div>
	);
}

import {
	FacebookIcon,
	InstagramIcon,
	TwitterIcon,
	YoutubeIcon,
} from "~/components/icons";
import { Logo } from "../logo";
import { DEFAULT_MENU } from "./site-navbar";

export function Footer() {
	const year = new Date().getFullYear();

	return (
		<footer className="py-32">
			<div className="container mx-auto px-4 py-12">
				<div className="grid gap-8 md:grid-cols-3">
					<div>
						<div className="flex items-center gap-3">
							<Logo className="w-32" />
						</div>
						<address className="mt-4 text-sm not-italic">
							Jamarski klub Novo mesto
							<br />
							Seidlova cesta 29
							<br />
							8000 Novo mesto
						</address>
						<div className="mt-4 text-sm">
							<p>
								<strong>TRR:</strong> 02970-0020299064
							</p>
							<p>
								<strong>Davčna številka:</strong> 82533113
							</p>
							<p>Nismo zavezanci za DDV</p>
						</div>
					</div>

					<div>
						<h3 className="mb-4 font-semibold">Stik z nami</h3>
						<ul className="space-y-2 text-sm">
							<li className="flex items-center">
								<a
									href="mailto:info@jknm.si"
									className="text-muted-foreground underline hover:text-primary"
								>
									info@jknm.si
								</a>
							</li>
							<li className="flex items-center">
								<a
									href="tel:+38641871385"
									className="text-muted-foreground underline hover:text-primary"
								>
									+386 (0)41 871 385
								</a>
								<span className="ml-2">Zdravko Bučar</span>
							</li>
						</ul>
					</div>

					<div>
						<h3 className="mb-4 font-semibold">Povezave</h3>
						<div className="flex flex-wrap gap-3 text-sm">
							{DEFAULT_MENU.map((m) => (
								<a
									key={m.title}
									href={m.url}
									className="text-muted-foreground underline hover:text-primary"
								>
									{m.title}
								</a>
							))}
						</div>

						<div className="mt-6">
							<h3 className="mb-4 font-semibold">Spremljajte nas</h3>
							<div className="-ml-[10px] flex items-center gap-4">
								<FacebookIcon />
								<YoutubeIcon />
								<InstagramIcon />
								<TwitterIcon />
							</div>
						</div>
					</div>
				</div>

				<div className="mt-8 border-gray-700 border-t pt-6 text-center text-gray-400 text-sm">
					<p>{`© ${year} Jamarski klub Novo mesto. Vse pravice pridržane.`}</p>
				</div>
			</div>
		</footer>
	);
}

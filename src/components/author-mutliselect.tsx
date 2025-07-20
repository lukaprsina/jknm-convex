import { api } from "@convex/_generated/api";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Label } from "~/components/ui/label";
import MultipleSelector, { type Option } from "~/components/ui/multiselect";

// Multiselect with placeholder and clear
// https://originui.com/r/comp-235.json
export default function AuthorMultiselect({
	authors,
	onAuthorsChange,
}: {
	authors?: Option[];
	onAuthorsChange?: (authors: Option[]) => void;
}) {
	const { data } = useSuspenseQuery(convexQuery(api.authors.get_all, {}));
	const placeholder = "Izberi avtorje";

	const all_authors: Option[] = useMemo(() => {
		if (!data) return [];
		return data.map((author) => ({
			value: author._id,
			label: author.name,
		}));
	}, [data]);

	return (
		<div className="*:not-first:mt-2">
			<Label>Avtorji</Label>
			<MultipleSelector
				commandProps={{
					label: placeholder,
				}}
				defaultOptions={all_authors}
				placeholder={placeholder}
				emptyIndicator={<p className="text-center text-sm">No results found</p>}
				value={authors}
				onChange={onAuthorsChange}
			/>
		</div>
	);
}

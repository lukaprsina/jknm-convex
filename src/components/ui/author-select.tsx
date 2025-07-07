"use client";

import type { api } from "convex/_generated/api";
import * as React from "react";
import MultipleSelector, { type Option } from "~/components/ui/multiselect";

interface AuthorSelectProps {
	authors: typeof api.authors.get_all._returnType;
	selectedAuthors?: string[];
	onAuthorsChange: (authors: string[]) => void;
	placeholder?: string;
	className?: string;
}

export function AuthorSelect({
	authors,
	selectedAuthors = [],
	onAuthorsChange,
	placeholder = "Izberi avtorje...",
	className,
}: AuthorSelectProps) {
	// Convert authors to Options format
	const authorOptions: Option[] = React.useMemo(
		() =>
			authors.map((author) => ({
				value: author._id,
				label: author.name,
			})),
		[authors],
	);

	// Convert selectedAuthors to selected Options
	const selectedOptions: Option[] = React.useMemo(
		() =>
			authorOptions.filter((option) => selectedAuthors.includes(option.value)),
		[authorOptions, selectedAuthors],
	);

	const handleAuthorsChange = React.useCallback(
		(options: Option[]) => {
			const authorValues = options.map((option) => option.value);
			onAuthorsChange(authorValues);
		},
		[onAuthorsChange],
	);

	return (
		<MultipleSelector
			value={selectedOptions}
			defaultOptions={authorOptions}
			placeholder={placeholder}
			emptyIndicator={
				<p className="text-center text-sm text-muted-foreground">
					Ni najdenih avtorjev
				</p>
			}
			onChange={handleAuthorsChange}
			className={className}
			commandProps={{
				label: "Izberi avtorje",
			}}
		/>
	);
}

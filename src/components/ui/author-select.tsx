"use client";

import * as React from "react";
import MultipleSelector, { type Option } from "~/components/ui/multiselect";

interface Author {
    value: string;
    label: string;
}

interface AuthorSelectProps {
    authors: Author[];
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
        () => authors.map((author) => ({
            value: author.value,
            label: author.label,
        })),
        [authors]
    );

    // Convert selectedAuthors to selected Options
    const selectedOptions: Option[] = React.useMemo(
        () => authorOptions.filter((option) => selectedAuthors.includes(option.value)),
        [authorOptions, selectedAuthors]
    );

    const handleAuthorsChange = React.useCallback(
        (options: Option[]) => {
            const authorValues = options.map((option) => option.value);
            onAuthorsChange(authorValues);
        },
        [onAuthorsChange]
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

import { useState } from "react";
import {
    Timeline,
    TimelineContent,
    TimelineDate,
    TimelineHeader,
    TimelineIndicator,
    TimelineItem,
    TimelineSeparator,
    TimelineTitle,
} from "~/components/ui/timeline";
import { cn } from "~/lib/utils";

interface YearSelectorHorizontalProps {
    selectedYear?: number;
    onYearChange?: (year?: number) => void;
    startYear?: number;
    endYear?: number;
    className?: string;
}

export function YearSelectorHorizontal({
    selectedYear,
    onYearChange,
    startYear = 2008,
    endYear = new Date().getFullYear(),
    className,
}: YearSelectorHorizontalProps) {
    const [value, setValue] = useState(selectedYear);

    const years = Array.from(
        { length: endYear - startYear + 1 },
        (_, i) => startYear + i,
    );

    return (
        <div className={cn("w-full overflow-x-auto", className)}>
            <Timeline defaultValue={value} orientation="horizontal">
                {years.map((year) => (
                    <TimelineItem
                        key={year}
                        step={year}
                        className="cursor-pointer group-data-[orientation=horizontal]/timeline:mt-0 w-16 flex-none"
                        onClick={() => {
                            const result = value === year ? undefined : year;
                            setValue(result);
                            onYearChange?.(result);
                        }}
                    >
                        <TimelineHeader>
                            <TimelineSeparator className="group-data-[orientation=horizontal]/timeline:top-8" />
                            <TimelineDate className="mb-2 text-sm text-center">{year}</TimelineDate>
                            <TimelineIndicator
                                className={cn(
                                    "group-data-[orientation=horizontal]/timeline:top-8",
                                    value === year && "bg-primary",
                                )}
                            />
                        </TimelineHeader>
                    </TimelineItem>
                ))}
            </Timeline>
        </div>
    );
}

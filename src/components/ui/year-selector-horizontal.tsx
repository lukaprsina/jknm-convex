import { useState } from "react"
import { cn } from "~/lib/utils"
import {
    Timeline,
    TimelineContent,
    TimelineDate,
    TimelineHeader,
    TimelineIndicator,
    TimelineItem,
    TimelineSeparator,
    TimelineTitle,
} from "~/components/ui/timeline"

interface YearSelectorHorizontalProps {
    selectedYear?: number
    onYearChange?: (year: number) => void
    startYear?: number
    endYear?: number
    className?: string
}

export function YearSelectorHorizontal({
    selectedYear,
    onYearChange,
    startYear = 2008,
    endYear = new Date().getFullYear(),
    className
}: YearSelectorHorizontalProps) {
    const [value, setValue] = useState(selectedYear || endYear)

    const years = Array.from(
        { length: endYear - startYear + 1 },
        (_, i) => startYear + i
    )

    const handleYearSelect = (year: number) => {
        setValue(year)
        onYearChange?.(year)
    }

    return (
        <div className={cn("w-full overflow-x-auto", className)}>
            <Timeline defaultValue={value} orientation="horizontal">
                {years.map((year) => (
                    <TimelineItem
                        key={year}
                        step={year}
                        className="group-data-[orientation=horizontal]/timeline:mt-0 cursor-pointer"
                        onClick={() => handleYearSelect(year)}
                    >
                        <TimelineHeader>
                            <TimelineSeparator className="group-data-[orientation=horizontal]/timeline:top-8" />
                            <TimelineDate className="mb-2 text-sm">{year}</TimelineDate>
                            <TimelineIndicator
                                className={cn(
                                    "group-data-[orientation=horizontal]/timeline:top-8",
                                    value === year && "bg-primary"
                                )}
                            />
                        </TimelineHeader>
                    </TimelineItem>
                ))}
            </Timeline>
        </div>
    )
}

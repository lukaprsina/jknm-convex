import { useEffect, useState } from "react";
import {
	Timeline,
	TimelineDate,
	TimelineHeader,
	TimelineIndicator,
	TimelineItem,
	TimelineSeparator,
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

	// Sync local state with prop changes
	useEffect(() => {
		setValue(selectedYear);
	}, [selectedYear]);

	const years = Array.from(
		{ length: endYear - startYear + 1 },
		(_, i) => startYear + i,
	);

	const handleYearClick = (year: number) => {
		const result = value === year ? undefined : year;
		setValue(result);
		onYearChange?.(result);
	};

	return (
		<div className={cn("w-full overflow-x-auto", className)}>
			<Timeline value={value} onValueChange={setValue} orientation="horizontal">
				{years.map((year) => (
					<TimelineItem
						key={year}
						step={year}
						className="w-12 flex-none cursor-pointer group-data-[orientation=horizontal]/timeline:mt-0"
						onClick={() => handleYearClick(year)}
					>
						<TimelineHeader>
							<TimelineSeparator className="group-data-[orientation=horizontal]/timeline:top-8" />
							<TimelineDate className="mb-2 text-center text-sm">
								{year}
							</TimelineDate>
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

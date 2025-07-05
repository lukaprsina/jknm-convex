import { ChevronDownIcon } from "lucide-react"
import { Button } from "~/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"

interface YearDropdownProps {
    selectedYear?: number
    onYearChange?: (year: number) => void
    startYear?: number
    endYear?: number
    className?: string
}

export function YearDropdown({
    selectedYear,
    onYearChange,
    startYear = 2008,
    endYear = new Date().getFullYear(),
    className
}: YearDropdownProps) {
    const years = Array.from(
        { length: endYear - startYear + 1 },
        (_, i) => endYear - i // Reverse order to show newest first
    )

    const handleYearSelect = (year: number) => {
        onYearChange?.(year)
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    className={className}
                >
                    {selectedYear || "Izberi leto"}
                    <ChevronDownIcon size={16} className="ml-2" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-60 overflow-y-auto">
                {years.map((year) => (
                    <DropdownMenuItem
                        key={year}
                        onClick={() => handleYearSelect(year)}
                    >
                        {year}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

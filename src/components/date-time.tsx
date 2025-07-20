// reui

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "~/components/ui/button3";
import { Calendar } from "~/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "~/components/ui/popover2";
import { ScrollArea } from "~/components/ui/scroll-area2";

export default function DatePickerDemo({
	date,
	setDate,
	time,
	setTime,
}: {
	date: Date | undefined;
	setDate: (date: Date | undefined) => void;
	time: string | undefined;
	setTime: (time: string | undefined) => void;
}) {
	// Mock time slots data
	const time_slots = Array.from({ length: 6 }, (_, i) => ({
		time: `${(i * 4).toString().padStart(2, "0")}:00`,
		available: true,
	}));

	return (
		<Popover>
			<PopoverTrigger asChild>
				<div className="relative w-[250px]">
					<Button
						type="button"
						variant="outline"
						mode="input"
						placeholder={!date}
						className="w-full"
					>
						<CalendarIcon />
						{date ? (
							format(date, "PPP") + (time ? ` - ${time}` : "")
						) : (
							<span>Pick a date and time</span>
						)}
					</Button>
				</div>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<div className="flex max-sm:flex-col">
					<Calendar
						mode="single"
						selected={date}
						onSelect={(newDate) => {
							if (newDate) {
								setDate(newDate);
								setTime(undefined);
							}
						}}
						className="p-2 sm:pe-5"
						captionLayout="dropdown"
						endMonth={new Date("2030")}
						// navLayout="around"
						startMonth={new Date("2008")}
						// disabled={[{ before: today }]}
					/>
					<div className="relative w-full max-sm:h-48 sm:w-40">
						<div className="absolute inset-0 py-4 max-sm:border-t">
							<ScrollArea className="h-full sm:border-s">
								<div className="space-y-3">
									<div className="flex h-5 shrink-0 items-center px-5">
										<p className="font-medium text-sm">
											{date ? format(date, "EEEE, d") : "Pick a date"}
										</p>
									</div>
									<div className="grid gap-1.5 px-5 max-sm:grid-cols-2">
										{time_slots.map(({ time: timeSlot, available }) => (
											<Button
												key={timeSlot}
												variant={time === timeSlot ? "primary" : "outline"}
												size="sm"
												className="w-full"
												onClick={() => setTime(timeSlot)}
												disabled={!available}
											>
												{timeSlot}
											</Button>
										))}
									</div>
								</div>
							</ScrollArea>
						</div>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}

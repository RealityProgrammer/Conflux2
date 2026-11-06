import {type Dispatch, type HTMLAttributes, useState} from "react";
import {BsCalendar, BsChevronLeft, BsChevronRight} from "react-icons/bs";
import IconButton from "./IconButton.tsx";
import {formatDate} from "date-fns";
import {Popover} from "radix-ui";
import * as React from "react";

export interface DateTimeRange {
  start?: Date;
  end?: Date;
}

interface DateTimeRangePickerProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  value?: DateTimeRange;
  onChange?: (date: DateTimeRange) => void;
}

export default function DateTimeRangePicker({
  className = "",
  value: initialValue,
  onChange,
  ...props
}: DateTimeRangePickerProps) {
  const [value, setValue] = useState<DateTimeRange | undefined>(initialValue);

  return (
    <div
      {...props}
      className={`relative flex items-center justify-between ${className}`}
    >
      <p className="text-sm overflow-x-hidden whitespace-nowrap select-none">
        {!value || (!value.start && !value.end) ? (
          <p className="opacity-30">YYYY/MM/DD HH:mm:ss - YYYY/MM/DD HH:mm:ss</p>
        ) : !value.start && value.end ? (
          <p>Until {formatDate(value.end, "yyyy/MM/dd HH:mm:ss")}</p>
        ) : value.start && !value.end ? (
          <p>Since {formatDate(value.start, "yyyy/MM/dd HH:mm:ss")}</p>
        ) : (
          <p>{formatDate(value.start!, "yyyy/MM/dd HH:mm:ss")} - {formatDate(value.end!, "yyyy/MM/dd HH:mm:ss")}</p>
        )}
      </p>

      <div className="flex items-center pl-2 z-10 shrink-0">
        <Popover.Root>
          <Popover.Trigger asChild>
            <IconButton
              theme="default"
            >
              <BsCalendar className="size-4"/>
            </IconButton>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              side="bottom"
              sideOffset={5}
              className="w-lg border-2 border-gray-600 rounded-lg bg-gray-750 text-white shadow-lg flex flex-col"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <PickerContent value={value} setValue={setValue}/>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </div>
  );
}

function PickerContent({
  value,
  setValue,
}: { value: DateTimeRange | undefined; setValue: (setter: (previous: DateTimeRange) => DateTimeRange) => void; }) {
  const [mode, setMode] = useState<"start" | "end">("start");

  const activeDate = mode === "start" ? value?.start : value?.end;
  const [viewYear, setViewYear] = useState<number>(
    activeDate ? activeDate.getFullYear() : new Date().getFullYear()
  );
  const [viewMonth, setViewMonth] = useState<number>(
    activeDate ? activeDate.getMonth() : new Date().getMonth()
  );

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleDateSelect = (year: number, month: number, day: number) => {
    const newDate = new Date(year, month, day);
    // Preserve existing hours/minutes/seconds if they exist
    const existing = mode === "start" ? value?.start : value?.end;
    if (existing) {
      newDate.setHours(
        existing.getHours(),
        existing.getMinutes(),
        existing.getSeconds()
      );
    }

    setValue((prev) => ({
      start: mode === "start" ? newDate : prev?.start,
      end: mode === "end" ? newDate : prev?.end,
    }));
  };

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const calendarDays: {
    year: number;
    month: number;
    day: number;
    isCurrentMonth: boolean;
  }[] = [];

  // previous month surplus days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;

    calendarDays.push({
      year: prevYear,
      month: prevMonth,
      day: daysInPrevMonth - i,
      isCurrentMonth: false,
    });
  }

  // current month days
  for (let i = 1; i <= daysInCurrentMonth; i++) {
    calendarDays.push({
      year: viewYear,
      month: viewMonth,
      day: i,
      isCurrentMonth: true,
    });
  }

  // next month surplus days
  const totalCellsNeeded = 42;
  const remainingCells = totalCellsNeeded - calendarDays.length;
  for (let i = 1; i <= remainingCells; i++) {
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    calendarDays.push({
      year: nextYear,
      month: nextMonth,
      day: i,
      isCurrentMonth: false,
    });
  }

  const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const today = new Date();

  return (
    <>
      <header className="flex-none py-2.5 border-b-2 border-b-gray-600 flex flex-row gap-2 justify-center items-center">
        <button
          className={`cursor-pointer text-sm ${mode === "start" ? "font-bold" : ""}`}
          onClick={() => setMode("start")}
        >
          {value?.start ? formatDate(value.start, "yyyy/MM/dd HH:mm:ss") : "YYYY/MM/DD HH:mm:ss"}
        </button>

        <span>{" - "}</span>

        <button
          className={`cursor-pointer text-sm ${mode === "end" ? "font-bold" : ""}`}
          onClick={() => setMode("end")}
        >
          {value?.end ? formatDate(value.end, "yyyy/MM/dd HH:mm:ss") : "YYYY/MM/DD HH:mm:ss"}
        </button>
      </header>

      <section className="flex-1 min-h-0 flex flex-row gap-2 p-2">
        <div className="flex-1 h-full flex flex-col select-none">
          <div className="flex items-center justify-between mb-2 px-1">
            <IconButton theme="default" onClick={handlePrevMonth}>
              <BsChevronLeft className="size-4" />
            </IconButton>

            <span className="text-sm font-semibold text-white">
              {monthNames[viewMonth]} {viewYear}
            </span>

            <IconButton theme="default" onClick={handleNextMonth}>
              <BsChevronRight className="size-4" />
            </IconButton>
          </div>

          <div className="grid grid-cols-7 text-center text-sm font-medium text-gray-400 mb-1">
            {weekdays.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center text-sm flex-1">
            {calendarDays.map((item, idx) => {
              const isToday =
                item.day === today.getDate() &&
                item.month === today.getMonth() &&
                item.year === today.getFullYear();

              const selectedDate = mode === "start" ? value?.start : value?.end;
              const isSelected =
                selectedDate &&
                item.day === selectedDate.getDate() &&
                item.month === selectedDate.getMonth() &&
                item.year === selectedDate.getFullYear();

              if (!item.isCurrentMonth) {
                return (
                  <span
                    key={idx}
                    className="flex items-center justify-center text-gray-500 opacity-40 cursor-not-allowed py-1"
                  >
                    {item.day}
                  </span>
                );
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDateSelect(item.year, item.month, item.day)}
                  className={`flex items-center justify-center rounded-full size-8 cursor-pointer transition-colors text-white ${
                    isSelected
                      ? "bg-blue-600 font-bold"
                      : isToday
                        ? "border border-blue-400 font-semibold"
                        : "hover:bg-gray-700"
                  }`}
                >
                  {item.day}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 h-full bg-blue-500">

        </div>
      </section>
    </>
  );
}
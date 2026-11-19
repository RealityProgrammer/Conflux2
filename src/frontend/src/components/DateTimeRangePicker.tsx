import { type HTMLAttributes, useRef, useState } from "react";
import { BsCalendarFill, BsChevronLeft, BsChevronRight } from "react-icons/bs";
import IconButton from "./IconButton.tsx";
import { formatDate } from "date-fns";
import { Popover } from "radix-ui";

const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

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
  value: controlledValue,
  onChange,
  ...props
}: DateTimeRangePickerProps) {
  const isControlled = controlledValue !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState<DateTimeRange | undefined>(undefined);
  const value = isControlled ? controlledValue : uncontrolledValue;

  const setValue = (setter: (previous: DateTimeRange | undefined) => DateTimeRange | undefined) => {
    const next = setter(value);

    if (!isControlled) {
      setUncontrolledValue(next);
    }

    onChange?.(next ?? {});
  };

  return (
    <div {...props} className={`relative flex items-center justify-between ${className}`}>
      <p className="overflow-x-hidden text-sm whitespace-nowrap select-none">
        {/* the placeholder and value display */}
        {!value || (!value.start && !value.end) ? (
          <span className="opacity-30">YYYY/MM/DD HH:mm:ss - YYYY/MM/DD HH:mm:ss</span>
        ) : !value.start && value.end ? (
          <span>Until {formatDate(value.end, "yyyy/MM/dd HH:mm:ss")}</span>
        ) : value.start && !value.end ? (
          <span>Since {formatDate(value.start, "yyyy/MM/dd HH:mm:ss")}</span>
        ) : (
          <span>
            {formatDate(value.start!, "yyyy/MM/dd HH:mm:ss")} -{" "}
            {formatDate(value.end!, "yyyy/MM/dd HH:mm:ss")}
          </span>
        )}
      </p>

      <div className="z-10 flex shrink-0 items-center pl-2">
        <Popover.Root>
          <Popover.Trigger asChild>
            <IconButton theme="default">
              <BsCalendarFill className="size-4" />
            </IconButton>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              side="bottom"
              sideOffset={5}
              className="bg-gray-750 flex w-lg flex-col rounded-lg border-2 border-gray-600 text-white shadow-lg"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <PickerContent value={value} setValue={setValue} />
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
}: {
  value: DateTimeRange | undefined;
  setValue: (setter: (previous: DateTimeRange | undefined) => DateTimeRange | undefined) => void;
}) {
  const [mode, setMode] = useState<"start" | "end">("start");
  const [viewMode, setViewMode] = useState<"days" | "months" | "years">("days");

  const activeDate = mode === "start" ? value?.start : value?.end;
  const [viewYear, setViewYear] = useState<number>(
    activeDate ? activeDate.getFullYear() : new Date().getFullYear(),
  );
  const [viewMonth, setViewMonth] = useState<number>(
    activeDate ? activeDate.getMonth() : new Date().getMonth(),
  );

  const [yearPageStart, setYearPageStart] = useState<number>(
    Math.floor((activeDate ? activeDate.getFullYear() : new Date().getFullYear()) / 12) * 12,
  );

  const handlePrev = () => {
    if (viewMode === "days") {
      if (viewMonth === 0) {
        setViewMonth(11);
        setViewYear(viewYear - 1);
      } else {
        setViewMonth(viewMonth - 1);
      }
    } else if (viewMode === "years") {
      setYearPageStart(yearPageStart - 12);
    }
  };

  const handleNext = () => {
    if (viewMode === "days") {
      if (viewMonth === 11) {
        setViewMonth(0);
        setViewYear(viewYear + 1);
      } else {
        setViewMonth(viewMonth + 1);
      }
    } else if (viewMode === "years") {
      setYearPageStart(yearPageStart + 12);
    }
  };

  const isDateDisabled = (year: number, month: number, day: number) => {
    const candidateTime = new Date(year, month, day).setHours(0, 0, 0, 0);

    if (mode === "end" && value?.start) {
      const startTime = new Date(
        value.start.getFullYear(),
        value.start.getMonth(),
        value.start.getDate(),
      ).setHours(0, 0, 0, 0);
      return candidateTime < startTime;
    }

    if (mode === "start" && value?.end) {
      const endTime = new Date(value.end.getFullYear(), value.end.getMonth(), value.end.getDate()).setHours(
        0,
        0,
        0,
        0,
      );
      return candidateTime > endTime;
    }

    return false;
  };

  const isMonthDisabled = (monthIdx: number) => {
    if (mode === "end" && value?.start) {
      const startY = value.start.getFullYear();
      const startM = value.start.getMonth();
      if (viewYear < startY) return true;
      if (viewYear === startY && monthIdx < startM) return true;
    }

    if (mode === "start" && value?.end) {
      const endY = value.end.getFullYear();
      const endM = value.end.getMonth();
      if (viewYear > endY) return true;
      if (viewYear === endY && monthIdx > endM) return true;
    }

    return false;
  };

  const isYearDisabled = (yr: number) => {
    if (mode === "end" && value?.start) {
      const startY = value.start.getFullYear();
      if (yr < startY) return true;
    }

    if (mode === "start" && value?.end) {
      const endY = value.end.getFullYear();
      if (yr > endY) return true;
    }

    return false;
  };

  const handleDateSelect = (year: number, month: number, day: number) => {
    if (isDateDisabled(year, month, day)) return;

    const newDate = new Date(year, month, day);
    const existing = mode === "start" ? value?.start : value?.end;

    if (existing) {
      newDate.setHours(existing.getHours(), existing.getMinutes(), existing.getSeconds());
    }

    setValue((prev) => ({
      start: mode === "start" ? newDate : prev?.start,
      end: mode === "end" ? newDate : prev?.end,
    }));
  };

  const handleClearCurrent = () => {
    setValue((prev) => ({
      start: mode === "start" ? undefined : prev?.start,
      end: mode === "end" ? undefined : prev?.end,
    }));
  };

  const handleClearAll = () => {
    setValue(() => ({
      start: undefined,
      end: undefined,
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

  const today = new Date();

  return (
    <>
      <header className="flex flex-none flex-row items-center justify-center gap-2 border-b-2 border-b-gray-600 py-2.5">
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

      <section className="flex min-h-0 flex-1 flex-row gap-2 p-2">
        <div className="flex flex-1 flex-col select-none">
          {/* navigate left right */}
          <nav className="mb-2 flex items-center justify-between px-1">
            <IconButton theme="default" onClick={handlePrev} disabled={viewMode === "months"}>
              <BsChevronLeft className="size-4" />
            </IconButton>

            <div className="flex items-center gap-1 text-sm font-semibold text-white">
              {viewMode === "days" ? (
                <>
                  <button
                    type="button"
                    onClick={() => setViewMode("months")}
                    className="cursor-pointer rounded px-1.5 py-0.5 transition-colors hover:bg-gray-700"
                  >
                    {monthNames[viewMonth]}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setYearPageStart(Math.floor(viewYear / 12) * 12);
                      setViewMode("years");
                    }}
                    className="cursor-pointer rounded px-1.5 py-0.5 transition-colors hover:bg-gray-700"
                  >
                    {viewYear}
                  </button>
                </>
              ) : viewMode === "months" ? (
                <span className="text-gray-300">Select Month ({viewYear})</span>
              ) : viewMode === "years" ? (
                <span className="text-gray-300">
                  Select Year ({yearPageStart} - {yearPageStart + 11})
                </span>
              ) : null}
            </div>

            <IconButton theme="default" onClick={handleNext} disabled={viewMode === "months"}>
              <BsChevronRight className="size-4" />
            </IconButton>
          </nav>

          {viewMode === "days" ? (
            <>
              <div className="mb-1 grid grid-cols-7 text-center text-sm font-medium text-gray-400">
                {weekdays.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>

              <div className="grid flex-1 grid-cols-7 gap-y-1 text-center text-sm">
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

                  const isDisabled =
                    !item.isCurrentMonth || isDateDisabled(item.year, item.month, item.day);

                  if (isDisabled) {
                    return (
                      <span
                        key={idx}
                        className="flex cursor-not-allowed items-center justify-center py-1 text-gray-500 opacity-40"
                      >
                        {item.day}
                      </span>
                    );
                  }

                  if (!item.isCurrentMonth) {
                    return (
                      <span
                        key={idx}
                        className="flex cursor-not-allowed items-center justify-center py-1 text-gray-500 opacity-40"
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
                      className={`flex size-8 cursor-pointer items-center justify-center rounded-full text-white transition-colors ${
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
            </>
          ) : viewMode === "months" ? (
            <div className="grid flex-1 grid-cols-3 content-center gap-2 p-2">
              {monthNames.map((mName, mIdx) => {
                const isDisabled = isMonthDisabled(mIdx);

                return (
                  <button
                    key={mName}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      setViewMonth(mIdx);
                      setViewMode("days");
                    }}
                    className={`button-cursor rounded-lg py-2 text-sm font-semibold ${
                      viewMonth === mIdx ? "button-theme-primary" : "button-theme-primary2"
                    }`}
                  >
                    {mName.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          ) : viewMode === "years" ? (
            <div className="grid flex-1 grid-cols-3 content-center gap-2 p-2">
              {Array.from({ length: 12 }, (_, i) => yearPageStart + i).map((yr) => {
                const isDisabled = isYearDisabled(yr);

                return (
                  <button
                    key={yr}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      setViewYear(yr);
                      setViewMode("months");
                    }}
                    className={`button-cursor rounded-lg py-2 text-sm font-semibold ${
                      viewYear === yr ? "button-theme-primary" : "button-theme-primary2"
                    }`}
                  >
                    {yr}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col items-center justify-center">
          <TimeClockPicker value={value} setValue={setValue} mode={mode} />
        </div>
      </section>

      <footer className="flex flex-none items-center justify-end gap-2 border-t-2 border-t-gray-600 px-3 py-2 text-xs text-white">
        <button
          type="button"
          onClick={handleClearCurrent}
          className="button-theme-primary2 w-20 cursor-pointer rounded-md py-1.5"
        >
          Clear {mode === "start" ? "Start" : "End"}
        </button>

        <button
          type="button"
          onClick={handleClearAll}
          className="button-theme-primary2 w-20 cursor-pointer rounded-md py-1.5"
        >
          Clear All
        </button>
      </footer>
    </>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

function TimeClockPicker({
  value,
  setValue,
  mode,
}: {
  value: DateTimeRange | undefined;
  setValue: (setter: (previous: DateTimeRange | undefined) => DateTimeRange | undefined) => void;
  mode: "start" | "end";
}) {
  const clockRef = useRef<HTMLDivElement | null>(null);
  const activeDate = (mode === "start" ? value?.start : value?.end) || new Date();

  const hours = activeDate.getHours();
  const minutes = activeDate.getMinutes();
  const seconds = activeDate.getSeconds();

  // rotation degrees
  const secondDegrees = (seconds / 60) * 360;
  const minuteDegrees = (minutes / 60) * 360 + (seconds / 60) * 6;
  const hourDegrees = ((hours % 12) / 12) * 360 + (minutes / 60) * 30;

  // format
  const displayHours12 = hours % 12;
  const amPm = hours >= 12 ? "PM" : "AM";
  const timeString = `${pad(displayHours12)}:${pad(minutes)}:${pad(seconds)}`;

  const handleToggleAmPm = () => {
    const updatedDate = new Date(activeDate);
    const currentHours = updatedDate.getHours();

    if (currentHours >= 12) {
      updatedDate.setHours(currentHours - 12); // Switch to AM
    } else {
      updatedDate.setHours(currentHours + 12); // Switch to PM
    }

    setValue((prev) => ({
      start: mode === "start" ? updatedDate : prev?.start,
      end: mode === "end" ? updatedDate : prev?.end,
    }));
  };

  const updateTimeFromPointer = (clientX: number, clientY: number, type: "hour" | "minute" | "second") => {
    if (!clockRef.current) return;

    const rect = clockRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const radians = Math.atan2(clientY - centerY, clientX - centerX);
    let degrees = radians * (180 / Math.PI);

    // shift 0° from right (3 o'clock) to top (12 o'clock)
    degrees += 90;
    if (degrees < 0) degrees += 360;

    const updatedDate = new Date(activeDate);

    if (type === "second") {
      const newSeconds = Math.round((degrees / 360) * 60) % 60;
      updatedDate.setSeconds(newSeconds);
    } else if (type === "minute") {
      const newMinutes = Math.round((degrees / 360) * 60) % 60;
      updatedDate.setMinutes(newMinutes);
    } else if (type === "hour") {
      const isPM = updatedDate.getHours() >= 12;
      let newHour = Math.round((degrees / 360) * 12) % 12;
      if (isPM) newHour += 12;
      updatedDate.setHours(newHour);
    }

    setValue((prev) => ({
      start: mode === "start" ? updatedDate : prev?.start,
      end: mode === "end" ? updatedDate : prev?.end,
    }));
  };

  const createPointerHandler = (type: "hour" | "minute" | "second") => {
    // @ts-ignore
    return (e: PointerEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);
      updateTimeFromPointer(e.clientX, e.clientY, type);

      const onPointerMove = (moveEvent: PointerEvent) => {
        updateTimeFromPointer(moveEvent.clientX, moveEvent.clientY, type);
      };

      const onPointerUp = (upEvent: PointerEvent) => {
        target.releasePointerCapture(upEvent.pointerId);

        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    };
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center select-none">
      {/* clock face container */}
      <div
        ref={clockRef}
        className="relative flex size-40 touch-none items-center justify-center rounded-full bg-black/25 shadow-[var(--color-violet-500)_0_0_25px]"
      >
        {/* hour markers */}
        <div className="pointer-events-none absolute inset-0">
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = i * 30;
            return (
              <div
                key={i}
                className="absolute flex size-full items-start justify-center"
                style={{ transform: `rotate(${angle}deg)` }}
              >
                <div className="mt-1.5 h-2 w-0.5 bg-white/60" />
              </div>
            );
          })}
        </div>

        {/* hour hand */}
        <div
          onPointerDown={createPointerHandler("hour")}
          className="absolute bottom-1/2 left-1/2 z-20 h-10 w-1.75 origin-bottom -translate-x-1/2 cursor-pointer rounded-full bg-white transition-colors hover:bg-blue-200"
          style={{ transform: `rotate(${hourDegrees}deg)` }}
        />

        {/* minute hand */}
        <div
          onPointerDown={createPointerHandler("minute")}
          className="absolute bottom-1/2 left-1/2 z-20 h-14 w-1.25 origin-bottom -translate-x-1/2 cursor-pointer rounded-full bg-white/80 transition-colors hover:bg-blue-200"
          style={{ transform: `rotate(${minuteDegrees}deg)` }}
        />

        {/* second hand */}
        <div
          onPointerDown={createPointerHandler("second")}
          className="absolute bottom-1/2 left-1/2 z-20 h-18 w-0.75 origin-bottom -translate-x-1/2 cursor-pointer rounded-full bg-red-400 transition-colors hover:bg-red-200"
          style={{ transform: `rotate(${secondDegrees}deg)` }}
        />

        {/* center pivot */}
        <div className="pointer-events-none absolute z-30 size-2.25 rounded-full bg-white shadow-md" />
      </div>

      {/* Digital Time Readout */}
      <div className="mt-6 text-center text-white">
        <span className="font-mono text-lg font-semibold tracking-wider">{timeString}</span>

        <button
          type="button"
          onClick={handleToggleAmPm}
          className="ml-2 cursor-pointer rounded bg-gray-800 px-2 py-0.5 text-xs font-bold text-gray-400 transition-colors hover:text-white"
          title="Click to toggle AM/PM"
        >
          {amPm}
        </button>
      </div>
    </div>
  );
}

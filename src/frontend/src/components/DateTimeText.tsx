import {Tooltip} from "radix-ui";
import {type HTMLAttributes, useSyncExternalStore} from "react";
import {intervalToDuration, formatDuration, type DurationUnit} from "date-fns";

const ONE_WEEK_SECONDS = 7 * 24 * 60 * 60;

// shared ticking clock
let nowMs = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);

  if (timer === null) {
    nowMs = Date.now();
    timer = setInterval(() => {
      nowMs = Date.now();
      for (const l of listeners) l();
    }, 1000);
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

function formatRelative(value: Date, now: number): string {
  // calculate the time difference, return the raw date time if the difference is >= 1 week
  const diffSec = Math.floor((now - value.getTime()) / 1000);
  const abs = Math.abs(diffSec);

  if (abs >= ONE_WEEK_SECONDS) return value.toLocaleString();

  const past = diffSec >= 0;
  const duration = intervalToDuration(
    past
      ? { start: value, end: new Date(now) }
      : { start: new Date(now), end: value },
  );

  const format: DurationUnit[] =
    abs < 60 ? ["seconds"] : ["days", "hours", "minutes"];

  const text =
    formatDuration(duration, { format, delimiter: " " }) || "0 seconds";

  return past ? `${text} ago` : `in ${text}`;
}

export interface DateTimeTextProps extends HTMLAttributes<HTMLSpanElement> {
  value: Date;
}

export default function DateTimeText({
  value,
  ...props
}: DateTimeTextProps) {
  const getSnapshot = () => formatRelative(value, nowMs);
  const label = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return (
    <Tooltip.Provider delayDuration={500}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span {...props}>{label}</span>
        </Tooltip.Trigger>

        <Tooltip.Portal>
          <Tooltip.Content
            className="select-none rounded-md bg-gray-500 px-3 py-2.5 leading-none shadow-xl text-white"
            sideOffset={5}
            side="top"
          >
            {value.toUTCString()}
            <Tooltip.Arrow className="fill-gray-500" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}
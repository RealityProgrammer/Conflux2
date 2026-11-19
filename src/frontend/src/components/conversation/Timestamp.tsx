import { formatDate } from "date-fns";
import type { HTMLAttributes } from "react";

interface TimestampProps extends HTMLAttributes<HTMLSpanElement> {
  date: Date;
  formatString?: string;
}

export default function Timestamp({
  date,
  formatString = "yyyy/MM/dd HH:mm:ss.SSS",
  className,
  ...props
}: TimestampProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-sm text-white ${className}`}
      {...props}
    >
      {formatDate(date, formatString)}
    </span>
  );
}

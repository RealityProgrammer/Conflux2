import {TimelineItem} from "./TimelineItem.ts";
import type {TimelineContext} from "./TimelineContext.ts";
import type {ReactNode} from "react";
import {Separator} from "radix-ui";
import {formatDate} from "date-fns";

type DateSeparatorProps = {
  date: Date;
}

export class DateSeparator extends TimelineItem<DateSeparatorProps> {
  constructor(data: DateSeparatorProps) {
    super(data);
  }

  measureHeight(context: TimelineContext): number {
    return 20;
  }

  render(measuredHeight: number, context: TimelineContext): ReactNode {
    return (
      <div className="w-full flex flex-row justify-center items-center gap-2 px-3">
        <Separator.Root decorative className="flex-1 horizontal-separator my-3"/>

        <span className="flex-none text-xs font-semibold text-gray-400">{formatDate(this.data.date, "PPP")}</span>

        <Separator.Root decorative className="flex-1 horizontal-separator my-3"/>
      </div>
    )
  }
}
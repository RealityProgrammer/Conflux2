import type {ReactNode} from "react";
import type {TimelineContext} from "./TimelineContext.ts";

export abstract class TimelineItem<T = any> {
  protected constructor(public data: T) {
  }

  abstract measureHeight(context: TimelineContext): number;

  abstract render(measuredHeight: number, context: TimelineContext): ReactNode;
}
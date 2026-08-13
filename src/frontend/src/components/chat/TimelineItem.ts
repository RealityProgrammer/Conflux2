import type {ReactNode} from "react";
import type {TimelineContext} from "./TimelineContext.ts";

export abstract class TimelineItem<T = any> {
  abstract readonly type: string;

  protected constructor(public data: T) {
  }

  abstract measureHeight(displayWidth: number, context: TimelineContext): number;

  abstract render(measuredHeight: number, context: TimelineContext): ReactNode;
}
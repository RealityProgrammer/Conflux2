import {TimelineItem} from "./TimelineItem.ts";
import {type TimelineMessageSenderDto} from "../../api/types.ts";
import type {TimelineContext} from "./TimelineContext.ts";
import type {ReactNode} from "react";
import {BsTelephoneMinusFill} from "react-icons/bs";
import DateTimeText from "../DateTimeText.tsx";
import {formatReadableTimeSpan} from "../../utils/formatting.ts";

type CallEndItemProps = {
  id: string;
  sender: TimelineMessageSenderDto;
  createdAt: Date;
  duration: string;
};

export class CallEndItem extends TimelineItem<CallEndItemProps> {
  constructor(data: CallEndItemProps) {
    super(data);
  }

  getKey(): string {
    return `call-message_${this.data.id}`;
  }

  render(_context: TimelineContext): ReactNode {
    return (
      <div className="pt-1 text-sm">
        <div className="py-1 px-4 hover-highlight">
          <BsTelephoneMinusFill className="size-6 fill-red-600 inline mr-4"/>
          <span className="font-semibold">{this.data.sender.displayName ?? "???"}</span>
          <span>{" "}ended a call lasted {formatReadableTimeSpan(this.data.duration)}.</span>

          <DateTimeText value={this.data.createdAt} className="ml-2 select-none font-normal text-xs text-gray-400"/>
        </div>
      </div>
    );
  }
}
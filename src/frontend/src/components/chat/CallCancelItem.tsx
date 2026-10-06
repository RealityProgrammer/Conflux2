import {TimelineItem} from "./TimelineItem.ts";
import {type TimelineMessageSenderDto} from "../../api/types.ts";
import type {TimelineContext} from "./TimelineContext.ts";
import type {ReactNode} from "react";
import {BsTelephoneMinusFill} from "react-icons/bs";
import DateTimeText from "../DateTimeText.tsx";

type CallCancelItemProps = {
  id: string;
  sender: TimelineMessageSenderDto;
  createdAt: Date;
};

export class CallCancelItem extends TimelineItem<CallCancelItemProps> {
  constructor(data: CallCancelItemProps) {
    super(data);
  }

  getKey(): string {
    return `call-message_${this.data.id}`;
  }

  render(_context: TimelineContext): ReactNode {
    return (
      <div className="pt-1 text-sm">
        <div className="py-1 px-4 hover-highlight">
          <BsTelephoneMinusFill className="size-6 fill-red-400 inline mr-4"/>
          <span className="font-semibold">{this.data.sender.displayName ?? "???"}</span>
          <span>{" "}canceled a call.</span>

          <DateTimeText value={this.data.createdAt} className="ml-2 select-none font-normal text-xs text-gray-400"/>
        </div>
      </div>
    );
  }
}
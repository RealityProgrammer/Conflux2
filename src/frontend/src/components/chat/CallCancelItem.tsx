import { TimelineItem } from "./TimelineItem.ts";
import { type TimelineMessageSenderDto } from "../../api/types.ts";
import type { TimelineContext } from "./TimelineContext.ts";
import type { ReactNode } from "react";
import { BsTelephoneMinusFill } from "react-icons/bs";
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
        <div className="hover-highlight px-4 py-1">
          <BsTelephoneMinusFill className="mr-4 inline size-6 fill-red-400" />
          <span className="font-semibold">
            {this.data.sender.displayName ?? "???"}
          </span>
          <span> canceled a call.</span>

          <DateTimeText
            value={this.data.createdAt}
            className="ml-2 text-xs font-normal text-gray-400 select-none"
          />
        </div>
      </div>
    );
  }
}

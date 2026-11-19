import { TimelineItem } from "./TimelineItem.ts";
import { type TimelineMessageSenderDto } from "../../api/types.ts";
import type { TimelineContext } from "./TimelineContext.ts";
import type { ReactNode } from "react";
import { BsTelephoneOutboundFill } from "react-icons/bs";
import DateTimeText from "../DateTimeText.tsx";

type CallStartItemProps = {
  id: string;
  sender: TimelineMessageSenderDto;
  createdAt: Date;
};

export class CallStartItem extends TimelineItem<CallStartItemProps> {
  constructor(data: CallStartItemProps) {
    super(data);
  }

  getKey(): string {
    return `call-message_${this.data.id}`;
  }

  render(_context: TimelineContext): ReactNode {
    return (
      <div className="pt-1 text-sm">
        <div className="hover-highlight px-4 py-1">
          <BsTelephoneOutboundFill className="mr-4 inline size-6 fill-green-500" />
          <span className="font-semibold">{this.data.sender.displayName ?? "???"}</span>
          <span> started a call.</span>

          <DateTimeText
            value={this.data.createdAt}
            className="ml-2 text-xs font-normal text-gray-400 select-none"
          />
        </div>
      </div>
    );
  }
}

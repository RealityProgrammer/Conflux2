import {TimelineItem} from "./TimelineItem.ts";
import {type TimelineMessageSenderDto} from "../../api/types.ts";
import type {TimelineContext} from "./TimelineContext.ts";
import type {ReactNode} from "react";
import {BsTelephoneOutboundFill} from "react-icons/bs";
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
        <div className="py-1 px-4 hover-highlight">
          <BsTelephoneOutboundFill className="size-6 fill-green-500 inline mr-4"/>
          <span className="font-semibold">{this.data.sender.displayName ?? "???"}</span>
          <span>{" "} started a call.</span>

          <DateTimeText value={this.data.createdAt} className="ml-2 select-none font-normal text-xs text-gray-400"/>
        </div>
      </div>
    );
  }
}
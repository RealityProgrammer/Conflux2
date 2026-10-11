import {TimelineItem} from "./TimelineItem.ts";
import {type TimelineMessageSenderDto} from "../../api/types.ts";
import type {TimelineContext} from "./TimelineContext.ts";
import type {ReactNode} from "react";
import {BsTelephoneXFill} from "react-icons/bs";
import DateTimeText from "../DateTimeText.tsx";

type CallRejectItemProps = {
  id: string;
  sender: TimelineMessageSenderDto;
  createdAt: Date;
};

export class CallRejectItem extends TimelineItem<CallRejectItemProps> {
  constructor(data: CallRejectItemProps) {
    super(data);
  }

  getKey(): string {
    return `call-message_${this.data.id}`;
  }

  render(_context: TimelineContext): ReactNode {
    return (
      <div className="pt-1 text-sm">
        <div className="py-1 px-4 hover-highlight">
          <BsTelephoneXFill className="size-6 fill-red-600 inline mr-4"/>
          <span className="font-semibold">{this.data.sender.displayName ?? "???"}</span>
          <span>{" "}rejected a call.</span>

          <DateTimeText value={this.data.createdAt} className="ml-2 select-none font-normal text-xs text-gray-400"/>
        </div>
      </div>
    );
  }
}
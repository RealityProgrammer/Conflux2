import {TimelineItem} from "./TimelineItem.ts";
import {type TimelineMessageSenderDto} from "../../api/types.ts";
import type {TimelineContext} from "./TimelineContext.ts";
import type {ReactNode} from "react";
import {CallEventType} from "../../api/schema.ts";
import {BsTelephoneMinusFill, BsTelephoneOutboundFill, BsTelephoneXFill} from "react-icons/bs";
import DateTimeText from "../DateTimeText.tsx";

type CallMessageItemProps = {
  id: string;
  sender: TimelineMessageSenderDto;
  type: CallEventType;
  duration?: string | null;
  createdAt: Date;
};

const ELEMENT_FACTORIES = {
  [CallEventType.Start]: (displayName: string) => {
    return (
      <>
        <BsTelephoneOutboundFill className="size-6 fill-green-500 inline mr-4"/>
        <span className="font-semibold">{displayName}</span>
        <span>{" "} started a call.</span>
      </>
    );
  },
  [CallEventType.Canceled]: (displayName: string) => {
    return (
      <>
        <BsTelephoneMinusFill className="size-6 fill-red-400 inline mr-4"/>
        <span className="font-semibold">{displayName}</span>
        <span>{" "}canceled a call.</span>
      </>
    );
  },
  [CallEventType.Denied]: (displayName: string) => {
    return (
      <>
        <BsTelephoneXFill className="size-6 fill-red-600 inline mr-4"/>
        <span className="font-semibold">{displayName}</span>
        <span>{" "}denied a call.</span>
      </>
    );
  },
  [CallEventType.End]: (displayName: string) => {
    return (
      <>
        <BsTelephoneMinusFill className="size-6 fill-red-600 inline mr-4"/>
        <span className="font-semibold">{displayName}</span>
        <span>{" "}ended a call.</span>
      </>
    );
  },
}

export class CallMessageItem extends TimelineItem<CallMessageItemProps> {
  constructor(data: CallMessageItemProps) {
    super(data);
  }

  getKey(): string {
    return `call-message_${this.data.id}`;
  }

  render(_context: TimelineContext): ReactNode {
    return (
      <div className="pt-1 text-sm">
        <div className="py-1 px-4 hover-highlight">
          {ELEMENT_FACTORIES[this.data.type](this.data.sender.displayName ?? "???")}

          <DateTimeText value={this.data.createdAt} className="ml-2 select-none font-normal text-xs text-gray-400"/>
        </div>
      </div>
    );
  }
}
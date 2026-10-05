import {TimelineItem} from "./TimelineItem.ts";
import type {TimelineContext} from "./TimelineContext.ts";
import {type ReactNode} from "react";
import UserAvatar from "../UserAvatar.tsx";
import {BsPinAngleFill} from "react-icons/bs";

type PinMessageProps = {
  id: string;
  senderDisplayName: string;
  senderAvatarSrc: string | undefined;
  action: "pin" | "unpin";
}

export class PinMessageItem extends TimelineItem<PinMessageProps> {
  constructor(data: PinMessageProps) {
    super(data);
  }

  getKey(): string {
    return `${this.data.action}-message_${this.data.id}`;
  }

  render(_context: TimelineContext): ReactNode {
    return (
      <div className="pt-1 text-sm">
        <div className="py-1 px-4 hover-highlight flex flex-row items-center">
          <UserAvatar
            src={this.data.senderAvatarSrc}
            alt={`Avatar of ${this.data.senderDisplayName}`}
            className="size-8 mr-4"
          />

          <span className="select-none">
            <span className="font-semibold">{this.data.senderDisplayName}</span>
            <span>{" "} {this.data.action}ned a message </span>
            <BsPinAngleFill className="size-5 inline"/>
          </span>
        </div>
      </div>
    )
  }
}
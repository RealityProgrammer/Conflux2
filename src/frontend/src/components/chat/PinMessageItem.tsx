import {TimelineItem} from "./TimelineItem.ts";
import type {TimelineContext} from "./TimelineContext.ts";
import {type ReactNode} from "react";
import {BsPinAngleFill} from "react-icons/bs";
import {Avatar} from "../Avatar.tsx";

type PinMessageProps = {
  id: string;
  senderDisplayName: string;
  senderId?: string;
  senderAvatarVersion?: number;
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
          <Avatar.User
            userId={this.data.senderId}
            version={this.data.senderAvatarVersion}
            alt={`Avatar of ${this.data.senderDisplayName}`}
            className="size-8 mr-4 rounded-full"
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
import {TimelineItem} from "./TimelineItem.ts";
import type {TimelineContext} from "./TimelineContext.ts";
import {type ReactNode} from "react";
import type {MessageInput} from "./ChatInput.tsx";
import MessageContent from "./MessageContent.tsx";
import IconButton from "../IconButton.tsx";
import {FaRepeat, FaTrashCan} from "react-icons/fa6";

type SendingMessageProps = {
  operationId: string;
  input: MessageInput;
  error: boolean;
}

export class SendingMessage extends TimelineItem<SendingMessageProps> {
  constructor(data: SendingMessageProps) {
    super(data);
  }

  getKey(): string {
    return `sending-msg_${this.data.operationId}`;
  }

  render(context: TimelineContext): ReactNode {


    return (
      <div className="hover-highlight">
        <div className={`group px-2 flex flex-row justify-center items-start gap-3 ${this.data.error ? "bg-red-500/40" : ""}`}>
          {this.data.error ? (
            <section className="flex-none flex flex-row justify-end items-start w-10 mt-1 invisible group-hover:visible gap-1">
              <IconButton theme="default" onClick={() => context.actions.retrySendingOperation(this.data.operationId)}>
                <FaRepeat className="size-4"/>
              </IconButton>

              <IconButton theme="default" onClick={() => context.actions.removeSendingOperation(this.data.operationId)}>
                <FaTrashCan className="size-4"/>
              </IconButton>
            </section>
          ) : (
            <div className="w-10"></div>
          )}

          <MessageContent
            content={this.data.input.messageBody}
            className={`flex-1 ${this.data.error ? "text-gray-300" : "animate-pulse"}`}
          />
        </div>
      </div>
    )
  }
}
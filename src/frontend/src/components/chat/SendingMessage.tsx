import {TimelineItem} from "./TimelineItem.ts";
import type {TimelineContext} from "./TimelineContext.ts";
import {type ReactNode} from "react";
import MessageBody from "./MessageBody.tsx";
import IconButton from "../IconButton.tsx";
import {FaRepeat, FaTrashCan} from "react-icons/fa6";
import type {MessageOperationError, MessageSendInput} from "../../store/useMessageOperationsStore.ts";
import {BsExclamationTriangle} from "react-icons/bs";
import {Tooltip} from "radix-ui";

type SendingMessageProps = {
  idempotencyKey: string;
  input: MessageSendInput;
  error?: MessageOperationError;
}

export class SendingMessage extends TimelineItem<SendingMessageProps> {
  constructor(data: SendingMessageProps) {
    super(data);
  }

  getKey(): string {
    return `sending-msg_${this.data.idempotencyKey}`;
  }

  render(context: TimelineContext): ReactNode {
    const trimmedBody = this.data.input.body?.trim() ?? null;

    return (
      <div className="hover-highlight">
        <div className={`relative group px-2 py-1 flex flex-row justify-center items-start gap-3 ${this.data.error ? "bg-red-500/40" : ""}`}>
          <div className={`ml-13 flex-1 ${this.data.error ? "text-gray-300" : "animate-pulse"}`}>
            {trimmedBody && trimmedBody.length > 0 ? (
              <>
                <MessageBody
                  content={this.data.input.body}
                />

                {this.data.input.attachments && this.data.input.attachments.length > 0 && (
                  <p className="text-xs">With {this.data.input.attachments.length} attachment(s).</p>
                )}
              </>
            ) : (
              <p className="text-xs">{this.data.input.attachments.length} attachment(s).</p>
            )}
          </div>

          {this.data.error && (
            <section className="hidden group-hover:flex flex-row items-center gap-2 absolute right-2 top-0 -translate-y-1/2 bg-gray-600 border-2 border-gray-500 rounded-md shadow-md px-2 py-1">
              <Tooltip.Root>
                <Tooltip.Trigger>
                  <BsExclamationTriangle className="flex-1 size-5"/>
                </Tooltip.Trigger>

                <Tooltip.Portal>
                  <Tooltip.Content
                    side="top"
                    align="center"
                    sideOffset={4}
                    className="rounded-md shadow-md bg-gray-750 text-white p-2 border-2 border-gray-600 text-sm"
                  >
                    {this.data.error.type === "network" ? (
                      "Network issue happened."
                    ) : this.data.error.type === "validation" ? (() => {
                      const messages = this.data.error.messages;

                      return messages.length === 1 ? (
                        <p>{messages[0]}</p>
                      ) : (
                        <ol className="list-inside list-decimal space-y-2">
                          {messages.map(errorMessage => (
                            <li>{errorMessage}</li>
                          ))}
                        </ol>
                      )
                    })() : (
                      "Unknown error happened."
                    )}
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>

              <IconButton theme="default" className="flex-1" onClick={() => context.actions.retrySendingOperation(this.data.idempotencyKey)}>
                <FaRepeat className="size-5"/>
              </IconButton>

              <IconButton theme="danger" className="flex-1" onClick={() => context.actions.removeSendingOperation(this.data.idempotencyKey)}>
                <FaTrashCan className="size-5"/>
              </IconButton>
            </section>
          )}
        </div>
      </div>
    )
  }
}
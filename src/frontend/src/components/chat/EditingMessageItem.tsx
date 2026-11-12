import type {TimelineMessageDto} from "../../api/types.ts";
import type {MessageEditInput, MessageOperationError} from "../../store/useMessageOperationsStore.ts";
import {TimelineItem} from "./TimelineItem.ts";
import type {TimelineContext} from "./TimelineContext.ts";
import type {ReactNode} from "react";
import {Tooltip} from "radix-ui";
import {MessageRow} from "./MessageRow.tsx";
import MessageBody from "./MessageBody.tsx";
import MessageAttachments from "./MessageAttachments.tsx";
import IconButton from "../IconButton.tsx";
import {FaRepeat, FaTrashCan} from "react-icons/fa6";
import {BsExclamationTriangle} from "react-icons/bs";

type EditingMessageItemProps = {
  message: TimelineMessageDto;
  input: MessageEditInput;
  error?: MessageOperationError;
  showHeader: boolean;
}

export class EditingMessageItem extends TimelineItem<EditingMessageItemProps> {
  constructor(data: EditingMessageItemProps) {
    super(data);
  }

  getKey(): string {
    return `edit-message_${this.data.message.id}`;
  }

  render(context: TimelineContext): ReactNode {
    return (
      <View
        key={`edit-message-${this.data.message.id}`}
        data={this.data}
        showHeader={this.data.showHeader}
        context={context}
      />
    );
  }
}

interface ViewProps {
  data: EditingMessageItemProps;
  showHeader: boolean;
  context: TimelineContext;
}

function View({
  data,
  showHeader,
  context,
}: ViewProps) {
  const message = data.message;

  return (
    <div className="group relative hover-highlight flex flex-col pt-0.5">
      <div className={`px-2 ${data.error ? "bg-red-500/40" : ""}`}>
        {message.replyTo && (
          <MessageRow.Reply
            messageId={message.replyTo.id}
            senderDisplayName={message.replyTo.sender?.displayName ?? "???"}
            attachmentCount={message.replyTo.attachmentCount}
            body={message.replyTo.body}
          />
        )}

        <MessageRow.Row
          header={showHeader ? {
            senderId: message.sender?.id,
            senderAvatarVersion: message.sender!.avatarVersion,
            avatarAlt: message.sender ? `Avatar of ${message.sender.displayName ?? "???"}` : undefined,
            senderDisplayName: message.sender?.displayName ?? "???",
          } : undefined}
          date={new Date(message.createdAt)}
        >
          <div className={`flex-1 space-y-1 text-white`}>
            <MessageBody
              content={data.input.body === undefined ? message.body : data.input.body}
              className="animate-pulse"
            />

            {message.attachments && message.attachments.length > 0 && (
              <MessageAttachments
                attachments={message.attachments}
                onAttachmentClick={() => {}}
              />
            )}

            {(() => {
              const numRemove = data.input.removeAttachmentIds?.length ?? 0;
              const numAdd = data.input.addAttachments?.length ?? 0;

              if (numRemove > 0 && numAdd > 0) {
                return <p className="text-xs">With {numRemove} attachment(s) removed and {numAdd} new attachments(s).</p>;
              } else if (numRemove > 0 && numAdd === 0) {
                return <p className="text-xs">With {numRemove} attachment(s) removed.</p>;
              } else if (numRemove === 0 && numAdd > 0) {
                return <p className="text-xs">With {numAdd} new attachment(s).</p>;
              } else return null;
            })()}
          </div>
        </MessageRow.Row>
      </div>

      {data.error && (
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
                {data.error.type === "network" ? (
                  "Network issue happened."
                ) : data.error.type === "validation" ? (() => {
                  const messages = Object.entries(data.error.fields).filter(p => !!p[1] && p[1].length > 0).flatMap(p => p[1]);

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

          <IconButton theme="default" className="size-5" onClick={() => context.actions.retryEditOperation(message.id)}>
            <FaRepeat className="size-5 ml-auto"/>
          </IconButton>

          <IconButton theme="danger" className="size-5" onClick={() => context.actions.removeEditOperation(message.id)}>
            <FaTrashCan className="size-5 ml-auto"/>
          </IconButton>
        </section>
      )}
    </div>
  );
}
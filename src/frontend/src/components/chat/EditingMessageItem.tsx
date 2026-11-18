import type { TimelineMessageDto } from "../../api/types.ts";
import type {
  MessageEditInput,
  MessageOperationError,
} from "../../store/useMessageOperationsStore.ts";
import { TimelineItem } from "./TimelineItem.ts";
import type { TimelineContext } from "./TimelineContext.ts";
import type { ReactNode } from "react";
import { MessageRow } from "./MessageRow.tsx";
import MessageBody from "./MessageBody.tsx";
import MessageAttachments from "./MessageAttachments.tsx";
import IconButton from "../IconButton.tsx";
import { FaPencil, FaRepeat, FaTrashCan } from "react-icons/fa6";
import MessageOperationErrorDisplay from "./MessageOperationErrorDisplay.tsx";
import ErrorText from "../ErrorText.tsx";

type EditingMessageItemProps = {
  message: TimelineMessageDto;
  input: MessageEditInput;
  error?: MessageOperationError;
  showHeader: boolean;
};

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

function View({ data, showHeader, context }: ViewProps) {
  const message = data.message;

  return (
    <div
      className={`group relative pt-0.5 ${data.error ? "bg-red-500/40 hover:bg-red-500/50" : ""}`}
    >
      <div className={`px-2`}>
        {message.replyTo && (
          <MessageRow.Reply
            messageId={message.replyTo.id}
            senderDisplayName={message.replyTo.sender?.displayName ?? "???"}
            attachmentCount={message.replyTo.attachmentsCount}
            body={message.replyTo.body}
          />
        )}

        <MessageRow.Row
          header={
            showHeader
              ? {
                  senderId: message.sender?.id,
                  senderAvatarVersion: message.sender!.avatarVersion,
                  avatarAlt: message.sender
                    ? `Avatar of ${message.sender.displayName ?? "???"}`
                    : undefined,
                  senderDisplayName: message.sender?.displayName ?? "???",
                }
              : undefined
          }
          date={new Date(message.createdAt)}
        >
          <div className={`flex-1 text-white`}>
            <MessageBody
              content={
                data.input.body === undefined ? message.body : data.input.body
              }
              className="text-gray-400"
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
                return (
                  <p className="text-xs">
                    With {numRemove} attachment(s) removed and {numAdd} new
                    attachments(s).
                  </p>
                );
              } else if (numRemove > 0 && numAdd === 0) {
                return (
                  <p className="text-xs">
                    With {numRemove} attachment(s) removed.
                  </p>
                );
              } else if (numRemove === 0 && numAdd > 0) {
                return (
                  <p className="text-xs">With {numAdd} new attachment(s).</p>
                );
              } else return null;
            })()}

            {(() => {
              const error = data.error;

              if (!error) return null;

              switch (error.type) {
                case "network":
                  return <ErrorText>A network error occurred.</ErrorText>;

                case "forbidden":
                  return (
                    <p className="mt-1 text-xs font-bold text-red-500">
                      You are not allowed to send message in this conversation.
                    </p>
                  );

                case "server":
                  return (
                    <p className="mt-1 text-xs font-bold text-red-500">
                      An internal server error occurred.
                    </p>
                  );

                case "validation":
                  return (
                    <p className="mt-1 text-xs font-bold text-red-500">
                      {error.messages[0]}
                    </p>
                  );

                default:
                  return (
                    <p className="mt-1 text-xs font-bold text-red-500">
                      Unknown error occurred.
                    </p>
                  );
              }
            })()}
          </div>
        </MessageRow.Row>
      </div>

      {data.error && (
        <section className="absolute top-0 right-2 hidden -translate-y-1/2 flex-row items-center gap-2 rounded-md border-2 border-gray-500 bg-gray-600 px-2 py-1 shadow-md group-hover:flex">
          <IconButton
            theme="default"
            className="size-5"
            onClick={() => context.actions.onMessageEditTrigger(message)}
          >
            <FaPencil className="ml-auto size-5" />
          </IconButton>

          <IconButton
            theme="default"
            className="size-5"
            onClick={() => context.actions.retryEditOperation(message.id)}
          >
            <FaRepeat className="ml-auto size-5" />
          </IconButton>

          <IconButton
            theme="danger"
            className="size-5"
            onClick={() => context.actions.removeEditOperation(message.id)}
          >
            <FaTrashCan className="ml-auto size-5" />
          </IconButton>
        </section>
      )}
    </div>
  );
}

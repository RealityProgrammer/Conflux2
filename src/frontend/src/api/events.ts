import type {MessageDto} from "./responses.ts";

export type FriendRequestReceivedEvent = {
    senderUserId: string;
}

export type FriendRequestCanceledEvent = {
    senderUserId: string;
}

export type FriendRequestAcceptedEvent = {
    acceptorUserId: string;
}

export type FriendRequestRejectedEvent = {
    rejecterUserId: string;
}

export type UnfriendedEvent = {
    invokerUserId: string;
}

export type MessageReceivedEvent = {
    message: MessageDto;
}

export type MessageEditedEvent = {
    message: MessageDto;
}

export type UpdateDmConversationListEvent = {
    channelId: string;
    unreadCount: number;
}
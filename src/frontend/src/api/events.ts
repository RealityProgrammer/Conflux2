import type {MessageDto, ServerRoleDto} from "./types.ts";

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

export type ServerRoleCreatedEvent = {
  serverId: string;
  role: ServerRoleDto;
}

export type ServerRoleUpdatedEvent = {
  serverId: string;
}
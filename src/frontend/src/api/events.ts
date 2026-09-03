import type {ChannelCategoryIdentityDto, MessageDto, ServerChannelIdentityDto, ServerRoleDto} from "./types.ts";

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

export type ServerRoleDeletedEvent = {
  serverId: string;
  roleId: string;
}

export type ServerChannelCategoryCreatedEvent = {
  serverId: string;
  categoryIdentity: ChannelCategoryIdentityDto;
}

export type ServerChannelCategoryDeletedEvent = {
  serverId: string;
  categoryId: string;
}

export type ServerChannelCreatedEvent = {
  serverId: string;
  channel: ServerChannelIdentityDto;
}

export type ServerChannelDeletedEvent = {
  serverId: string;
  channelId: string;
}
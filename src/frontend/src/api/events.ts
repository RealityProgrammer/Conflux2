import type {
  ChannelCategoryIdentityDto, TimelineMessageDto, ServerChannelIdentityDto, ServerRoleDto, UserIdentityProfileDto,
  EditedMessageDto, EmojiDto, MentionSource,
} from "./types.ts";
import {type PresenceStatus} from "../graphql/types.ts";

export type FriendRequestReceivedEvent = {
  requestId: string;
  senderUserId: string;
}

export type FriendRequestCanceledEvent = {
  requestId: string;
  senderUserId: string;
}

export type FriendRequestAcceptedEvent = {
  requestId: string;
  acceptorUserId: string;
}

export type FriendRequestRejectedEvent = {
  requestId: string;
  rejecterUserId: string;
}

export type UnfriendedEvent = {
  invokerUserId: string;
}

export type MessageReceivedEvent = {
  message: TimelineMessageDto;
}

export type MessageEditedEvent = {
  messageId: string;
  message: EditedMessageDto;
}

export type MessageDeletedEvent = {
  messageId: string;
}

export type UpdateDmConversationListEvent = {
  channelId: string;
}

export type ServerRoleCreatedEvent = {
  serverId: string;
  role: ServerRoleDto;
}

export type ServerDefaultRoleUpdatedEvent = {
  serverId: string;
}

export type ServerRoleUpdatedEvent = {
  serverId: string;
  roleId: string;
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

export type MemberRolesUpdatedEvent = {
  serverId: string;
  memberUserId: string;
  memberId: string;
};

export type ServerMemberWarnedEvent = {
  serverId: string;
  warnedMemberUserId: string;
  warnedMemberId: string;
};

export type ServerMemberKickedEvent = {
  serverId: string;
  kickedMemberUserId: string;
  kickedMemberId: string;
};

export type ServerMemberBannedEvent = {
  serverId: string;
  bannedMemberUserId: string;
  bannedMemberId: string;
};

export type ServerMemberUnbannedEvent = {
  serverId: string;
  bannedMemberUserId: string;
  bannedMemberId: string;
};

export type TypingUserEvent = {
  userId: string;
  displayName: string;
  avatarRevision: number | null;
}

export type UserPresenceChangedEvent = {
  userId: string;
  status: PresenceStatus;
}

export type IncomingCallEvent = {
  callId: string;
  callerProfile: UserIdentityProfileDto;
}

export type DirectCallCanceledEvent = {
  callId: string;
  callerId: string;
}

export type DirectCallDeniedEvent = {
  callId: string;
  calleeId: string;
}

export type DirectCallAcceptedEvent = {
  callId: string;
  calleeId: string;
}

export type DirectCallDroppedEvent = {
  callId: string;
  dropperId: string;
}

export type DirectCallEndedEvent = {
  enderId: string;
  callId: string;
}

export type DirectConversationUpdatedEvent = {
  conversationId: string;
}

export type MessagePinnedEvent = {
  conversationId: string;
}

export type MessageUnpinnedEvent = {
  conversationId: string;
  messageId: string;
}

export type CreatedServerEvent = {
  serverId: string;
}

export type EmojiCreatedEvent = {
  serverId: string;
  emoji: EmojiDto;
}

export type EmojiDeletedEvent = {
  serverId: string;
  emojiIds: string[];
}

export type MentionMessageSource = {
  messageId: string;
  source: MentionSource;
}

export type MessageMentionReceivedEvent = {
  source: MentionMessageSource;
}

export type LeftServerEvent = {
  serverId: string;
}

export type JoinedServerEvent = {
  serverId: string;
}

export type UserLeftServerEvent = {
  serverId: string;
  memberUserId: string;
  memberId: string;
}

export type UserJoinedServerEvent = {
  serverId: string;
  memberUserId: string;
  memberId: string;
}
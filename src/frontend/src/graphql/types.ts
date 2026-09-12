export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: string; output: string; }
  Duration: { input: string; output: string; }
  UUID: { input: string; output: string; }
};

export type ApplicationUser = {
  __typename?: 'ApplicationUser';
  avatarUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  biography?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  displayName?: Maybe<Scalars['String']['output']>;
  hasAvatar: Scalars['Boolean']['output'];
  id: Scalars['UUID']['output'];
  numMutualFriends: Scalars['Int']['output'];
  pronouns?: Maybe<Scalars['String']['output']>;
  userName?: Maybe<Scalars['String']['output']>;
};

export type ApplicationUserFilterInput = {
  accessFailedCount?: InputMaybe<IntOperationFilterInput>;
  and?: InputMaybe<Array<ApplicationUserFilterInput>>;
  avatarUpdatedAt?: InputMaybe<DateTimeOperationFilterInput>;
  biography?: InputMaybe<StringOperationFilterInput>;
  concurrencyStamp?: InputMaybe<StringOperationFilterInput>;
  createdAt?: InputMaybe<DateTimeOperationFilterInput>;
  displayName?: InputMaybe<StringOperationFilterInput>;
  email?: InputMaybe<StringOperationFilterInput>;
  emailConfirmed?: InputMaybe<BooleanOperationFilterInput>;
  friendRequests?: InputMaybe<ListFilterInputTypeOfFriendRequestFilterInput>;
  hasAvatar?: InputMaybe<BooleanOperationFilterInput>;
  id?: InputMaybe<UuidOperationFilterInput>;
  isProfileSetup?: InputMaybe<BooleanOperationFilterInput>;
  joinedCommunityServers?: InputMaybe<ListFilterInputTypeOfCommunityServerMemberFilterInput>;
  lockoutEnabled?: InputMaybe<BooleanOperationFilterInput>;
  lockoutEnd?: InputMaybe<DateTimeOperationFilterInput>;
  normalizedEmail?: InputMaybe<StringOperationFilterInput>;
  normalizedUserName?: InputMaybe<StringOperationFilterInput>;
  or?: InputMaybe<Array<ApplicationUserFilterInput>>;
  passwordHash?: InputMaybe<StringOperationFilterInput>;
  phoneNumber?: InputMaybe<StringOperationFilterInput>;
  phoneNumberConfirmed?: InputMaybe<BooleanOperationFilterInput>;
  pronouns?: InputMaybe<StringOperationFilterInput>;
  receivedFriendRequests?: InputMaybe<ListFilterInputTypeOfFriendRequestFilterInput>;
  securityStamp?: InputMaybe<StringOperationFilterInput>;
  sentFriendRequests?: InputMaybe<ListFilterInputTypeOfFriendRequestFilterInput>;
  twoFactorEnabled?: InputMaybe<BooleanOperationFilterInput>;
  userName?: InputMaybe<StringOperationFilterInput>;
};

/** Defines when a policy shall be executed. */
export enum ApplyPolicy {
  /** After the resolver was executed. */
  AfterResolver = 'AFTER_RESOLVER',
  /** Before the resolver was executed. */
  BeforeResolver = 'BEFORE_RESOLVER',
  /** The policy is applied in the validation step before the execution. */
  Validation = 'VALIDATION'
}

export type AttachmentFilterInput = {
  and?: InputMaybe<Array<AttachmentFilterInput>>;
  id?: InputMaybe<UuidOperationFilterInput>;
  or?: InputMaybe<Array<AttachmentFilterInput>>;
  type?: InputMaybe<StringOperationFilterInput>;
};

export type BanCommunityServerMemberInput = {
  duration?: InputMaybe<Scalars['Duration']['input']>;
  memberId: Scalars['UUID']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
  serverId: Scalars['UUID']['input'];
};

export type BanCommunityServerMemberPayload = {
  __typename?: 'BanCommunityServerMemberPayload';
  memberId: Scalars['UUID']['output'];
};

export type BooleanOperationFilterInput = {
  eq?: InputMaybe<Scalars['Boolean']['input']>;
  neq?: InputMaybe<Scalars['Boolean']['input']>;
};

export type Channel = {
  __typename?: 'Channel';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['UUID']['output'];
  name?: Maybe<Scalars['String']['output']>;
};

export type ChannelCategory = {
  __typename?: 'ChannelCategory';
  channels?: Maybe<Array<Maybe<Channel>>>;
  communityServer: CommunityServer;
  communityServerId: Scalars['UUID']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['UUID']['output'];
  name: Scalars['String']['output'];
};

export type ChannelCategoryFilterInput = {
  and?: InputMaybe<Array<ChannelCategoryFilterInput>>;
  channels?: InputMaybe<ListFilterInputTypeOfChannelFilterInput>;
  communityServer?: InputMaybe<CommunityServerFilterInput>;
  communityServerId?: InputMaybe<UuidOperationFilterInput>;
  createdAt?: InputMaybe<DateTimeOperationFilterInput>;
  id?: InputMaybe<UuidOperationFilterInput>;
  name?: InputMaybe<StringOperationFilterInput>;
  or?: InputMaybe<Array<ChannelCategoryFilterInput>>;
};

export type ChannelFilterInput = {
  and?: InputMaybe<Array<ChannelFilterInput>>;
  channelCategory?: InputMaybe<ChannelCategoryFilterInput>;
  channelCategoryId?: InputMaybe<UuidOperationFilterInput>;
  communityServer?: InputMaybe<CommunityServerFilterInput>;
  communityServerId?: InputMaybe<UuidOperationFilterInput>;
  conversation?: InputMaybe<ConversationFilterInput>;
  conversationId?: InputMaybe<UuidOperationFilterInput>;
  createdAt?: InputMaybe<DateTimeOperationFilterInput>;
  friendRequest?: InputMaybe<FriendRequestFilterInput>;
  friendRequestId?: InputMaybe<UuidOperationFilterInput>;
  id?: InputMaybe<UuidOperationFilterInput>;
  name?: InputMaybe<StringOperationFilterInput>;
  or?: InputMaybe<Array<ChannelFilterInput>>;
  type?: InputMaybe<ChannelTypeOperationFilterInput>;
};

export enum ChannelType {
  CommunityServerText = 'CommunityServerText',
  CommunityServerVoice = 'CommunityServerVoice',
  DirectMessage = 'DirectMessage'
}

export type ChannelTypeOperationFilterInput = {
  eq?: InputMaybe<ChannelType>;
  in?: InputMaybe<Array<ChannelType>>;
  neq?: InputMaybe<ChannelType>;
  nin?: InputMaybe<Array<ChannelType>>;
};

export type CommunityServer = {
  __typename?: 'CommunityServer';
  channelCategories?: Maybe<Array<Maybe<ChannelCategory>>>;
  channels?: Maybe<Array<Maybe<Channel>>>;
  createdAt: Scalars['DateTime']['output'];
  creatorUser?: Maybe<ApplicationUser>;
  creatorUserId: Scalars['UUID']['output'];
  description?: Maybe<Scalars['String']['output']>;
  hasAvatar: Scalars['Boolean']['output'];
  id: Scalars['UUID']['output'];
  name: Scalars['String']['output'];
  numMembers: Scalars['Int']['output'];
  ownerUser?: Maybe<ApplicationUser>;
  ownerUserId: Scalars['UUID']['output'];
};

export type CommunityServerFilterInput = {
  and?: InputMaybe<Array<CommunityServerFilterInput>>;
  channelCategories?: InputMaybe<ListFilterInputTypeOfChannelCategoryFilterInput>;
  channels?: InputMaybe<ListFilterInputTypeOfChannelFilterInput>;
  createdAt?: InputMaybe<DateTimeOperationFilterInput>;
  creatorUser?: InputMaybe<ApplicationUserFilterInput>;
  creatorUserId?: InputMaybe<UuidOperationFilterInput>;
  description?: InputMaybe<StringOperationFilterInput>;
  hasAvatar?: InputMaybe<BooleanOperationFilterInput>;
  id?: InputMaybe<UuidOperationFilterInput>;
  invitations?: InputMaybe<ListFilterInputTypeOfInvitationFilterInput>;
  members?: InputMaybe<ListFilterInputTypeOfCommunityServerMemberFilterInput>;
  name?: InputMaybe<StringOperationFilterInput>;
  or?: InputMaybe<Array<CommunityServerFilterInput>>;
  ownerUser?: InputMaybe<ApplicationUserFilterInput>;
  ownerUserId?: InputMaybe<UuidOperationFilterInput>;
  roles?: InputMaybe<ListFilterInputTypeOfCommunityServerRoleFilterInput>;
};

export type CommunityServerMember = {
  __typename?: 'CommunityServerMember';
  authorizeInfo: MemberAuthorizeInfo;
  banExpireAt?: Maybe<Scalars['DateTime']['output']>;
  communityServer: CommunityServer;
  communityServerId: Scalars['UUID']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['UUID']['output'];
  roles: Array<CommunityServerRole>;
  status: MembershipStatus;
  user: ApplicationUser;
  userId: Scalars['UUID']['output'];
};

export type CommunityServerMemberFilterInput = {
  and?: InputMaybe<Array<CommunityServerMemberFilterInput>>;
  banExpireAt?: InputMaybe<DateTimeOperationFilterInput>;
  communityServer?: InputMaybe<CommunityServerFilterInput>;
  communityServerId?: InputMaybe<UuidOperationFilterInput>;
  createdAt?: InputMaybe<DateTimeOperationFilterInput>;
  id?: InputMaybe<UuidOperationFilterInput>;
  memberRoles?: InputMaybe<ListFilterInputTypeOfCommunityServerMemberRoleFilterInput>;
  or?: InputMaybe<Array<CommunityServerMemberFilterInput>>;
  roles?: InputMaybe<ListFilterInputTypeOfCommunityServerRoleFilterInput>;
  status?: InputMaybe<MembershipStatusOperationFilterInput>;
  user?: InputMaybe<ApplicationUserFilterInput>;
  userId?: InputMaybe<UuidOperationFilterInput>;
};

export type CommunityServerMemberRoleFilterInput = {
  and?: InputMaybe<Array<CommunityServerMemberRoleFilterInput>>;
  member?: InputMaybe<CommunityServerMemberFilterInput>;
  memberId?: InputMaybe<UuidOperationFilterInput>;
  or?: InputMaybe<Array<CommunityServerMemberRoleFilterInput>>;
  role?: InputMaybe<CommunityServerRoleFilterInput>;
  roleId?: InputMaybe<UuidOperationFilterInput>;
};

/** A connection to a list of items. */
export type CommunityServerMembersConnection = {
  __typename?: 'CommunityServerMembersConnection';
  /** A list of edges. */
  edges?: Maybe<Array<CommunityServerMembersEdge>>;
  /** A flattened list of the nodes. */
  nodes?: Maybe<Array<CommunityServerMember>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int']['output'];
};

/** An edge in a connection. */
export type CommunityServerMembersEdge = {
  __typename?: 'CommunityServerMembersEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: CommunityServerMember;
};

export type CommunityServerRole = {
  __typename?: 'CommunityServerRole';
  authorizeLevel: Scalars['Int']['output'];
  communityServer: CommunityServer;
  communityServerId: Scalars['UUID']['output'];
  createdAt: Scalars['DateTime']['output'];
  creatorUser?: Maybe<ApplicationUser>;
  creatorUserId?: Maybe<Scalars['UUID']['output']>;
  id: Scalars['UUID']['output'];
  name: Scalars['String']['output'];
  numMembers: Scalars['Int']['output'];
  permissions: Array<RolePermission>;
  specialRoleType: SpecialRoleType;
};

export type CommunityServerRoleFilterInput = {
  and?: InputMaybe<Array<CommunityServerRoleFilterInput>>;
  authorizeLevel?: InputMaybe<IntOperationFilterInput>;
  communityServer?: InputMaybe<CommunityServerFilterInput>;
  communityServerId?: InputMaybe<UuidOperationFilterInput>;
  createdAt?: InputMaybe<DateTimeOperationFilterInput>;
  creatorUser?: InputMaybe<ApplicationUserFilterInput>;
  creatorUserId?: InputMaybe<UuidOperationFilterInput>;
  id?: InputMaybe<UuidOperationFilterInput>;
  memberRoles?: InputMaybe<ListFilterInputTypeOfCommunityServerMemberRoleFilterInput>;
  members?: InputMaybe<ListFilterInputTypeOfCommunityServerMemberFilterInput>;
  name?: InputMaybe<StringOperationFilterInput>;
  or?: InputMaybe<Array<CommunityServerRoleFilterInput>>;
  permissions?: InputMaybe<ListFilterInputTypeOfRolePermissionFilterInput>;
  specialRoleType?: InputMaybe<SpecialRoleTypeOperationFilterInput>;
};

/** A connection to a list of items. */
export type CommunityServerRolesConnection = {
  __typename?: 'CommunityServerRolesConnection';
  /** A list of edges. */
  edges?: Maybe<Array<CommunityServerRolesEdge>>;
  /** A flattened list of the nodes. */
  nodes?: Maybe<Array<CommunityServerRole>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int']['output'];
};

/** An edge in a connection. */
export type CommunityServerRolesEdge = {
  __typename?: 'CommunityServerRolesEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: CommunityServerRole;
};

export type ConversationFilterInput = {
  and?: InputMaybe<Array<ConversationFilterInput>>;
  channel?: InputMaybe<ChannelFilterInput>;
  id?: InputMaybe<UuidOperationFilterInput>;
  latestMessageAt?: InputMaybe<DateTimeOperationFilterInput>;
  messages?: InputMaybe<ListFilterInputTypeOfMessageFilterInput>;
  or?: InputMaybe<Array<ConversationFilterInput>>;
};

export type DateTimeOperationFilterInput = {
  eq?: InputMaybe<Scalars['DateTime']['input']>;
  gt?: InputMaybe<Scalars['DateTime']['input']>;
  gte?: InputMaybe<Scalars['DateTime']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['DateTime']['input']>>>;
  lt?: InputMaybe<Scalars['DateTime']['input']>;
  lte?: InputMaybe<Scalars['DateTime']['input']>;
  neq?: InputMaybe<Scalars['DateTime']['input']>;
  ngt?: InputMaybe<Scalars['DateTime']['input']>;
  ngte?: InputMaybe<Scalars['DateTime']['input']>;
  nin?: InputMaybe<Array<InputMaybe<Scalars['DateTime']['input']>>>;
  nlt?: InputMaybe<Scalars['DateTime']['input']>;
  nlte?: InputMaybe<Scalars['DateTime']['input']>;
};

export type FriendRequestFilterInput = {
  and?: InputMaybe<Array<FriendRequestFilterInput>>;
  conversationChannel?: InputMaybe<ChannelFilterInput>;
  createdAt?: InputMaybe<DateTimeOperationFilterInput>;
  id?: InputMaybe<UuidOperationFilterInput>;
  or?: InputMaybe<Array<FriendRequestFilterInput>>;
  receiver?: InputMaybe<ApplicationUserFilterInput>;
  receiverUserId?: InputMaybe<UuidOperationFilterInput>;
  sender?: InputMaybe<ApplicationUserFilterInput>;
  senderUserId?: InputMaybe<UuidOperationFilterInput>;
  status?: InputMaybe<FriendRequestStatusOperationFilterInput>;
  updatedAt?: InputMaybe<DateTimeOperationFilterInput>;
};

export enum FriendRequestStatus {
  Accepted = 'Accepted',
  Canceled = 'Canceled',
  None = 'None',
  Pending = 'Pending',
  Rejected = 'Rejected'
}

export type FriendRequestStatusOperationFilterInput = {
  eq?: InputMaybe<FriendRequestStatus>;
  in?: InputMaybe<Array<FriendRequestStatus>>;
  neq?: InputMaybe<FriendRequestStatus>;
  nin?: InputMaybe<Array<FriendRequestStatus>>;
};

export type IntOperationFilterInput = {
  eq?: InputMaybe<Scalars['Int']['input']>;
  gt?: InputMaybe<Scalars['Int']['input']>;
  gte?: InputMaybe<Scalars['Int']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['Int']['input']>>>;
  lt?: InputMaybe<Scalars['Int']['input']>;
  lte?: InputMaybe<Scalars['Int']['input']>;
  neq?: InputMaybe<Scalars['Int']['input']>;
  ngt?: InputMaybe<Scalars['Int']['input']>;
  ngte?: InputMaybe<Scalars['Int']['input']>;
  nin?: InputMaybe<Array<InputMaybe<Scalars['Int']['input']>>>;
  nlt?: InputMaybe<Scalars['Int']['input']>;
  nlte?: InputMaybe<Scalars['Int']['input']>;
};

export type Invitation = {
  __typename?: 'Invitation';
  communityServer?: Maybe<CommunityServer>;
  communityServerId: Scalars['UUID']['output'];
  createdAt: Scalars['DateTime']['output'];
  currentUses: Scalars['Int']['output'];
  expiresAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['String']['output'];
  maxUses?: Maybe<Scalars['Int']['output']>;
  status: InvitationStatus;
};

export type InvitationFilterInput = {
  and?: InputMaybe<Array<InvitationFilterInput>>;
  communityServer?: InputMaybe<CommunityServerFilterInput>;
  communityServerId?: InputMaybe<UuidOperationFilterInput>;
  createdAt?: InputMaybe<DateTimeOperationFilterInput>;
  currentUses?: InputMaybe<IntOperationFilterInput>;
  expiresAt?: InputMaybe<DateTimeOperationFilterInput>;
  id?: InputMaybe<StringOperationFilterInput>;
  lastUsedAt?: InputMaybe<DateTimeOperationFilterInput>;
  maxUses?: InputMaybe<IntOperationFilterInput>;
  or?: InputMaybe<Array<InvitationFilterInput>>;
};

export enum InvitationStatus {
  AlreadyJoinedServer = 'AlreadyJoinedServer',
  Expired = 'Expired',
  MaxUsesReached = 'MaxUsesReached',
  Valid = 'Valid'
}

/** A connection to a list of items. */
export type JoinedServersConnection = {
  __typename?: 'JoinedServersConnection';
  /** A list of edges. */
  edges?: Maybe<Array<JoinedServersEdge>>;
  /** A flattened list of the nodes. */
  nodes?: Maybe<Array<CommunityServer>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int']['output'];
};

/** An edge in a connection. */
export type JoinedServersEdge = {
  __typename?: 'JoinedServersEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: CommunityServer;
};

export type KickCommunityServerMemberInput = {
  memberId: Scalars['UUID']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
  serverId: Scalars['UUID']['input'];
};

export type KickCommunityServerMemberPayload = {
  __typename?: 'KickCommunityServerMemberPayload';
  memberId: Scalars['UUID']['output'];
};

export type LeaveCommunityServerInput = {
  serverId: Scalars['UUID']['input'];
};

export type LeaveCommunityServerPayload = {
  __typename?: 'LeaveCommunityServerPayload';
  serverId: Scalars['UUID']['output'];
};

export type ListFilterInputTypeOfAttachmentFilterInput = {
  all?: InputMaybe<AttachmentFilterInput>;
  any?: InputMaybe<Scalars['Boolean']['input']>;
  none?: InputMaybe<AttachmentFilterInput>;
  some?: InputMaybe<AttachmentFilterInput>;
};

export type ListFilterInputTypeOfChannelCategoryFilterInput = {
  all?: InputMaybe<ChannelCategoryFilterInput>;
  any?: InputMaybe<Scalars['Boolean']['input']>;
  none?: InputMaybe<ChannelCategoryFilterInput>;
  some?: InputMaybe<ChannelCategoryFilterInput>;
};

export type ListFilterInputTypeOfChannelFilterInput = {
  all?: InputMaybe<ChannelFilterInput>;
  any?: InputMaybe<Scalars['Boolean']['input']>;
  none?: InputMaybe<ChannelFilterInput>;
  some?: InputMaybe<ChannelFilterInput>;
};

export type ListFilterInputTypeOfCommunityServerMemberFilterInput = {
  all?: InputMaybe<CommunityServerMemberFilterInput>;
  any?: InputMaybe<Scalars['Boolean']['input']>;
  none?: InputMaybe<CommunityServerMemberFilterInput>;
  some?: InputMaybe<CommunityServerMemberFilterInput>;
};

export type ListFilterInputTypeOfCommunityServerMemberRoleFilterInput = {
  all?: InputMaybe<CommunityServerMemberRoleFilterInput>;
  any?: InputMaybe<Scalars['Boolean']['input']>;
  none?: InputMaybe<CommunityServerMemberRoleFilterInput>;
  some?: InputMaybe<CommunityServerMemberRoleFilterInput>;
};

export type ListFilterInputTypeOfCommunityServerRoleFilterInput = {
  all?: InputMaybe<CommunityServerRoleFilterInput>;
  any?: InputMaybe<Scalars['Boolean']['input']>;
  none?: InputMaybe<CommunityServerRoleFilterInput>;
  some?: InputMaybe<CommunityServerRoleFilterInput>;
};

export type ListFilterInputTypeOfFriendRequestFilterInput = {
  all?: InputMaybe<FriendRequestFilterInput>;
  any?: InputMaybe<Scalars['Boolean']['input']>;
  none?: InputMaybe<FriendRequestFilterInput>;
  some?: InputMaybe<FriendRequestFilterInput>;
};

export type ListFilterInputTypeOfInvitationFilterInput = {
  all?: InputMaybe<InvitationFilterInput>;
  any?: InputMaybe<Scalars['Boolean']['input']>;
  none?: InputMaybe<InvitationFilterInput>;
  some?: InputMaybe<InvitationFilterInput>;
};

export type ListFilterInputTypeOfMessageFilterInput = {
  all?: InputMaybe<MessageFilterInput>;
  any?: InputMaybe<Scalars['Boolean']['input']>;
  none?: InputMaybe<MessageFilterInput>;
  some?: InputMaybe<MessageFilterInput>;
};

export type ListFilterInputTypeOfRolePermissionFilterInput = {
  all?: InputMaybe<RolePermissionFilterInput>;
  any?: InputMaybe<Scalars['Boolean']['input']>;
  none?: InputMaybe<RolePermissionFilterInput>;
  some?: InputMaybe<RolePermissionFilterInput>;
};

export type MemberAuthorizeInfo = {
  __typename?: 'MemberAuthorizeInfo';
  authorizeLevel: Scalars['Int']['output'];
  isBanned: Scalars['Boolean']['output'];
  permissions: Array<PermissionEntry>;
};

export enum MembershipStatus {
  Active = 'Active',
  Kicked = 'Kicked',
  Left = 'Left'
}

export type MembershipStatusOperationFilterInput = {
  eq?: InputMaybe<MembershipStatus>;
  in?: InputMaybe<Array<MembershipStatus>>;
  neq?: InputMaybe<MembershipStatus>;
  nin?: InputMaybe<Array<MembershipStatus>>;
};

export type MessageFilterInput = {
  and?: InputMaybe<Array<MessageFilterInput>>;
  attachments?: InputMaybe<ListFilterInputTypeOfAttachmentFilterInput>;
  body?: InputMaybe<StringOperationFilterInput>;
  conversation?: InputMaybe<ConversationFilterInput>;
  conversationId?: InputMaybe<UuidOperationFilterInput>;
  createdAt?: InputMaybe<DateTimeOperationFilterInput>;
  deletedAt?: InputMaybe<DateTimeOperationFilterInput>;
  id?: InputMaybe<UuidOperationFilterInput>;
  or?: InputMaybe<Array<MessageFilterInput>>;
  replies?: InputMaybe<ListFilterInputTypeOfMessageFilterInput>;
  replyTo?: InputMaybe<MessageFilterInput>;
  replyToId?: InputMaybe<UuidOperationFilterInput>;
  sender?: InputMaybe<ApplicationUserFilterInput>;
  senderUserId?: InputMaybe<UuidOperationFilterInput>;
  updatedAt?: InputMaybe<DateTimeOperationFilterInput>;
};

export type Mutation = {
  __typename?: 'Mutation';
  banCommunityServerMember: BanCommunityServerMemberPayload;
  kickCommunityServerMember: KickCommunityServerMemberPayload;
  leaveCommunityServer: LeaveCommunityServerPayload;
  unbanCommunityServerMember: UnbanCommunityServerMemberPayload;
  updateCommunityServerMemberRoles: UpdateCommunityServerMemberRolesPayload;
};


export type MutationBanCommunityServerMemberArgs = {
  input: BanCommunityServerMemberInput;
};


export type MutationKickCommunityServerMemberArgs = {
  input: KickCommunityServerMemberInput;
};


export type MutationLeaveCommunityServerArgs = {
  input: LeaveCommunityServerInput;
};


export type MutationUnbanCommunityServerMemberArgs = {
  input: UnbanCommunityServerMemberInput;
};


export type MutationUpdateCommunityServerMemberRolesArgs = {
  input: UpdateCommunityServerMemberRolesInput;
};

/** Information about pagination in a connection. */
export type PageInfo = {
  __typename?: 'PageInfo';
  /** When paginating forwards, the cursor to continue. */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** Indicates whether more edges exist following the set defined by the clients arguments. */
  hasNextPage: Scalars['Boolean']['output'];
  /** Indicates whether more edges exist prior the set defined by the clients arguments. */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** When paginating backwards, the cursor to continue. */
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type PermissionEntry = {
  __typename?: 'PermissionEntry';
  isGranted: Scalars['Boolean']['output'];
  permission: ServerPermission;
};

export enum PermissionState {
  Disable = 'Disable',
  Enable = 'Enable',
  Inherit = 'Inherit'
}

export type PermissionStateOperationFilterInput = {
  eq?: InputMaybe<PermissionState>;
  in?: InputMaybe<Array<PermissionState>>;
  neq?: InputMaybe<PermissionState>;
  nin?: InputMaybe<Array<PermissionState>>;
};

export type Query = {
  __typename?: 'Query';
  communityServer?: Maybe<CommunityServer>;
  communityServerMember?: Maybe<CommunityServerMember>;
  communityServerMemberByServerAndUserId?: Maybe<CommunityServerMember>;
  communityServerMembers?: Maybe<CommunityServerMembersConnection>;
  communityServerRole?: Maybe<CommunityServerRole>;
  communityServerRoles?: Maybe<CommunityServerRolesConnection>;
  invitation?: Maybe<Invitation>;
  joinedServers?: Maybe<JoinedServersConnection>;
  user?: Maybe<ApplicationUser>;
};


export type QueryCommunityServerArgs = {
  id: Scalars['UUID']['input'];
};


export type QueryCommunityServerMemberArgs = {
  id: Scalars['UUID']['input'];
};


export type QueryCommunityServerMemberByServerAndUserIdArgs = {
  serverId: Scalars['UUID']['input'];
  userId: Scalars['UUID']['input'];
};


export type QueryCommunityServerMembersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  serverId: Scalars['UUID']['input'];
  where?: InputMaybe<CommunityServerMemberFilterInput>;
};


export type QueryCommunityServerRoleArgs = {
  id: Scalars['UUID']['input'];
};


export type QueryCommunityServerRolesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  serverId: Scalars['UUID']['input'];
  where?: InputMaybe<CommunityServerRoleFilterInput>;
};


export type QueryInvitationArgs = {
  id: Scalars['String']['input'];
};


export type QueryJoinedServersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryUserArgs = {
  id: Scalars['UUID']['input'];
};

export type RolePermission = {
  __typename?: 'RolePermission';
  permission: ServerPermission;
  role: CommunityServerRole;
  roleId: Scalars['UUID']['output'];
  state: PermissionState;
};

export type RolePermissionFilterInput = {
  and?: InputMaybe<Array<RolePermissionFilterInput>>;
  or?: InputMaybe<Array<RolePermissionFilterInput>>;
  permission?: InputMaybe<ServerPermissionOperationFilterInput>;
  role?: InputMaybe<CommunityServerRoleFilterInput>;
  roleId?: InputMaybe<UuidOperationFilterInput>;
  state?: InputMaybe<PermissionStateOperationFilterInput>;
};

export enum ServerPermission {
  BanMembers = 'BanMembers',
  CreateChannel = 'CreateChannel',
  CreateRole = 'CreateRole',
  DeleteChannel = 'DeleteChannel',
  DeleteRole = 'DeleteRole',
  KickMembers = 'KickMembers',
  ManageMembers = 'ManageMembers',
  UnbanMembers = 'UnbanMembers',
  UpdateMemberRoles = 'UpdateMemberRoles',
  UpdateRole = 'UpdateRole'
}

export type ServerPermissionOperationFilterInput = {
  eq?: InputMaybe<ServerPermission>;
  in?: InputMaybe<Array<ServerPermission>>;
  neq?: InputMaybe<ServerPermission>;
  nin?: InputMaybe<Array<ServerPermission>>;
};

export enum SpecialRoleType {
  Default = 'Default',
  None = 'None',
  Owner = 'Owner'
}

export type SpecialRoleTypeOperationFilterInput = {
  eq?: InputMaybe<SpecialRoleType>;
  in?: InputMaybe<Array<SpecialRoleType>>;
  neq?: InputMaybe<SpecialRoleType>;
  nin?: InputMaybe<Array<SpecialRoleType>>;
};

export type StringOperationFilterInput = {
  and?: InputMaybe<Array<StringOperationFilterInput>>;
  contains?: InputMaybe<Scalars['String']['input']>;
  endsWith?: InputMaybe<Scalars['String']['input']>;
  eq?: InputMaybe<Scalars['String']['input']>;
  ilike?: InputMaybe<Scalars['String']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  ncontains?: InputMaybe<Scalars['String']['input']>;
  nendsWith?: InputMaybe<Scalars['String']['input']>;
  neq?: InputMaybe<Scalars['String']['input']>;
  nin?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  nstartsWith?: InputMaybe<Scalars['String']['input']>;
  or?: InputMaybe<Array<StringOperationFilterInput>>;
  startsWith?: InputMaybe<Scalars['String']['input']>;
};

export type UnbanCommunityServerMemberInput = {
  memberId: Scalars['UUID']['input'];
  serverId: Scalars['UUID']['input'];
};

export type UnbanCommunityServerMemberPayload = {
  __typename?: 'UnbanCommunityServerMemberPayload';
  memberId: Scalars['UUID']['output'];
};

export type UpdateCommunityServerMemberRolesInput = {
  memberId: Scalars['UUID']['input'];
  roleIds: Array<Scalars['UUID']['input']>;
  serverId: Scalars['UUID']['input'];
};

export type UpdateCommunityServerMemberRolesPayload = {
  __typename?: 'UpdateCommunityServerMemberRolesPayload';
  member: CommunityServerMember;
  memberId: Scalars['UUID']['output'];
};

export type UuidOperationFilterInput = {
  eq?: InputMaybe<Scalars['UUID']['input']>;
  gt?: InputMaybe<Scalars['UUID']['input']>;
  gte?: InputMaybe<Scalars['UUID']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['UUID']['input']>>>;
  lt?: InputMaybe<Scalars['UUID']['input']>;
  lte?: InputMaybe<Scalars['UUID']['input']>;
  neq?: InputMaybe<Scalars['UUID']['input']>;
  ngt?: InputMaybe<Scalars['UUID']['input']>;
  ngte?: InputMaybe<Scalars['UUID']['input']>;
  nin?: InputMaybe<Array<InputMaybe<Scalars['UUID']['input']>>>;
  nlt?: InputMaybe<Scalars['UUID']['input']>;
  nlte?: InputMaybe<Scalars['UUID']['input']>;
};

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

/** Defines when a policy shall be executed. */
export enum ApplyPolicy {
  /** After the resolver was executed. */
  AfterResolver = 'AFTER_RESOLVER',
  /** Before the resolver was executed. */
  BeforeResolver = 'BEFORE_RESOLVER',
  /** The policy is applied in the validation step before the execution. */
  Validation = 'VALIDATION'
}

export type CommunityServer = {
  __typename?: 'CommunityServer';
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

export type CommunityServerMember = {
  __typename?: 'CommunityServerMember';
  communityServer: CommunityServer;
  communityServerId: Scalars['UUID']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['UUID']['output'];
  roles: Array<CommunityServerRole>;
  user: ApplicationUser;
  userId: Scalars['UUID']['output'];
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

/** A connection to a list of items. */
export type CommunityServerRolesByServerIdConnection = {
  __typename?: 'CommunityServerRolesByServerIdConnection';
  /** A list of edges. */
  edges?: Maybe<Array<CommunityServerRolesByServerIdEdge>>;
  /** A flattened list of the nodes. */
  nodes?: Maybe<Array<CommunityServerRole>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars['Int']['output'];
};

/** An edge in a connection. */
export type CommunityServerRolesByServerIdEdge = {
  __typename?: 'CommunityServerRolesByServerIdEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: CommunityServerRole;
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

export enum PermissionState {
  Disable = 'Disable',
  Enable = 'Enable',
  Inherit = 'Inherit'
}

export type Query = {
  __typename?: 'Query';
  communityServerRoleById: Array<CommunityServerRole>;
  communityServerRolesByServerId?: Maybe<CommunityServerRolesByServerIdConnection>;
  invitationById?: Maybe<Invitation>;
  joinedServers?: Maybe<JoinedServersConnection>;
  userById?: Maybe<ApplicationUser>;
  users: Array<ApplicationUser>;
};


export type QueryCommunityServerRoleByIdArgs = {
  id: Scalars['UUID']['input'];
};


export type QueryCommunityServerRolesByServerIdArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  serverId: Scalars['UUID']['input'];
};


export type QueryInvitationByIdArgs = {
  id: Scalars['String']['input'];
};


export type QueryJoinedServersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryUserByIdArgs = {
  id: Scalars['UUID']['input'];
};

export type RolePermission = {
  __typename?: 'RolePermission';
  permission: ServerPermission;
  role: CommunityServerRole;
  roleId: Scalars['UUID']['output'];
  state: PermissionState;
};

export enum ServerPermission {
  CreateChannel = 'CreateChannel',
  CreateRole = 'CreateRole',
  DeleteChannel = 'DeleteChannel',
  DeleteRole = 'DeleteRole',
  UpdateRole = 'UpdateRole'
}

export enum SpecialRoleType {
  Default = 'Default',
  None = 'None',
  Owner = 'Owner'
}

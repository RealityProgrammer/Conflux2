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
export type ApplyPolicy =
  /** After the resolver was executed. */
  | 'AFTER_RESOLVER'
  /** Before the resolver was executed. */
  | 'BEFORE_RESOLVER'
  /** The policy is applied in the validation step before the execution. */
  | 'VALIDATION';

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

export type InvitationStatus =
  | 'ALREADY_JOINED_SERVER'
  | 'EXPIRED'
  | 'MAX_USES_REACHED'
  | 'VALID';

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

export type Query = {
  __typename?: 'Query';
  invitationById?: Maybe<Invitation>;
  joinedServers?: Maybe<JoinedServersConnection>;
  userById?: Maybe<ApplicationUser>;
  users: Array<ApplicationUser>;
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

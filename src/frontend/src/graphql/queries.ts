/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { graphqlFetcher } from '../api/client';
import type * as Types from './types';

import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
import { useQuery, useMutation, type UseQueryOptions, type UseMutationOptions } from '@tanstack/react-query';
export type GetInvitationSummaryQueryVariables = Exact<{
  id: string;
}>;


export type GetInvitationSummaryQuery = { invitationById: { status: Types.InvitationStatus, communityServer: { id: string, name: string, hasAvatar: boolean, numMembers: number } | null } | null };

export type GetUserFullProfileQueryVariables = Exact<{
  id: string;
}>;


export type GetUserFullProfileQuery = { userById: { id: string, userName: string | null, displayName: string | null, hasAvatar: boolean, biography: string | null, pronouns: string | null, createdAt: string, numMutualFriends: number } | null };

export type GetUserIdentityProfileQueryVariables = Exact<{
  id: string;
}>;


export type GetUserIdentityProfileQuery = { userById: { id: string, userName: string | null, displayName: string | null, hasAvatar: boolean } | null };

export type InspectMemberQueryVariables = Exact<{
  id: string;
}>;


export type InspectMemberQuery = { communityServerMemberById: { id: string, createdAt: string, status: Types.MembershipStatus, banExpireAt: string | null, user: { id: string, userName: string | null, displayName: string | null, hasAvatar: boolean }, roles: Array<{ id: string, name: string, authorizeLevel: number, specialRoleType: Types.SpecialRoleType }>, authorizeInfo: { authorizeLevel: number, permissions: Array<{ permission: Types.ServerPermission, isGranted: boolean }> } } | null };

export type KickServerMemberMutationVariables = Exact<{
  serverId: string;
  memberId: string;
}>;


export type KickServerMemberMutation = { kickCommunityServerMember: { memberId: string } };

export type UpdateMemberRolesMutationVariables = Exact<{
  serverId: string;
  memberId: string;
  roleIds: Array<string> | string;
}>;


export type UpdateMemberRolesMutation = { updateCommunityServerMemberRoles: { memberId: string } };


export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}

export const GetInvitationSummaryDocument = new TypedDocumentString(`
    query GetInvitationSummary($id: String!) {
  invitationById(id: $id) {
    communityServer {
      id
      name
      hasAvatar
      numMembers
    }
    status
  }
}
    `);

export const useGetInvitationSummaryQuery = <
      TData = GetInvitationSummaryQuery,
      TError = unknown
    >(
      variables: GetInvitationSummaryQueryVariables,
      options?: Omit<UseQueryOptions<GetInvitationSummaryQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<GetInvitationSummaryQuery, TError, TData>['queryKey'] }
    ) => {
    
    return useQuery<GetInvitationSummaryQuery, TError, TData>(
      {
    queryKey: ['GetInvitationSummary', variables],
    queryFn: graphqlFetcher<GetInvitationSummaryQuery, GetInvitationSummaryQueryVariables>(GetInvitationSummaryDocument, variables),
    ...options
  }
    )};

useGetInvitationSummaryQuery.getKey = (variables: GetInvitationSummaryQueryVariables) => ['GetInvitationSummary', variables];


useGetInvitationSummaryQuery.fetcher = (variables: GetInvitationSummaryQueryVariables, options?: RequestInit['headers']) => graphqlFetcher<GetInvitationSummaryQuery, GetInvitationSummaryQueryVariables>(GetInvitationSummaryDocument, variables, options);

export const GetUserFullProfileDocument = new TypedDocumentString(`
    query GetUserFullProfile($id: UUID!) {
  userById(id: $id) {
    id
    userName
    displayName
    hasAvatar
    biography
    pronouns
    createdAt
    numMutualFriends
  }
}
    `);

export const useGetUserFullProfileQuery = <
      TData = GetUserFullProfileQuery,
      TError = unknown
    >(
      variables: GetUserFullProfileQueryVariables,
      options?: Omit<UseQueryOptions<GetUserFullProfileQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<GetUserFullProfileQuery, TError, TData>['queryKey'] }
    ) => {
    
    return useQuery<GetUserFullProfileQuery, TError, TData>(
      {
    queryKey: ['GetUserFullProfile', variables],
    queryFn: graphqlFetcher<GetUserFullProfileQuery, GetUserFullProfileQueryVariables>(GetUserFullProfileDocument, variables),
    ...options
  }
    )};

useGetUserFullProfileQuery.getKey = (variables: GetUserFullProfileQueryVariables) => ['GetUserFullProfile', variables];


useGetUserFullProfileQuery.fetcher = (variables: GetUserFullProfileQueryVariables, options?: RequestInit['headers']) => graphqlFetcher<GetUserFullProfileQuery, GetUserFullProfileQueryVariables>(GetUserFullProfileDocument, variables, options);

export const GetUserIdentityProfileDocument = new TypedDocumentString(`
    query GetUserIdentityProfile($id: UUID!) {
  userById(id: $id) {
    id
    userName
    displayName
    hasAvatar
  }
}
    `);

export const useGetUserIdentityProfileQuery = <
      TData = GetUserIdentityProfileQuery,
      TError = unknown
    >(
      variables: GetUserIdentityProfileQueryVariables,
      options?: Omit<UseQueryOptions<GetUserIdentityProfileQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<GetUserIdentityProfileQuery, TError, TData>['queryKey'] }
    ) => {
    
    return useQuery<GetUserIdentityProfileQuery, TError, TData>(
      {
    queryKey: ['GetUserIdentityProfile', variables],
    queryFn: graphqlFetcher<GetUserIdentityProfileQuery, GetUserIdentityProfileQueryVariables>(GetUserIdentityProfileDocument, variables),
    ...options
  }
    )};

useGetUserIdentityProfileQuery.getKey = (variables: GetUserIdentityProfileQueryVariables) => ['GetUserIdentityProfile', variables];


useGetUserIdentityProfileQuery.fetcher = (variables: GetUserIdentityProfileQueryVariables, options?: RequestInit['headers']) => graphqlFetcher<GetUserIdentityProfileQuery, GetUserIdentityProfileQueryVariables>(GetUserIdentityProfileDocument, variables, options);

export const InspectMemberDocument = new TypedDocumentString(`
    query InspectMember($id: UUID!) {
  communityServerMemberById(id: $id) {
    id
    createdAt
    user {
      id
      userName
      displayName
      hasAvatar
    }
    roles {
      id
      name
      authorizeLevel
      specialRoleType
    }
    authorizeInfo {
      authorizeLevel
      permissions {
        permission
        isGranted
      }
    }
    status
    banExpireAt
  }
}
    `);

export const useInspectMemberQuery = <
      TData = InspectMemberQuery,
      TError = unknown
    >(
      variables: InspectMemberQueryVariables,
      options?: Omit<UseQueryOptions<InspectMemberQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<InspectMemberQuery, TError, TData>['queryKey'] }
    ) => {
    
    return useQuery<InspectMemberQuery, TError, TData>(
      {
    queryKey: ['InspectMember', variables],
    queryFn: graphqlFetcher<InspectMemberQuery, InspectMemberQueryVariables>(InspectMemberDocument, variables),
    ...options
  }
    )};

useInspectMemberQuery.getKey = (variables: InspectMemberQueryVariables) => ['InspectMember', variables];


useInspectMemberQuery.fetcher = (variables: InspectMemberQueryVariables, options?: RequestInit['headers']) => graphqlFetcher<InspectMemberQuery, InspectMemberQueryVariables>(InspectMemberDocument, variables, options);

export const KickServerMemberDocument = new TypedDocumentString(`
    mutation KickServerMember($serverId: UUID!, $memberId: UUID!) {
  kickCommunityServerMember(input: { serverId: $serverId, memberId: $memberId }) {
    memberId
  }
}
    `);

export const useKickServerMemberMutation = <
      TError = unknown,
      TContext = unknown
    >(options?: UseMutationOptions<KickServerMemberMutation, TError, KickServerMemberMutationVariables, TContext>) => {
    
    return useMutation<KickServerMemberMutation, TError, KickServerMemberMutationVariables, TContext>(
      {
    mutationKey: ['KickServerMember'],
    mutationFn: (variables?: KickServerMemberMutationVariables) => graphqlFetcher<KickServerMemberMutation, KickServerMemberMutationVariables>(KickServerMemberDocument, variables)(),
    ...options
  }
    )};


useKickServerMemberMutation.fetcher = (variables: KickServerMemberMutationVariables, options?: RequestInit['headers']) => graphqlFetcher<KickServerMemberMutation, KickServerMemberMutationVariables>(KickServerMemberDocument, variables, options);

export const UpdateMemberRolesDocument = new TypedDocumentString(`
    mutation UpdateMemberRoles($serverId: UUID!, $memberId: UUID!, $roleIds: [UUID!]!) {
  updateCommunityServerMemberRoles(
    input: { serverId: $serverId, memberId: $memberId, roleIds: $roleIds }
  ) {
    memberId
  }
}
    `);

export const useUpdateMemberRolesMutation = <
      TError = unknown,
      TContext = unknown
    >(options?: UseMutationOptions<UpdateMemberRolesMutation, TError, UpdateMemberRolesMutationVariables, TContext>) => {
    
    return useMutation<UpdateMemberRolesMutation, TError, UpdateMemberRolesMutationVariables, TContext>(
      {
    mutationKey: ['UpdateMemberRoles'],
    mutationFn: (variables?: UpdateMemberRolesMutationVariables) => graphqlFetcher<UpdateMemberRolesMutation, UpdateMemberRolesMutationVariables>(UpdateMemberRolesDocument, variables)(),
    ...options
  }
    )};


useUpdateMemberRolesMutation.fetcher = (variables: UpdateMemberRolesMutationVariables, options?: RequestInit['headers']) => graphqlFetcher<UpdateMemberRolesMutation, UpdateMemberRolesMutationVariables>(UpdateMemberRolesDocument, variables, options);

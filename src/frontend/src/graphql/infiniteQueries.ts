/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { graphqlFetcher } from '../api/client';
import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
import { useQuery, useInfiniteQuery, type UseQueryOptions, type UseInfiniteQueryOptions, type InfiniteData } from '@tanstack/react-query';
export type GetJoinedCommunityServerQueryVariables = Exact<{
  after?: string | null | undefined;
}>;


export type GetJoinedCommunityServerQuery = { joinedServers: { totalCount: number, pageInfo: { hasNextPage: boolean, hasPreviousPage: boolean, endCursor: string | null }, nodes: Array<{ id: string, name: string, hasAvatar: boolean }> | null } | null };


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

export const GetJoinedCommunityServerDocument = new TypedDocumentString(`
    query GetJoinedCommunityServer($after: String) {
  joinedServers(after: $after) {
    totalCount
    pageInfo {
      hasNextPage
      hasPreviousPage
      endCursor
    }
    nodes {
      id
      name
      hasAvatar
    }
  }
}
    `);

export const useGetJoinedCommunityServerQuery = <
      TData = GetJoinedCommunityServerQuery,
      TError = unknown
    >(
      variables?: GetJoinedCommunityServerQueryVariables,
      options?: Omit<UseQueryOptions<GetJoinedCommunityServerQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<GetJoinedCommunityServerQuery, TError, TData>['queryKey'] }
    ) => {
    
    return useQuery<GetJoinedCommunityServerQuery, TError, TData>(
      {
    queryKey: variables === undefined ? ['GetJoinedCommunityServer'] : ['GetJoinedCommunityServer', variables],
    queryFn: graphqlFetcher<GetJoinedCommunityServerQuery, GetJoinedCommunityServerQueryVariables>(GetJoinedCommunityServerDocument, variables),
    ...options
  }
    )};

useGetJoinedCommunityServerQuery.getKey = (variables?: GetJoinedCommunityServerQueryVariables) => variables === undefined ? ['GetJoinedCommunityServer'] : ['GetJoinedCommunityServer', variables];

export const useInfiniteGetJoinedCommunityServerQuery = <
      TData = InfiniteData<GetJoinedCommunityServerQuery>,
      TError = unknown
    >(
      variables: GetJoinedCommunityServerQueryVariables,
      options: Omit<UseInfiniteQueryOptions<GetJoinedCommunityServerQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<GetJoinedCommunityServerQuery, TError, TData>['queryKey'] }
    ) => {
    
    return useInfiniteQuery<GetJoinedCommunityServerQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? variables === undefined ? ['GetJoinedCommunityServer.infinite'] : ['GetJoinedCommunityServer.infinite', variables],
      queryFn: (metaData) => graphqlFetcher<GetJoinedCommunityServerQuery, GetJoinedCommunityServerQueryVariables>(GetJoinedCommunityServerDocument, {...variables, ...(metaData.pageParam ?? {})})(),
      ...restOptions
    }
  })()
    )};

useInfiniteGetJoinedCommunityServerQuery.getKey = (variables?: GetJoinedCommunityServerQueryVariables) => variables === undefined ? ['GetJoinedCommunityServer.infinite'] : ['GetJoinedCommunityServer.infinite', variables];


useGetJoinedCommunityServerQuery.fetcher = (variables?: GetJoinedCommunityServerQueryVariables, options?: RequestInit['headers']) => graphqlFetcher<GetJoinedCommunityServerQuery, GetJoinedCommunityServerQueryVariables>(GetJoinedCommunityServerDocument, variables, options);

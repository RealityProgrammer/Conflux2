/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type {TypedDocumentNode as DocumentNode} from '@graphql-typed-document-node/core';

export type GetUserIdentityProfileQueryVariables = Exact<{
  id: unknown;
}>;


export type GetUserIdentityProfileQuery = {
  userById: Array<{ id: unknown, userName: string | null, displayName: string | null, hasAvatar: boolean }>
};


export const GetUserIdentityProfileDocument = {
  "kind": "Document",
  "definitions": [{
    "kind": "OperationDefinition",
    "operation": "query",
    "name": {"kind": "Name", "value": "GetUserIdentityProfile"},
    "variableDefinitions": [{
      "kind": "VariableDefinition",
      "variable": {"kind": "Variable", "name": {"kind": "Name", "value": "id"}},
      "type": {"kind": "NonNullType", "type": {"kind": "NamedType", "name": {"kind": "Name", "value": "UUID"}}}
    }],
    "selectionSet": {
      "kind": "SelectionSet",
      "selections": [{
        "kind": "Field",
        "name": {"kind": "Name", "value": "userById"},
        "arguments": [{
          "kind": "Argument",
          "name": {"kind": "Name", "value": "id"},
          "value": {"kind": "Variable", "name": {"kind": "Name", "value": "id"}}
        }],
        "selectionSet": {
          "kind": "SelectionSet",
          "selections": [{"kind": "Field", "name": {"kind": "Name", "value": "id"}}, {
            "kind": "Field",
            "name": {"kind": "Name", "value": "userName"}
          }, {"kind": "Field", "name": {"kind": "Name", "value": "displayName"}}, {
            "kind": "Field",
            "name": {"kind": "Name", "value": "hasAvatar"}
          }]
        }
      }]
    }
  }]
} as unknown as DocumentNode<GetUserIdentityProfileQuery, GetUserIdentityProfileQueryVariables>;
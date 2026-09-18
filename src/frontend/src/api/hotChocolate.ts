export interface HotChocolateErrorExtension {
  code?: string;
  details?: string;
  stackTrace?: string;
  userState?: Record<string, unknown>;
  [key: string]: unknown; // any custom error on C# backend side
}

export interface HotChocolateError {
  message: string;
  path?: (string | number)[];
  locations?: { line: number; column: number }[];
  extensions?: HotChocolateErrorExtension;
}

export interface GraphQLResponse<TData> {
  data?: TData | null;
  errors?: HotChocolateError[];
}
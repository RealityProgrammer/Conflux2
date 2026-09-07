import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'http://localhost:5127/graphql',
  ignoreNoDocuments: true,
  config: {
    reactQueryVersion: 5,
    useTypeImports: true,
    scalars: {
      UUID: 'string',
      DateTime: 'string',
      JSON: "Record<string, unknown>",
      Any: 'unknown',
    },
    fetcher: 'graphqlFetcher',
    exposeQueryKeys: true,
    exposeFetcher: true,
  },
  generates: {
    'src/graphql/types.ts': {
      documents: ['src/graphql/*.graphql'],
      plugins: ['typescript'],
      config: {
        namingConvention: {
          enumValues: 'change-case-all#pascalCase',
          transformUnderscore: true
        }
      },
    },

    'src/graphql/queries.ts': {
      documents: ['src/graphql/*.graphql', '!src/graphql/*.infinite.graphql'],
      plugins: [
        {
          add: {
            content: "import { graphqlFetcher } from '../api/client';",
          },
        },
        'typescript-operations',
        'typescript-react-query',
      ],
      config: {
        importSchemaTypesFrom: './src/graphql/types.ts',
      }
    },

    'src/graphql/infiniteQueries.ts': {
      documents: ['src/**/*.infinite.graphql'],
      plugins: [
        {
          add: {
            content: "import { graphqlFetcher } from '../api/client';",
          },
        },
        'typescript-operations',
        'typescript-react-query',
      ],
      config: {
        importSchemaTypesFrom: './src/graphql/types.ts',
        addInfiniteQuery: true
      },
    }
  },
};

export default config;
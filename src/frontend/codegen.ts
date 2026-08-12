import type {CodegenConfig} from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: `http://localhost:5127/graphql`,
  documents: ['src/**/*.ts', 'src/**/*.tsx'],
  ignoreNoDocuments: true,
  generates: {
    './src/gql/': {
      preset: 'client',
      config: {
        useTypeImports: true,
      },
      presetConfig: {
        gqlTagName: 'gql',
      }
    }
  }
};

export default config;
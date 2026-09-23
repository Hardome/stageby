import { pluginFetch } from '@kubb/plugin-fetch';
import { pluginReactQuery } from '@kubb/plugin-react-query';
import { pluginTs } from '@kubb/plugin-ts';
import { pluginZod } from '@kubb/plugin-zod';
import { defineConfig } from 'kubb/config';

const input = '../contracts/openapi.yaml';
const outputPath = './src/generated/api';

const createContractPlugins = () => [
  pluginTs({
    output: {
      path: 'types',
      barrel: { type: 'named' },
    },
  }),
  pluginZod({
    output: {
      path: 'zod',
      barrel: { type: 'named' },
    },
    inferred: true,
  }),
  pluginFetch({
    output: {
      path: 'clients',
      barrel: { type: 'named' },
    },
    validator: 'zod',
  }),
];

export default defineConfig([
  {
    input,
    output: {
      path: outputPath,
      clean: true,
    },
    plugins: [
      ...createContractPlugins(),
      pluginReactQuery({
        output: {
          path: 'hooks/queries',
          barrel: { type: 'named' },
          banner: '// @ts-nocheck',
        },
        include: [{ type: 'method', pattern: /^get$/i }],
        client: 'fetch',
        hooks: true,
        query: {
          methods: ['get'],
        },
        mutation: false,
      }),
    ],
  },
  {
    input,
    output: {
      path: outputPath,
      clean: false,
    },
    plugins: [
      ...createContractPlugins(),
      pluginReactQuery({
        output: {
          path: 'hooks/mutations',
          barrel: { type: 'named' },
          banner: '// @ts-nocheck',
        },
        include: [
          {
            type: 'method',
            pattern: /^(post|put|patch|delete)$/i,
          },
        ],
        client: 'fetch',
        hooks: true,
        query: {
          methods: ['get'],
        },
        mutation: {
          methods: ['post', 'put', 'patch', 'delete'],
        },
      }),
    ],
  },
]);

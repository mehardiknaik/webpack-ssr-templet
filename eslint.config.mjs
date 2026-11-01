import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

const config = [
  {
    files: ['src/**/*.tsx', 'src/**/*.ts'],
    ignores: ['**/*.d.ts'],

    languageOptions: {
      parser: tsparser,
      sourceType: 'module'
    },

    plugins: {
      '@typescript-eslint': tseslint,
      prettier: prettierPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin
    },

    rules: {
      ...tseslint.configs.recommended.rules,
      ...prettierConfig.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off'
    },

    settings: {
      react: {
        version: 'detect'
      }
    }
  }
];

export default config;

import js from '@eslint/js'
import globals from 'globals'
import vueParser from 'vue-eslint-parser'
import tseslint from 'typescript-eslint'
import importPlugin from 'eslint-plugin-import'
import eslintConfigPrettier from 'eslint-config-prettier'

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    plugins: {
      import: importPlugin,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        requireConfigFile: false,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      // Disable naming convention for migration (too many false positives)
      '@typescript-eslint/naming-convention': 'off',

      // Standard overrides
      camelcase: 'off',
      'no-var': 'error',
      'no-undef': 'off', // TypeScript handles this
      'object-shorthand': 'error',
      'prefer-const': ['error', { destructuring: 'any' }],
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'prefer-object-spread': 'error',
      'prefer-destructuring': 'error',
      'prefer-numeric-literals': 'error',

      // Import rules
      'import/order': ['error', { 'newlines-between': 'always' }],

      // Disable strict TypeScript rules for migration
      '@typescript-eslint/no-unused-vars': 'off', // Vue <script setup>
      '@typescript-eslint/ban-ts-comment': 'off', // Allow @ts-ignore and @ts-nocheck
      '@typescript-eslint/no-explicit-any': 'off', // Allow any type
      '@typescript-eslint/no-empty-object-type': 'off', // Allow {} type
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      'no-unsafe-optional-chaining': 'off',
      'no-dupe-class-members': 'off',
      'no-labels': 'off',
    },
  },
  {
    ignores: ['dist/*', 'dist-demo/*', 'node_modules/*', 'types/*'],
  },
]

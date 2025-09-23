const js = require('@eslint/js');
const tseslint = require('@typescript-eslint/eslint-plugin');
const parser = require('@typescript-eslint/parser');

module.exports = [
  // Ignore patterns
  {
    ignores: [
      'dist/',
      'node_modules/',
      '.next/',
      'coverage/',
      '*.config.js',
      '*.config.mjs',
      'packages/**/dist/',
      'apps/**/dist/',
      'apps/**/.next/',
      'apps/frontend/**', // Frontend has its own config
    ],
  },
  // JavaScript files
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...js.configs.recommended,
    rules: {
      'no-console': 'off', // Allow console for development
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  // TypeScript files
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // Basic rules
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': 'off', // Too strict for development
      '@typescript-eslint/no-explicit-any': 'off', // Allow any for flexibility
    },
  },
];
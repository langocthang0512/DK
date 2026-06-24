import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules', 'coverage', 'eslint.config.js', '*.config.*.timestamp-*']
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['eslint.config.js']
        },
        tsconfigRootDir: import.meta.dirname
      },
      globals: {
        ...globals.browser,
        ...globals.es2022
      }
    },
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }]
    }
  },
  {
    files: ['vite.config.ts', 'eslint.config.js'],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  },
  prettier
);

import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  ...compat.plugins("import", "simple-import-sort", "unused-imports"),
  ...compat.config({
    extends: ["prettier"],
    plugins: ["prettier"],
  }),
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      // Prettier integration
      "prettier/prettier": "error",
      
      // Import sorting and organization
      "simple-import-sort/imports": [
        "error",
        {
          groups: [
            // Node.js builtins
            ["^node:"],
            // Packages starting with a letter (or digit or underscore), or `@` followed by a letter
            ["^@?\\w"],
            // Internal packages (adjust the pattern based on your project structure)
            ["^(@|~)/"],
            // Side effect imports
            ["^\\u0000"],
            // Parent imports. Put `..` last.
            ["^\\.\\.(?!/?$)", "^\\.\\./?$"],
            // Other relative imports. Put same-folder imports and `.` last.
            ["^\\./(?=.*/)(?!/?$)", "^\\.(?!/?$)", "^\\./?$"],
            // Style imports
            ["^.+\\.s?css$"],
          ],
        },
      ],
      "simple-import-sort/exports": "error",
      
      // Remove unused imports
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      
      // Import rules
      "import/first": "error",
      "import/newline-after-import": "error",
      "import/no-duplicates": "error",
      "import/no-unresolved": "off", // TypeScript handles this
      
      // React specific rules
      "react/jsx-sort-props": [
        "error",
        {
          callbacksLast: true,
          shorthandFirst: true,
          multiline: "last",
          reservedFirst: true,
        },
      ],
      
      // General formatting rules
      "object-curly-spacing": ["error", "always"],
      "array-bracket-spacing": ["error", "never"],
      "comma-dangle": ["error", "always-multiline"],
      "quotes": ["error", "double", { avoidEscape: true }],
      "jsx-quotes": ["error", "prefer-double"],
      "semi": ["error", "always"],
      
      // Enforce consistent naming
      "camelcase": [
        "error", 
        { 
          properties: "never", 
          ignoreDestructuring: true,
          allow: ["^[A-Z][a-zA-Z0-9_]*$"] // Allow PascalCase with underscores (for Next.js fonts, etc.)
        }
      ],
    },
    settings: {
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.json",
        },
        node: true,
      },
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "solidity/**", // Ignore Solidity files as they have their own linting
    ],
  },
];

export default eslintConfig;

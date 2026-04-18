import nextCoreWebVitals from "eslint-config-next/core-web-vitals"
import nextTypescript from "eslint-config-next/typescript"

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next/**",
      ".open-next/**",
      ".wrangler/**",
      ".opencode/**",
      ".codex/**",
      ".claude/**",
      ".pnpm-store/**",
      "node_modules/**",
    ],
  },
  {
    rules: {
      // New in eslint-plugin-react-hooks v7 (ships with React Compiler).
      // Flags canonical patterns (e.g. setMounted(true) for hydration) as errors.
      // Downgraded to warnings pending a per-case audit.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/use-memo": "warn",
      // Widespread in Cloudflare env casts and untyped boundaries.
      // Downgraded to warning pending a typing pass.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]

export default config

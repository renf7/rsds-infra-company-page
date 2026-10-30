# Free frontend static analysis

Run npm ci --ignore-scripts then npm run lint with Node 22. GitHub Actions runs the same locked tools on every PR update and main push, without credentials or a hosted scanner account.

The config runs ESLint's recommended JS checks on current public/language.js and configuration scripts. It enables React Hooks' recommended rules and jsx-a11y accessibility rules for JS/JSX/TS/TSX, and typescript-eslint recommendedTypeChecked rules (including no-floating-promises) on TS/TSX. Type-aware checks use the TypeScript project service and the committed tsconfig.json. Add real React/React DOM types and update the project config as part of RSDSINFRA-5 when implementing React. The lint tooling itself does not migrate the website or introduce a frontend build.

React/TypeScript files do not exist yet. Their configuration was verified with temporary negative probes for conditional hooks, missing image alt text and an unhandled Promise; all three rules detected the expected errors. The probes are not application source and are not committed. Current JavaScript passes npm run lint.

ESLint 9 is pinned for the current jsx-a11y peer-dependency compatibility; this major is deprecated upstream. Track migration to a supported ESLint major with compatible plugin releases rather than using --force/--legacy-peer-deps or silently disabling rules. Tool dependencies and integrity hashes are locked, and Dependabot monitors npm updates. No paid extended-support service is required or enabled.

Warnings fail CI (--max-warnings 0). Review narrow, justified exceptions rather than global disables. These are additional developer checks; retain CodeQL, Semgrep, Trivy and Sonar.

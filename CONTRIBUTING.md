# Contributing

Thank you for contributing to DesignEverything.

## Local checks

```bash
npm install
npm run build
npm run lint
npm test
```

Keep behavior changes in the core or shared adapter layer, with adapters limited
to injection, gating, and output. Every behavior change needs a matching test.
Missing signals must fail closed; do not turn an unknown condition into a pass.

## Commits and issues

Follow [Coding & Git Standard](Design/Conventions/Coding%20%26%20Git%20Standard.md)
for code and commit conventions. Open an issue with reproduction steps, expected
behavior, actual behavior, and the relevant command output before proposing a
larger change.

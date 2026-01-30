# Technical debt audit

> **Last updated:** 29 January 2026

This document analyses the balance between reusing existing libraries and the risk of over-dependence within the Atlas monorepo.

## Executive summary

| Metric                         | Value       |
| ------------------------------ | ----------- |
| Production dependencies        | 43 packages |
| Development dependencies       | 47 packages |
| Internal packages (workspace)  | 14          |
| Unused dependencies identified | 3           |
| Functional duplications        | 4           |

---

## 1. Philosophy: reuse vs reinvent

### 1.1 Arguments for reuse

- **Time saving**: Do not reimplement existing solutions
- **Quality**: Libraries tested by the community
- **Maintenance**: Security updates handled upstream
- **Documentation**: Existing resources available

### 1.2 Risks of over-dependence

- **Bundle size**: Impact on performance
- **Security**: Increased attack surface
- **Maintenance**: Cascading updates
- **Obsolescence**: Abandoned libraries
- **Complexity**: Version conflicts

---

## 2. Analysis of critical dependencies

### 2.1 Effect ecosystem (justified)

| Package            | Used by    | Size   | Verdict                               |
| ------------------ | ---------- | ------ | ------------------------------------- |
| `effect`           | 5 packages | ~150KB | **Essential** - Project architecture  |
| `@effect/platform` | 2 packages | ~50KB  | **Justified** - Platform abstractions |
| `@effect/cli`      | 2 packages | ~30KB  | **Justified** - Typed CLIs            |

**Conclusion**: The Effect ecosystem is the architectural core of Atlas. The debt is accepted.

### 2.2 Graph visualization (monitor)

| Package               | Used by | Size   | Verdict                                    |
| --------------------- | ------- | ------ | ------------------------------------------ |
| `graphology`          | ecrin   | ~100KB | **Justified** - No lightweight alternative |
| `sigma`               | ecrin   | ~200KB | **Justified** - High-performance WebGL     |
| `graphology-layout-*` | ecrin   | ~50KB  | **To evaluate** - 3 layout plugins         |

**Conclusion**: These dependencies are heavy but essential for ECRIN. Consider extracting them into an optional package.

### 2.3 Replaceable utilities

| Package  | Used by       | Native alternative    | Verdict                   |
| -------- | ------------- | --------------------- | ------------------------- |
| `uuid`   | ecrin         | `crypto.randomUUID()` | **Replaceable**           |
| `lodash` | ecrin         | Array/Object methods  | **Partially replaceable** |
| `luxon`  | amarre, ecrin | `Intl.DateTimeFormat` | **To evaluate**           |

---

## 3. Issues identified

### 3.1 Unused dependencies

| Package       | Location | Action                  |
| ------------- | -------- | ----------------------- |
| `vue-chartjs` | root     | **Remove** - Never used |
| `chart.js`    | root     | **Remove** - Never used |

### 3.2 Appwrite duplication

The `ecrin` package uses **two** Appwrite clients:

```json
{
  "appwrite": "21.5.0", // Browser client
  "node-appwrite": "17.0.1" // Server client
}
```

**Recommendation**: Use `node-appwrite` on the server side via `@univ-lehavre/atlas-appwrite`.

### 3.3 Misaligned versions

| Package      | Found versions                         | Recommendation  |
| ------------ | -------------------------------------- | --------------- |
| `simple-git` | 3.27.0 (root), 3.30.0 (find-an-expert) | Align on 3.30.0 |

### 3.4 Fragmented validation

- `zod` is used in amarre and find-an-expert
- `@univ-lehavre/atlas-validators` exists but does not use zod

**Recommendation**: Consolidate validation in the `validators` package using zod.

---

## 4. Single-use dependencies

These dependencies are used in a single package:

| Package                      | Used by        | Justification                            |
| ---------------------------- | -------------- | ---------------------------------------- |
| `hono-rate-limiter`          | crf            | **Justified** - Specific feature         |
| `openapi-response-validator` | ecrin          | **To evaluate** - Heavy for a single use |
| `@stoplight/prism-cli`       | crf (dev)      | **Justified** - Mock server for tests    |
| `swagger-ui-dist`            | find-an-expert | **Justified** - API documentation        |

---

## 5. What works well

### 5.1 Centralized configuration

`@univ-lehavre/atlas-shared-config` centralizes:

- ESLint 9.x
- Prettier 3.x
- TypeScript 5.x

**Result**: Consistency guaranteed, simplified maintenance.

### 5.2 Internal packages

The 14 workspace packages avoid duplication:

- `atlas-errors`: unified error handling
- `atlas-validators`: centralized validation
- `atlas-appwrite`: Appwrite abstraction
- `atlas-auth`: shared authentication

### 5.3 Coherent ecosystem

| Domain   | Choice                 | Coverage      |
| -------- | ---------------------- | ------------- |
| Frontend | Svelte 5 + SvelteKit 2 | 3/3 apps      |
| Backend  | Effect + Hono          | 2/2 services  |
| Tests    | Vitest                 | 100% packages |
| Build    | Vite + tsup            | 100% packages |

---

## 6. Action plan

### Priority 1 - Immediate cleanup

| Action                          | Impact               | Effort |
| ------------------------------- | -------------------- | ------ |
| Remove vue-chartjs and chart.js | Dependency reduction | Low    |
| Align simple-git version        | Consistency          | Low    |

### Priority 2 - Optimization

| Action                                | Impact        | Effort |
| ------------------------------------- | ------------- | ------ |
| Replace uuid with crypto.randomUUID() | -1 dependency | Low    |
| Consolidate Appwrite clients in ecrin | -1 dependency | Medium |
| Evaluate replacing lodash with native | -1 dependency | Medium |

### Priority 3 - Architecture

| Action                                 | Impact                 | Effort |
| -------------------------------------- | ---------------------- | ------ |
| Integrate zod into atlas-validators    | Validation consistency | Medium |
| Extract graphology as optional package | Modularity             | High   |

---

## 7. Tracking metrics

```bash
# Count unique dependencies
pnpm ls --depth 0 | wc -l

# Analyze unused dependencies
pnpm knip

# Check available updates
pnpm taze

# Audit vulnerabilities
pnpm audit
```

---

## 8. Conclusion

The Atlas monorepo maintains a **reasonable balance** between reuse and control:

- **Strengths**: Centralized configuration, well-structured internal packages, coherent ecosystem
- **Areas for improvement**: A few unused dependencies, Appwrite duplication, fragmented validation

The dependency-related technical debt remains **manageable** thanks to:

1. The use of pnpm (effective deduplication)
2. Workspace packages (internal reuse)
3. Coherent technology choices (Effect, Svelte, Vite)

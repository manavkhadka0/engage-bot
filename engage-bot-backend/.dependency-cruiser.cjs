/**
 * Architecture rules, enforced as a test (`pnpm test:arch`) rather than
 * left as tribal knowledge. This is dependency-cruiser, not a NestJS
 * plugin — it just parses the real import graph in src/ and fails on
 * whichever rule below is violated. Rules are scoped to this repo's
 * actual layering, not a generic template:
 *
 *   common/   — shared infra (Prisma, MQTT, storage, guards, decorators).
 *               The lowest layer: everything may depend on it, it must
 *               depend on nothing above it.
 *   modules/  — feature modules (devices, billing, tenants, ...). May use
 *               common/ and workers/ (e.g. CommandsService enqueues via
 *               CommandPublisher), and may use each other's public
 *               *.service.ts / *.module.ts, but not reach into another
 *               module's controller (an HTTP entry point, not an
 *               importable API) or worker internals.
 *   workers/  — background job processors (BullMQ) and MQTT ingestion.
 *               May use common/ and call into modules' services, but a
 *               feature module must go through a worker's public class
 *               (e.g. CommandPublisher), not its processor internals.
 *
 * See https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md
 */

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment:
        'A → B → A dependency cycles usually mean two things should be one module, or a shared piece needs to move down into common/.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      comment:
        'A file nothing imports and that imports nothing else is either dead code or missing from app.module.ts wiring. Entry points, module-wiring files and specs are expected to be "orphans" from the graph\'s point of view, so they\'re excluded here.',
      from: {
        orphan: true,
        pathNot: ['^src/main\\.ts$', '\\.module\\.ts$', '\\.spec\\.ts$', '^src/test/mocks/'],
      },
      to: {},
    },
    {
      name: 'common-must-not-import-modules-or-workers',
      severity: 'error',
      comment:
        'common/ is the lowest layer (Prisma, MQTT, storage, guards). If it starts importing a feature module or a worker, the layering has inverted — that dependency belongs in the module/worker instead.',
      from: { path: '^common/' },
      to: { path: '^(modules|workers)/' },
    },
    {
      name: 'controllers-are-not-a-library',
      severity: 'error',
      comment:
        "A controller is an HTTP entry point, wired into the app only by its own *.module.ts. If other code needs the same logic, it should depend on the module's service instead of importing its controller.",
      from: { pathNot: '\\.module\\.ts$' },
      to: { path: '\\.controller\\.ts$' },
    },
    {
      name: 'no-module-imports-of-worker-internals',
      severity: 'error',
      comment:
        'Feature modules may depend on a worker\'s public class (e.g. CommandPublisher), but not its processor/queue internals — those are wired through BullMQ, not called directly.',
      from: { path: '^modules/' },
      to: { path: '^workers/.*\\.processor\\.ts$' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: { exportsFields: ['exports'], conditionNames: ['import', 'require', 'node', 'default'] },
  },
};

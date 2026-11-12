'use strict'

// Edge-case packages on the real npm registry, used by the E2E suite.
//
// Selection criteria (verified live on 2026-11-12):
// - deprecated: the registry carries a `deprecated` message for the pinned
//   version — stable, years-old, and unmaintained, so the message will not
//   disappear. These exercise the deprecated-skip path in check-updates.js
//   and the "old but present" path in check-package-age.js.
// - very old: published many years ago, far beyond any minimum-age gate.
//
// Two requested categories are intentionally NOT here:
// - "yanked": npm has no yank operation. Packages are only removable by
//   unpublish within 72 hours of publish, after which they return 404 — the
//   same "does not exist" path already covered by the missing-package test.
// - "missing integrity": the registry backfilled `dist.integrity` onto even
//   pre-2017 packages (verified live: async@0.1.0, 2010, has both integrity
//   and shasum). A real missing-integrity document no longer exists on the
//   public registry, so that path is covered by synthetic mock fixtures in
//   the unit tests (check-lockfile-integrity.test.js), not here.

const DEPRECATED_PACKAGES = [
  {
    name: 'request',
    version: '2.88.2',
    // Fully deprecated since 2020; the deprecation message is permanent.
    description:
      'Deprecated HTTP library — registry carries a deprecation notice',
  },
  {
    name: 'left-pad',
    version: '1.3.0',
    // Deprecated 2018 ("use String.prototype.padStart()"); immutable.
    description: 'Classic deprecated package, stable since 2018',
  },
]

const VERY_OLD_PACKAGES = [
  {
    name: 'async',
    version: '0.1.0',
    // Published 2010-12-19 — the oldest reliably-resolvable line on npm.
    minExpectedAgeDays: 3650,
    description: 'Published 2010; far beyond any age gate',
  },
]

module.exports = { DEPRECATED_PACKAGES, VERY_OLD_PACKAGES }

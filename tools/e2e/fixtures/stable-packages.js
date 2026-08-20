'use strict'

// Stable, well-known npm packages used by the E2E suite.
// Versions are pinned to exact releases that have been available for a long
// time, reducing the chance of false negatives caused by recently published
// packages.
//
// Selection criteria:
// - Exact, immutable version.
// - Published more than 30 days ago.
// - Maintained by a trusted author/organization.
// - No known supply-chain incidents.

const STABLE_PACKAGES = [
  {
    name: 'lodash',
    version: '4.17.21',
    minExpectedAgeDays: 365,
    description:
      'Widely used utility library with a very stable release history',
  },
  {
    name: 'is-odd',
    version: '3.0.1',
    minExpectedAgeDays: 365,
    description:
      'Small, single-purpose package with no transitive dependencies',
  },
  {
    name: 'semver',
    version: '7.6.3',
    minExpectedAgeDays: 30,
    description:
      'Semantic versioning library used internally by npm and Node.js',
  },
]

module.exports = { STABLE_PACKAGES }

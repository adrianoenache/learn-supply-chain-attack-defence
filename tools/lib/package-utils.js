'use strict'

// Shared utilities for parsing and validating npm package specifiers.
// Used by check-package-age.js and add-package.js to avoid duplication.
// Only native Node.js modules are used here so these helpers remain safe
// to import before any third-party dependencies are installed.

// Validates allowed characters in npm package names, including scoped
// packages (@org/name). Rejects shell metacharacters (;, &, |, $, `, \,
// <, >, !), spaces, and quotes before the value is passed to execSync or
// to the npm registry.
//
// Accepts: lodash@4.17.21, @types/node@22.15.3, my-pkg@1.0.0-beta.1
// Rejects: any input with shell injection characters.
//
// npm naming reference: https://docs.npmjs.com/cli/v10/configuring-npm/package-json#name
const VALID_PKG_SPECIFIER_RE =
  /^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*(@\d+\.\d+\.\d+[a-z0-9._+-]*)?$/i

// Decomposes "name@version" or "@scope/name@version" into name and version.
// For scoped packages the leading @ is preserved by stripping it first,
// locating the next @ (version separator), then rebuilding the scope.
// Returns { name, version } where version is null when no version was provided.
function parsePackageArg(input) {
  if (input.startsWith('@')) {
    const withoutLeadingAt = input.slice(1) // "org/name@version"
    const atIdx = withoutLeadingAt.indexOf('@')
    if (atIdx === -1) return { name: input, version: null }
    return {
      name: `@${withoutLeadingAt.slice(0, atIdx)}`, // "@org/name"
      version: withoutLeadingAt.slice(atIdx + 1), // "x.y.z"
    }
  }

  const atIdx = input.indexOf('@')
  if (atIdx === -1) return { name: input, version: null }
  return { name: input.slice(0, atIdx), version: input.slice(atIdx + 1) }
}

module.exports = { VALID_PKG_SPECIFIER_RE, parsePackageArg }

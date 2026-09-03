# Rebuilding Lifecycle-Script Packages

This project sets `ignore-scripts=true` in `.npmrc` so npm does not run `preinstall`, `install`, `postinstall`, or other lifecycle scripts automatically. This is a deliberate defense against install-time malware: a compromised package cannot execute arbitrary code during `npm install`.

Some legitimate packages, however, need to build native binaries during install. Common examples include:

- `esbuild` — downloads or compiles a platform-specific binary.
- `sharp` — compiles native bindings for image processing.
- `canvas` — compiles Cairo / Pango bindings.
- `sqlite3`, `bcrypt`, `node-sass` — compile native modules.

This guide explains how to safely rebuild these packages after the initial `ignore-scripts` install.

---

## When Is a Rebuild Needed?

You need to rebuild a lifecycle-script package when:

- The package printed a warning about a missing binary after `npm ci` or `npm run setup`.
- A command fails with `Cannot find module ...` pointing to a `.node` native binding.
- You changed Node.js version or platform (for example, switched from Linux to WSL, or from x64 to ARM64).
- The package documentation explicitly tells you to run `npm rebuild <pkg>` after install.

You do **not** need to rebuild packages that are pure JavaScript or that ship prebuilt binaries checked into the package tarball.

---

## General Rebuild Procedure

### 1. Confirm the Package Is Trustworthy

Before running any lifecycle scripts, verify the package identity:

```bash
npm view <package-name>@<version> --json | jq '.dist.integrity, .published, .maintainers'
```

Check that:

- The version was published more than 7 days ago (matches your `min-release-age`).
- The package has verified signatures (`npm audit signatures`).
- It is the package you intended to install, not a typosquat.

If you are unsure, use the controlled dependency addition path:

```bash
npm run defence:add -- <package-name>@<version>
```

### 2. Rebuild Only the Affected Package

Run the rebuild for one package at a time so you can observe the output:

```bash
npm rebuild esbuild
```

For multiple related packages, list them explicitly:

```bash
npm rebuild esbuild sharp canvas
```

Avoid `npm rebuild` without arguments on a large dependency tree, because it will run scripts for every native package and broaden the blast radius if one of them is malicious.

### 3. Inspect the Output

Watch for:

- Network downloads to unexpected hosts.
- Compilation errors pointing to missing system libraries.
- Post-install messages that ask you to run additional commands.

If the output looks suspicious, stop immediately, remove `node_modules/<package-name>`, and investigate before continuing.

### 4. Verify Functionality

Run the part of your application that uses the rebuilt package. For example:

```bash
node -e "require('esbuild').version"
node -e "require('sharp')"
```

If the require succeeds and the expected version is reported, the rebuild worked.

### 5. Commit No New Secrets

Some rebuild steps create temporary files or download scripts. Run the secret scanner and sync check before committing:

```bash
npm run defence:check-secrets
npm run defence:sync-check
```

---

## Package-Specific Notes

### esbuild

`esbuild` ships prebuilt binaries for most platforms. If `ignore-scripts` prevented the binary download, run:

```bash
npm rebuild esbuild
```

On restricted networks, you can also download the binary manually and point `ESBUILD_BINARY_PATH` to it. See the [esbuild documentation](https://esbuild.github.io/getting-started/#download-a-build) for platform-specific binaries.

### sharp

`sharp` usually downloads a prebuilt libvips binary. If that step was skipped:

```bash
npm rebuild sharp
```

On Alpine Linux or minimal containers you may need system packages first:

```bash
# Debian/Ubuntu/WSL
sudo apt-get install -y libvips-dev

# Alpine
apk add --no-cache vips-dev
```

### canvas

`canvas` requires Cairo and Pango. After installing system dependencies:

```bash
# Debian/Ubuntu/WSL
sudo apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

npm rebuild canvas
```

---

## Reducing the Need to Rebuild

If you find yourself rebuilding frequently, consider these safer alternatives:

1. **Prefer pure-JavaScript packages** when performance is acceptable. They have no native build step.
2. **Pin prebuilt-binary packages** with exact versions and verified integrity so `npm ci` can use cached artifacts.
3. **Containerize the build environment** so rebuilds happen in an isolated, reproducible image instead of on developer machines.
4. **Vendor prebuilt binaries** in a private registry or artifact store and point npm to them with `.npmrc` overrides for trusted scopes only.

---

## What If a Rebuild Fails?

1. Check the error message for missing system libraries and install them.
2. Delete the package directory and reinstall deterministically:

```bash
rm -rf node_modules/<package-name> package-lock.json
npm run defence:add -- <package-name>@<version>
npm rebuild <package-name>
```

3. If the failure persists, consult the package's own troubleshooting guide and the [project troubleshooting guide](../troubleshooting.md).

---

## Summary

- `ignore-scripts=true` blocks install-time code execution.
- Rebuild only packages you trust, one at a time, after verifying signatures and age.
- Inspect rebuild output and verify the package loads afterward.
- Run `defence:check-secrets` and `defence:sync-check` before committing.

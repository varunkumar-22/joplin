# plugin-source-builder

A proof of concept for the Joplin GSoC 2026 project **"Strengthen the Security of the Plugin Ecosystem"**.

## What this proves

The current Joplin plugin pipeline installs plugins from pre-built npm packages. There is no way to verify that what was published to npm matches the source code that was reviewed. A malicious publisher could review one version and publish a different binary.

This PoC replaces `extractPluginFilesFromPackage()` with `buildPluginFromSource()`: instead of pulling a pre-built package, the pipeline clones the plugin repository at an exact reviewed commit hash, builds it from source, and stamps the resulting manifest with review metadata before it ever reaches a user's machine.

The security properties this demonstrates:

- The binary a user installs is built from the exact commit a human reviewed : not from whatever the publisher pushed to npm
- `npm install --ignore-scripts` prevents postinstall/preinstall scripts from running during the build, blocking a whole class of supply chain attacks
- Any plugin whose status is not `"approved"` is rejected before a single network call is made
- The stamped `_reviewed_commit` in `manifest.json` gives users and auditors a verifiable trail back to the reviewed source

## How it fits into the proposal

The full proposal extends this pattern across the entire Joplin plugin repository pipeline. This PoC covers the core function : `buildPluginFromSource()` - which is the piece that needs the most validation before the rest of the proposal can be scoped.

## Project structure

```
packages/plugin-source-builder/
├── approved-plugins.json        real plugin entries with reviewed commit hashes
├── index.ts                     CLI entry point (build command)
├── lib/
│   ├── types.ts                 shared TypeScript interfaces
│   ├── buildPluginFromSource.ts core build pipeline
│   ├── buildPluginFromSource.test.ts
│   ├── validateApprovedPlugin.ts
│   └── validateApprovedPlugin.test.ts
└── output/                      built .jpl files land here
```

## Running it

Install dependencies from the Joplin repo root:

```bash
yarn install
```

Compile TypeScript:

```bash
cd packages/plugin-source-builder
npx tsc --project tsconfig.json
```

Build all approved plugins:

```bash
node index.js build
```

Build a specific plugin by ID:

```bash
node index.js build --id io.github.jackgruber.backup
```

Expected output:

```
✓ Cloning JackGruber/joplin-plugin-backup @ 6a19251...
✓ npm install --ignore-scripts
✓ npm run dist → publish/plugin.jpl
✓ Stamped manifest:
    _review_status:   "reviewed"
    _reviewed_commit: "6a19251..."
    _review_date:     "2026-03-14"
✓ Output: ./output/io.github.jackgruber.backup.jpl
BUILD SUCCESSFUL
```

## Running the tests

```bash
cd packages/plugin-source-builder
yarn test
```

7 tests across two files:

`buildPluginFromSource.test.ts` (4 tests):
- Builds a real plugin from source and produces a `.jpl` file
- Stamps `_review_status`, `_reviewed_commit`, and `_review_date` onto the manifest
- Refuses to build a plugin whose status is `"pending"`
- Always passes `--ignore-scripts` to `npm install`

`validateApprovedPlugin.test.ts` (3 tests):
- Accepts a valid approved-plugins.json entry
- Rejects an entry with a missing `reviewed_commit`
- Rejects an entry with an invalid or missing `repository_url`

The builder tests clone and build a real plugin over the network. They run with a 3-minute timeout and require git and npm to be available.

## Verifying the output

After a successful build, inspect the stamped manifest inside the `.jpl` (which is a zip file):

```bash
cd packages/plugin-source-builder/output
unzip -p io.github.jackgruber.backup.jpl manifest.json | python3 -m json.tool
```

You should see `_review_status`, `_reviewed_commit`, and `_review_date` fields at the bottom of the manifest. The accompanying `io.github.jackgruber.backup.manifest.json` in the output directory has the same content in readable form.

## GSoC proposal

Proposal: "Strengthen the Security of the Plugin Ecosystem" <br>
Applicant: Sriram Varun Kumar

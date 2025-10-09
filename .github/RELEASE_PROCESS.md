# Release Process

This repository uses automatic release notes and automated npm publishing.

## 🚀 How to Create a Release

### Step 1: Setup Labels (First Time Only)

Create the labels for automatic categorization:

```bash
gh label create breaking-change --description "Breaking change" --color d73a4a
gh label create feature --description "New feature" --color a2eeef
gh label create bug --description "Bug fix" --color d73a4a
gh label create improvement --description "Code improvement" --color 0e8a16
gh label create documentation --description "Documentation" --color 0075ca
gh label create test --description "Testing" --color d4c5f9
gh label create chore --description "Chore" --color fef2c0
```

### Step 2: Label Your PRs

When creating or merging PRs, add appropriate labels:
- `breaking-change` - Breaking changes (major version)
- `feature` - New features (minor version)
- `bug` or `fix` - Bug fixes (patch version)
- `improvement`, `refactor`, `performance` - Improvements
- `documentation` or `docs` - Documentation
- `test` - Testing changes
- `chore` - Maintenance tasks

### Step 3: Create a Release

#### Option A: Using GitHub UI

1. Go to: https://github.com/nekuda-ai/acp-validation-cli/releases/new
2. Click "Choose a tag" → Type new tag: `v0.2.0`
3. Click "Create new tag on publish"
4. Release title: `v0.2.0`
5. Click "Generate release notes" button
6. Review and edit the auto-generated notes if needed
7. Click "Publish release"

#### Option B: Using GitHub CLI

```bash
# Create a release with auto-generated notes
gh release create v0.2.0 \
  --title "v0.2.0" \
  --generate-notes

# Or create as draft first
gh release create v0.2.0 \
  --title "v0.2.0" \
  --generate-notes \
  --draft
```

### Step 4: Automatic Publishing

Once you publish the release:

1. ✅ GitHub Actions workflow triggers automatically
2. ✅ Runs tests and type checks
3. ✅ Builds the package
4. ✅ Updates package.json version to match tag
5. ✅ Publishes to npm with provenance
6. ✅ Updates release notes with npm package info

## 📋 Example Release Notes

GitHub will automatically generate release notes like this:

```markdown
## What's Changed

### ✨ New Features
* Add interactive prompting by @username in #12
* Add ink TUI support by @username in #15

### 🐛 Bug Fixes
* Fix order object structure by @username in #18

### 🔧 Improvements
* Refactor command structure by @username in #14

**Full Changelog**: https://github.com/nekuda-ai/acp-validation-cli/compare/v0.1.0...v0.2.0

---

## 📦 npm Package

**Published:** `@nekuda/acp-test@0.2.0`

### Installation

\`\`\`bash
npm install -g @nekuda/acp-test@0.2.0
\`\`\`

### Usage

\`\`\`bash
acp-test --help
\`\`\`

**npm Registry:** https://www.npmjs.com/package/@nekuda/acp-test
```

## 🔐 Required Setup

### NPM Token

1. Create token at: https://www.npmjs.com/settings/tokens
2. Token type: "Granular Access Token"
3. Packages: Select `@nekuda/acp-test` (read and write)
4. Add to GitHub secrets: https://github.com/nekuda-ai/acp-validation-cli/settings/secrets/actions
5. Secret name: `NPM_TOKEN`

## 📌 Versioning

Follow [Semantic Versioning](https://semver.org/):

- **Major (v1.0.0 → v2.0.0)**: Breaking changes
- **Minor (v1.0.0 → v1.1.0)**: New features (backward compatible)
- **Patch (v1.0.0 → v1.0.1)**: Bug fixes (backward compatible)

## 🎯 Best Practices

1. **Always use PRs**: Commits directly to main won't appear in release notes
2. **Label PRs before merging**: Labels determine categorization
3. **Write good PR titles**: They appear as-is in release notes
4. **Review generated notes**: Edit before publishing if needed
5. **Test before releasing**: Ensure all tests pass on main branch
6. **Use conventional commits**: Helps with future automation

## 🔄 Manual Publishing (Emergency Only)

If you need to publish without a release:

1. Go to Actions tab
2. Select "Publish to npm" workflow
3. Click "Run workflow"
4. Enter version (e.g., `0.2.1`)
5. Click "Run workflow"

This bypasses the release notes but still runs all checks.

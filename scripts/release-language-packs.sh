#!/bin/bash
set -e

# Language Pack Release Script
# Uploads all language databases to GitHub Releases

REPO="Thxamillion/fluentwhisper"
VERSION="v1.0.0"
RELEASE_TITLE="Language Packs v1.0.0"
RELEASE_NOTES="Complete bidirectional language packs for Spanish, French, German, and Italian.

**Lemma Databases:**
- Spanish (es): 66 MB
- French (fr): 3 MB
- German (de): 7.8 MB
- Italian (it): 4.3 MB
- English (en): 11 MB (bundled in app)

**Translation Databases (bidirectional):**
- Spanish ↔ English (17 MB)
- English ↔ French (31 MB)
- English ↔ German (35 MB)
- English ↔ Italian (50 MB)
- Spanish ↔ French (31 MB)
- Spanish ↔ German (32 MB)
- Spanish ↔ Italian (40 MB)
- French ↔ German (30 MB)
- French ↔ Italian (38 MB)
- German ↔ Italian (39 MB)

**Total Size:** 371 MB supporting 5 languages with 10 translation pairs.

Built with automatic sparse augmentation for consistent bidirectional coverage."

echo "============================================"
echo "  Language Pack Release Script"
echo "============================================"
echo ""
echo "Repository: $REPO"
echo "Version: $VERSION"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ Error: GitHub CLI (gh) is not installed"
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Error: Not authenticated with GitHub"
    echo "Run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI authenticated"
echo ""

# Check if release already exists
if gh release view "$VERSION" --repo "$REPO" &> /dev/null; then
    echo "⚠️  Release $VERSION already exists"
    read -p "Delete and recreate? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  Deleting existing release..."
        gh release delete "$VERSION" --repo "$REPO" --yes
    else
        echo "❌ Aborted"
        exit 1
    fi
fi

echo "📦 Creating release $VERSION..."
gh release create "$VERSION" \
    --repo "$REPO" \
    --title "$RELEASE_TITLE" \
    --notes "$RELEASE_NOTES" \
    --draft

echo ""
echo "✅ Release created (draft mode)"
echo ""
echo "📤 Uploading language pack files..."
echo "   This may take several minutes (~371 MB total)..."
echo ""

# Upload lemma databases (copying with new names)
echo "📚 Uploading lemma databases..."

# We need to rename files, so copy them temporarily
cp langpacks/es/lemmas.db /tmp/es-lemmas.db
cp langpacks/fr/lemmas.db /tmp/fr-lemmas.db
cp langpacks/de/lemmas.db /tmp/de-lemmas.db
cp langpacks/it/lemmas.db /tmp/it-lemmas.db

gh release upload "$VERSION" \
    /tmp/es-lemmas.db \
    /tmp/fr-lemmas.db \
    /tmp/de-lemmas.db \
    /tmp/it-lemmas.db \
    --repo "$REPO" \
    --clobber

# Clean up temp files
rm /tmp/es-lemmas.db /tmp/fr-lemmas.db /tmp/de-lemmas.db /tmp/it-lemmas.db

echo "✅ Lemma databases uploaded"
echo ""

# Upload translation databases
echo "🔄 Uploading translation databases..."
gh release upload "$VERSION" \
    translations/es-en.db \
    translations/en-fr.db \
    translations/en-de.db \
    translations/en-it.db \
    translations/es-fr.db \
    translations/es-de.db \
    translations/es-it.db \
    translations/fr-de.db \
    translations/fr-it.db \
    translations/de-it.db \
    --repo "$REPO" \
    --clobber

echo "✅ Translation databases uploaded"
echo ""

# Publish the release (remove draft status)
echo "🚀 Publishing release..."
gh release edit "$VERSION" --repo "$REPO" --draft=false

echo ""
echo "============================================"
echo "  ✅ Release Complete!"
echo "============================================"
echo ""
echo "View release at:"
echo "https://github.com/$REPO/releases/tag/$VERSION"
echo ""
echo "Next step: Update public/language-packs.json with real URLs"
echo ""

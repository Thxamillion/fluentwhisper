#!/bin/bash
set -e

# Update manifest URLs with real GitHub release URLs

REPO="Thxamillion/fluentwhisper"
VERSION="v1.0.0"
BASE_URL="https://github.com/$REPO/releases/download/$VERSION"

MANIFEST_FILE="public/language-packs.json"

echo "============================================"
echo "  Update Manifest URLs"
echo "============================================"
echo ""
echo "Updating: $MANIFEST_FILE"
echo "Base URL: $BASE_URL"
echo ""

# Check if manifest exists
if [ ! -f "$MANIFEST_FILE" ]; then
    echo "❌ Error: Manifest file not found at $MANIFEST_FILE"
    exit 1
fi

# Create backup
cp "$MANIFEST_FILE" "${MANIFEST_FILE}.backup"
echo "✅ Created backup: ${MANIFEST_FILE}.backup"

# Update URLs using sed (works on macOS and Linux)
sed -i '' "s|https://github.com/USER/REPO/releases/download/v1.0.0|$BASE_URL|g" "$MANIFEST_FILE"

echo "✅ Updated all URLs in manifest"
echo ""
echo "Changes:"
echo "  USER/REPO → $REPO"
echo ""
echo "Verify the changes:"
echo "  cat $MANIFEST_FILE"
echo ""

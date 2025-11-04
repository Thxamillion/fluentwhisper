#!/bin/bash
set -e

# Fresh Start Script
# Clears all app data to test download system from scratch

echo "============================================"
echo "  Fresh Start - Clear All App Data"
echo "============================================"
echo ""
echo "⚠️  This will delete:"
echo "  - All user data (vocabulary, sessions, etc.)"
echo "  - All downloaded language packs"
echo "  - All settings"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Aborted"
    exit 1
fi

APP_DATA_DIR=~/Library/Application\ Support/fluentwhisper

if [ -d "$APP_DATA_DIR" ]; then
    echo "🗑️  Deleting app data directory..."
    rm -rf "$APP_DATA_DIR"
    echo "✅ Deleted: $APP_DATA_DIR"
else
    echo "ℹ️  No app data found (already clean)"
fi

echo ""
echo "⚠️  IMPORTANT: You also need to clear browser storage!"
echo ""
echo "In the app, open DevTools (Cmd+Option+I) and run:"
echo "  localStorage.clear()"
echo "  location.reload()"
echo ""
echo "This will clear:"
echo "  - onboarding_completed flag"
echo "  - Zustand settings store"
echo "  - Any other localStorage data"
echo ""
echo "✅ App data cleared!"
echo ""
echo "Next steps:"
echo "  1. Run the app: bun tauri dev"
echo "  2. Clear localStorage in DevTools (see above)"
echo "  3. Go through onboarding"
echo "  4. Watch language packs download from GitHub!"
echo ""

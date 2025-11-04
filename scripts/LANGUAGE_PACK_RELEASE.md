# Language Pack Release Guide

## Quick Start (2 commands)

```bash
# 1. Upload all language packs to GitHub Releases (~2-5 minutes)
./scripts/release-language-packs.sh

# 2. Update manifest with real URLs (~1 second)
./scripts/update-manifest-urls.sh
```

That's it! Your language packs are now live and ready to download.

---

## What the scripts do

### Script 1: `release-language-packs.sh`
- Creates GitHub Release `v1.0.0`
- Uploads 4 lemma databases (es, fr, de, it)
- Uploads 10 translation databases (all bidirectional pairs)
- Total upload: ~371 MB
- Time: 2-5 minutes depending on your internet speed

### Script 2: `update-manifest-urls.sh`
- Updates `public/language-packs.json`
- Replaces placeholder URLs with real GitHub URLs
- Creates backup of old manifest

---

## Verification

After running both scripts:

1. **Check the release:**
   ```bash
   open https://github.com/Thxamillion/fluentwhisper/releases/tag/v1.0.0
   ```

2. **Verify manifest:**
   ```bash
   cat public/language-packs.json | grep "https://github.com/Thxamillion"
   ```
   Should show all real URLs (not USER/REPO placeholders)

3. **Test a download URL:**
   ```bash
   curl -I https://github.com/Thxamillion/fluentwhisper/releases/download/v1.0.0/es-lemmas.db
   ```
   Should return `HTTP/2 302` (redirect to CDN) - this means it works!

---

## Troubleshooting

**"gh: command not found"**
- Install GitHub CLI: `brew install gh`

**"Not authenticated with GitHub"**
- Run: `gh auth login`
- Follow the prompts

**"Release already exists"**
- The script will ask if you want to delete and recreate
- Say `y` to overwrite

**Upload fails partway through**
- The script uses `--clobber` flag
- Just re-run it - it will resume/overwrite

---

## What happens next?

Once both scripts complete:

1. ✅ All language packs are publicly downloadable
2. ✅ Manifest points to real URLs
3. ✅ Frontend will auto-download packs when users select languages
4. ✅ Progress bars will show during download
5. ✅ Everything works offline after download

---

## File sizes (for reference)

**Lemmas:**
- Spanish: 66 MB
- French: 3 MB
- German: 7.8 MB
- Italian: 4.3 MB

**Translations:**
- es-en: 17 MB
- en-fr: 31 MB
- en-de: 35 MB
- en-it: 50 MB
- es-fr: 31 MB
- es-de: 32 MB
- es-it: 40 MB
- fr-de: 30 MB
- fr-it: 38 MB
- de-it: 39 MB

**Total: 371 MB**

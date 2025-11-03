## Tauri Updates and Distribution

This document explains how updates work for a Tauri app, how to publish downloadable installers on your website, and a draft plan to implement the whole pipeline.

### How Tauri updates work
- On launch (or when triggered), the app fetches a JSON manifest from your hosted endpoint(s).
- The app compares its version to the manifest; if newer is available, it downloads the new installer/bundle.
- The update is verified using your embedded Ed25519 public key, installed, and the app restarts.

### One-time setup
- Keypair for updater
  - Generate Ed25519 keys: `tauri signer generate`
  - Store `TAURI_PRIVATE_KEY` and `TAURI_KEY_PASSWORD` as CI secrets
  - Embed the public key in `tauri.conf.json`
- Code signing per OS
  - macOS: Apple Developer ID signing + notarization
  - Windows: Code-sign (`.exe`/`.msi`), EV certificate recommended
  - Linux: Provide signed artifacts as applicable (AppImage/Deb/RPM)
- Hosting
  - Option A: GitHub Releases via CI (recommended to start)
  - Option B: Self-host on S3/CloudFront or your server/CDN

### `tauri.conf.json` updater config (example)
```json
{
  "tauri": {
    "updater": {
      "active": true,
      "dialog": true,
      "endpoints": [
        "https://your.cdn.com/updates/latest.json"
      ],
      "pubkey": "YOUR_BASE64_PUBLIC_KEY"
    }
  }
}
```

### Release manifest (`latest.json`) example
Tauri 1.x multi-platform manifest. One file per release that lists each platform/arch artifact with a signature and URL.

```json
{
  "version": "1.2.3",
  "notes": "Bug fixes and improvements.",
  "pub_date": "2025-10-30T12:00:00Z",
  "platforms": {
    "darwin-aarch64": {
      "signature": "BASE64_SIGNATURE",
      "url": "https://your.cdn.com/yourapp-1.2.3-aarch64.dmg"
    },
    "darwin-x86_64": {
      "signature": "BASE64_SIGNATURE",
      "url": "https://your.cdn.com/yourapp-1.2.3-x64.dmg"
    },
    "windows-x86_64": {
      "signature": "BASE64_SIGNATURE",
      "url": "https://your.cdn.com/YourApp_1.2.3_x64-setup.exe"
    },
    "linux-x86_64": {
      "signature": "BASE64_SIGNATURE",
      "url": "https://your.cdn.com/yourapp_1.2.3_amd64.AppImage"
    }
  }
}
```

### Triggering updates in code (optional custom UI)
```ts
import { checkUpdate, installUpdate } from '@tauri-apps/api/updater';
import { relaunch } from '@tauri-apps/api/process';

const { shouldUpdate, manifest } = await checkUpdate();
if (shouldUpdate) {
  await installUpdate();
  await relaunch();
}
```

You can also listen to updater events like `tauri://update-available` and `tauri://update-status` for progress UI.

### Making downloads available on your website
- Host installers from your CI (GitHub Releases or your CDN)
- Add "Download for macOS / Windows / Linux" buttons that link directly to artifacts
- Optionally publish checksums, signatures, and release notes
- The auto-update manifest (`latest.json`) can live at the same CDN origin; the app hits this JSON directly

### Release flow (how you "send" an update)
1) Bump app version (in your package and/or `tauri.conf.json`)
2) Create a tag/release → CI builds installers for all OSes
3) CI signs/notarizes where needed, generates signatures, and publishes artifacts + `latest.json`
4) Users get the update on next launch (or immediately if you call `checkUpdate()`)

### Channels and rollouts
- Maintain separate endpoints/manifests for stable and beta
- Phased rollout: update beta first, then switch stable’s `latest.json` to the new version
- Roll back by reverting stable’s manifest to the previous version

### Security essentials
- Embed only the public key; keep the private key in CI secrets
- Always serve manifests and installers over HTTPS
- macOS: sign + notarize to avoid Gatekeeper warnings

### Quick-start options
- GitHub Releases + GitHub Actions
  - Use `tauri-apps/tauri-action` with `TAURI_PRIVATE_KEY`, Apple notarization env, and Windows code-signing
  - Action uploads installers and `latest.json` to the release
  - Point `endpoints` to the release-hosted `latest.json` URL
- Self-hosted (S3/CloudFront)
  - Upload installers and `latest.json` to your bucket
  - Set CDN URL in `endpoints`

---

## Draft Implementation Plan

- Configure updater keys
  - Generate Ed25519 keys with `tauri signer generate`
  - Store `TAURI_PRIVATE_KEY` and `TAURI_KEY_PASSWORD` in CI secrets
  - Add `pubkey` to `tauri.conf.json`

- Enable updater in `tauri.conf.json`
  - Set `active: true`, `dialog: true`
  - Add `endpoints` for stable (and beta if needed)

- CI/CD setup
  - GitHub Actions: integrate `tauri-apps/tauri-action`
  - Configure Apple notarization and Windows code-signing
  - Publish installers and `latest.json` on tag push

- Website download page
  - Add buttons for macOS/Windows/Linux pointing to artifacts
  - Optional: display current version, checksums, and release notes

- Update UX in app (optional)
  - Add a manual "Check for updates" action using `checkUpdate()`
  - Subscribe to updater events for progress UI

- Channels and rollout
  - Create separate `latest.json` for beta
  - Document the promotion/rollback steps

- Security & verification
  - Enforce HTTPS for all endpoints
  - Verify notarization/signing in CI logs; keep private keys secret

- Test end-to-end
  - Dry-run a pre-release to verify auto-update on each OS/arch
  - Validate signature checks, download integrity, and restart

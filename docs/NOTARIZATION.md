# macOS Code Signing & Notarization

This document explains how FluentDiary is configured for macOS code signing and notarization.

## Why Notarization?

macOS requires notarization for apps distributed outside the Mac App Store. Without it:
- Users see scary security warnings
- Gatekeeper blocks the app by default
- Users must use workarounds to run the app

With notarization:
- Seamless installation experience
- No security warnings
- Professional distribution

## Prerequisites

1. **Apple Developer Account** ($99/year)
2. **Developer ID Application Certificate** installed in Keychain
3. **App-Specific Password** for notarization

## Setup Steps

### 1. Create Developer ID Certificate

1. Log into https://developer.apple.com/account
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Certificates** → **+** button
4. Select **G2 Sub-CA** (current standard)
5. Select **Developer ID Application**
6. Generate a Certificate Signing Request (CSR):
   - Open **Keychain Access**
   - **Keychain Access** → **Certificate Assistant** → **Request a Certificate From a Certificate Authority**
   - Fill in email and name, select "Saved to disk"
   - Key Size: 2048 bits, Algorithm: RSA
7. Upload CSR to Apple Developer portal
8. Download and install the certificate (double-click the `.cer` file)

### 2. Generate App-Specific Password

1. Go to https://appleid.apple.com
2. Navigate to **Security** → **App-Specific Passwords**
3. Generate a new password
4. Label it "FluentDiary Notarization"
5. **Save it immediately** (you can't see it again!)

### 3. Configure Environment Variables

Create/update `.env` file in project root:

```bash
# macOS Code Signing & Notarization
APPLE_ID=your-apple-id@email.com
APPLE_PASSWORD=your-app-specific-password
APPLE_TEAM_ID=your-team-id
```

**IMPORTANT**: Never commit `.env` to git. It's already in `.gitignore`.

### 4. Verify Certificate Installation

Run in Terminal:
```bash
security find-identity -v -p codesigning
```

You should see:
```
2) 73C33... "Developer ID Application: Quin Ortiz (3ACAJCX8FW)"
```

## Configuration

The project is configured in `src-tauri/tauri.conf.json`:

```json
{
  "bundle": {
    "macOS": {
      "signingIdentity": "Developer ID Application: Quin Ortiz (3ACAJCX8FW)",
      "providerShortName": "3ACAJCX8FW",
      "entitlements": null
    }
  }
}
```

## Building with Notarization

When you run:
```bash
bun run tauri build
```

Tauri will automatically:
1. Sign the app with your Developer ID certificate
2. Create a DMG installer
3. Submit the DMG to Apple for notarization
4. Wait for notarization approval
5. Staple the notarization ticket to the DMG

This process takes **2-5 minutes** after the build completes.

## Troubleshooting

### "No valid signing identity found"
- Ensure certificate is installed in **login** keychain
- Run `security find-identity -v -p codesigning` to verify

### "Authentication failed"
- Check `APPLE_ID` and `APPLE_PASSWORD` in `.env`
- Generate a new app-specific password if needed

### "Invalid provider"
- Verify `APPLE_TEAM_ID` matches your Apple Developer Team ID
- Find it at https://developer.apple.com/account (Membership section)

### Notarization takes too long
- Normal: 2-5 minutes
- Check status: `xcrun notarytool history --apple-id your@email.com --team-id TEAM_ID`

## CI/CD Setup

For GitHub Actions or other CI/CD:

1. Add secrets to your repository:
   - `APPLE_CERTIFICATE` (base64-encoded p12 file)
   - `APPLE_CERTIFICATE_PASSWORD`
   - `APPLE_ID`
   - `APPLE_PASSWORD`
   - `APPLE_TEAM_ID`

2. In your workflow, import the certificate and set environment variables before building

## References

- [Tauri Code Signing Guide](https://tauri.app/v1/guides/distribution/sign-macos/)
- [Apple Notarization Documentation](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Creating Developer ID Certificates](https://developer.apple.com/help/account/create-certificates/create-developer-id-certificates)

## Current Configuration

- **Signing Identity**: Developer ID Application: Quin Ortiz (3ACAJCX8FW)
- **Team ID**: 3ACAJCX8FW
- **Min macOS Version**: 10.15 (Catalina)
- **Bundle ID**: com.fluentdiary.desktop

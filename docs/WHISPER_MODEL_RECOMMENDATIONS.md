# Whisper Model Recommendations

FluentWhisper uses intelligent system detection to recommend the best Whisper model for your hardware. This document explains how the recommendation system works and what to expect from each model.

## Table of Contents

1. [Model Overview](#model-overview)
2. [Recommendation Logic](#recommendation-logic)
3. [Performance Characteristics](#performance-characteristics)
4. [System Requirements](#system-requirements)
5. [Choosing the Right Model](#choosing-the-right-model)

---

## Model Overview

FluentWhisper supports 7 Whisper models ranging from tiny (fastest) to large-v3 (most accurate):

| Model | Size | Description | Premium Required |
|-------|------|-------------|------------------|
| **Tiny** | 75 MB | Fastest, lowest accuracy | No |
| **Base** | 142 MB | Good balance | No |
| **Small** | 466 MB | Better accuracy | No |
| **Medium** | 1.5 GB | High accuracy | No |
| **Large** | 2.9 GB | Highest accuracy | Yes |
| **Large-v2** | 2.9 GB | Improved | Yes |
| **Large-v3** | 2.9 GB | Newest and best | Yes |

---

## Recommendation Logic

The app automatically detects your system specs and recommends a model based on:

- **Total RAM (GB)**
- **CPU core count**
- **CPU brand/model**

### Recommendation Rules

```
IF 16GB+ RAM AND 8+ cores:
  → Recommend: Small
  → Why: Sweet spot for high-end systems

ELSE IF 8GB+ RAM AND 4+ cores:
  → Recommend: Base
  → Why: Good balance for mid-range systems

ELSE:
  → Recommend: Tiny
  → Why: Fast enough for lower-end systems
```

### Why Not Recommend "Large" Models?

Even on powerful systems, we **don't** recommend Large/Large-v2/Large-v3 because:

1. **Too slow for interactive use** - Large models process at ~1x real-time (1 min audio = 1 min processing)
2. **Diminishing returns** - Small is 85-90% as accurate but 3x faster
3. **User experience** - FluentWhisper is for practice, not production transcription. Users want quick feedback.

---

## Performance Characteristics

Based on real-world Whisper benchmarks and community testing:

### Memory Usage (Runtime)

| Model | RAM Required |
|-------|--------------|
| Tiny | ~1 GB |
| Base | ~1-2 GB |
| Small | ~2-3 GB |
| Medium | ~4-5 GB |
| Large | ~8-10 GB |

### Processing Speed (Typical Hardware)

| Model | Speed | Example |
|-------|-------|---------|
| Tiny | ~10x real-time | 1min audio = 6sec processing |
| Base | ~5x real-time | 1min audio = 12sec processing |
| Small | ~3x real-time | 1min audio = 20sec processing |
| Medium | ~2x real-time | 1min audio = 30sec processing |
| Large | ~1x real-time | 1min audio = 60sec processing |

**Note**: Actual speeds vary based on:
- CPU performance (Apple Silicon is significantly faster than Intel)
- Available RAM
- Background applications
- Audio complexity (noisy audio takes longer)

---

## System Requirements

### Minimum Requirements (Any Model)

- **OS**: macOS 10.15+, Windows 10+, Linux
- **RAM**: 2GB+ available
- **Storage**: 100MB - 3GB (depending on model)
- **CPU**: Any modern processor

### Recommended By Model

#### Tiny Model
- **RAM**: 4GB+ total system RAM
- **CPU**: 2+ cores
- **Use case**: Older laptops, budget systems
- **Best for**: Speed over accuracy

#### Base Model ✨ (Most Common)
- **RAM**: 8GB+ total system RAM
- **CPU**: 4+ cores
- **Use case**: Modern laptops, mid-range desktops
- **Best for**: Balanced accuracy and speed

#### Small Model
- **RAM**: 16GB+ total system RAM
- **CPU**: 8+ cores
- **Use case**: High-end systems, Apple Silicon Macs
- **Best for**: Maximum accuracy without sacrificing too much speed

#### Medium Model
- **RAM**: 16GB+ total system RAM
- **CPU**: 8+ cores
- **Use case**: Professional workstations
- **Best for**: High accuracy when speed is less critical

#### Large Models (Premium)
- **RAM**: 32GB+ total system RAM
- **CPU**: 12+ cores
- **Use case**: Professional transcription, research
- **Best for**: Maximum accuracy, not real-time use

---

## Choosing the Right Model

### Decision Tree

```
Are you on a budget laptop or older system?
  → Choose: Tiny
  → You'll get fast, responsive transcription

Do you have a modern laptop (8GB RAM, 4 cores)?
  → Choose: Base ✨
  → Best balance for most users

Do you have a high-end system (16GB+ RAM, 8+ cores)?
  → Choose: Small
  → Excellent accuracy, still fast

Do you need maximum accuracy and don't care about speed?
  → Choose: Medium or Large (Premium)
  → Be prepared for slower processing
```

### Special Cases

#### Apple Silicon (M1/M2/M3/M4)
- Can handle **Small** model very well due to unified memory
- Even on 8GB M1, Small performs excellently
- Recommended: **Small** for M1+ Macs

#### Intel Macs / Windows PCs
- Stick with recommendations based on RAM/cores
- Older Intel CPUs struggle more with larger models
- Recommended: **Base** for most Intel systems

#### Recording Long Sessions (20+ minutes)
- Use **Tiny** or **Base** for faster processing
- Large models can take 10-30 minutes to process long recordings
- You can always re-transcribe with a larger model later

---

## Warnings and Limitations

### "May be slow" Warning

You'll see this warning if:
- You try to download **Medium** on a system with <4GB RAM
- You try to download **Large** models on a system with <8GB RAM

**What this means:**
- The model will work, but transcription will be very slow
- You may experience UI freezes or lag
- Consider using a smaller model for better UX

### Premium Models

Large/Large-v2/Large-v3 models require a Premium subscription because:
- They're 2.9GB each (expensive to host)
- Most users don't need this level of accuracy
- They're too slow for interactive use

---

## Technical Implementation

### How Detection Works

1. **On app startup**, the Rust backend uses `sysinfo` crate to detect:
   - Total system RAM
   - Physical + logical CPU cores
   - CPU brand/model name

2. **Frontend queries** this data once per session (cached for 1 hour)

3. **Dynamic badges** show in Settings:
   - ✨ "Recommended for your system" on the best model
   - ⚠️ "May be slow" on models that are too large

### Files Involved

**Backend (Rust):**
- `src-tauri/src/commands/system.rs` - System detection
- `src-tauri/Cargo.toml` - Includes `sysinfo` crate

**Frontend (TypeScript):**
- `src/services/system/` - Service layer
- `src/hooks/system/useSystemSpecs.ts` - React Query hook
- `src/components/settings/WhisperModelSection.tsx` - UI

---

## FAQ

### Q: Can I download multiple models?
**A:** Yes! Download as many as you want and switch between them in Settings > Unified Model Dropdown.

### Q: Will larger models always be more accurate?
**A:** Generally yes, but with diminishing returns. Small is only ~5-10% less accurate than Large-v3, but 3x faster.

### Q: Can I delete models after downloading?
**A:** Yes, click the "Delete" button in Settings > Whisper Model. Models are stored locally and can be re-downloaded anytime.

### Q: Why does my 16GB system recommend "Small" instead of "Large"?
**A:** Because FluentWhisper prioritizes user experience. Large models are too slow for interactive practice. Small provides excellent accuracy with much better speed.

### Q: Do models improve over time?
**A:** The models themselves don't improve after download, but newer versions (like Large-v3) are more accurate than older ones (Large-v1).

### Q: Can I override the recommendation?
**A:** Absolutely! The recommendation is just a suggestion. You can download any model (except Premium ones require subscription).

---

## Changelog

### 2025-01-04
- Initial implementation of system-based recommendations
- Added dynamic badges and warnings
- Replaced hardcoded "base is recommended" with intelligent detection

---

## References

- [OpenAI Whisper GitHub](https://github.com/openai/whisper)
- [Whisper.cpp Performance Benchmarks](https://github.com/ggerganov/whisper.cpp)
- [sysinfo crate documentation](https://docs.rs/sysinfo/)

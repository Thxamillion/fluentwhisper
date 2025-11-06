# Dark Mode Guide

## Overview
FluentWhisper uses a macOS-inspired dark mode with proper elevation hierarchy and semantic color tokens.

## Color System

### Light Mode
- **Background**: `#ffffff` - Main container
- **Card**: `#ffffff` - Elevated cards
- **Muted**: `#f5f5f5` - Muted backgrounds
- **Border**: `#e5e5e5` - Borders
- **Foreground**: `#0a0a0a` - Primary text
- **Muted Foreground**: `#737373` - Secondary text

### Dark Mode
- **Background**: `#121212` - Main container (darkest)
- **Card**: `#1e1e1e` - Elevated cards
- **Muted**: `#262626` - Muted backgrounds
- **Border**: `#2d2d2d` - Borders
- **Input**: `#262626` - Input fields
- **Sidebar**: `#1a1a1a` - Sidebar (between bg and card)
- **Foreground**: `#f2f2f2` - Primary text (high contrast)
- **Muted Foreground**: `#999999` - Secondary text

## Usage Rules

### ✅ DO: Use Semantic Color Tokens
```tsx
// Text colors
className="text-foreground"           // Primary text
className="text-muted-foreground"     // Secondary text

// Backgrounds
className="bg-card"                   // Cards and elevated surfaces
className="bg-muted"                  // Muted backgrounds (table headers, info boxes)
className="bg-input"                  // Input fields and selects

// Borders
className="border-border"             // All borders

// Hover states
className="hover:bg-muted/50"         // Subtle hover (semi-transparent)
```

### ❌ DON'T: Use Hardcoded Colors
```tsx
// Bad - won't work in dark mode
className="bg-white text-gray-900"
className="bg-gray-50 text-gray-600"

// Good - uses semantic tokens
className="bg-card text-foreground"
className="bg-muted text-muted-foreground"
```

## Colored Accents

For colored UI elements (badges, stat cards), use semi-transparent overlays:

```tsx
// Light mode: bg-blue-50
// Dark mode: bg-blue-500/10 (10% opacity)
className="bg-blue-50 dark:bg-blue-500/10"

// Icons
className="text-blue-600 dark:text-blue-400"
```

## Common Patterns

### Cards
```tsx
<Card className="p-6">
  <h3 className="text-foreground">Title</h3>
  <p className="text-muted-foreground">Description</p>
</Card>
```

### Inputs/Selects
```tsx
<select className="bg-input text-foreground border-border">
  <option>Choice</option>
</select>
```

### Tables
```tsx
<div className="bg-card border border-border">
  <table>
    <thead className="bg-muted border-b border-border">
      <th className="text-foreground">Header</th>
    </thead>
    <tbody>
      <tr className="hover:bg-muted/50">
        <td className="text-foreground">Data</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Stat Cards with Colors
```tsx
<div className="bg-purple-50 dark:bg-purple-500/10 rounded-lg">
  <div className="bg-purple-100 dark:bg-purple-500/20">
    <Icon className="text-purple-600 dark:text-purple-400" />
  </div>
  <p className="text-muted-foreground">Label</p>
  <p className="text-foreground">Value</p>
</div>
```

## Elevation Hierarchy

From darkest to lightest in dark mode:
1. **Background** (`#121212`) - Page background
2. **Sidebar** (`#1a1a1a`) - Navigation sidebar
3. **Card** (`#1e1e1e`) - Elevated content cards
4. **Muted/Input** (`#262626`) - Interactive elements, muted sections

## Implementation

### Using next-themes
- Theme provider wraps app in `App.tsx`
- Theme toggle in Settings page
- Tailwind configured with `class` strategy
- CSS variables defined in `index.css`

### Adding New Components
1. Use semantic color tokens from the start
2. Test in both light and dark mode
3. For colored elements, provide dark mode variants
4. Use semi-transparent overlays for colored backgrounds

## Quick Reference

| Element | Class |
|---------|-------|
| Primary text | `text-foreground` |
| Secondary text | `text-muted-foreground` |
| Card background | `bg-card` |
| Muted background | `bg-muted` |
| Input background | `bg-input` |
| Border | `border-border` |
| Hover state | `hover:bg-muted/50` |

## Files to Reference
- `src/index.css` - CSS variable definitions
- `tailwind.config.js` - Theme configuration
- `src/components/ThemeProvider.tsx` - Theme provider
- `src/pages/settings/Settings.tsx` - Theme toggle UI

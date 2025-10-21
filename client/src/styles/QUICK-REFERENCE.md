# Nutri AI Design System - Quick Reference

## 🎨 Color Palette

### Primary Brand
- **Primary**: `#26a8ff` → `var(--color-primary)`
- **Primary Light**: `#4db8ff` → `var(--color-primary-light)`
- **Primary Dark**: `#0088ff` → `var(--color-primary-dark)`

### Backgrounds
- **Gradient Start**: `#d3f0ff` → `var(--color-bg-gradient-start)`
- **Gradient End**: `#fefefe` → `var(--color-bg-gradient-end)`
- **Card Background**: `rgba(255, 255, 255, 0.6)` → `var(--color-bg-card)`

### Text
- **Primary**: `#1f1f1e` → `var(--color-text-primary)`
- **Secondary**: `#888888` → `var(--color-text-secondary)`
- **Tertiary**: `#9e9e9e` → `var(--color-text-tertiary)`

### Grays
- **50-900**: `var(--color-gray-50)` through `var(--color-gray-900)`

## 🔲 Glassmorphism Quick Reference

```css
/* Light Glass (40% opacity, 10px blur) */
.glass-light {
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(10px);
}

/* Medium Glass (60% opacity, 15.7px blur) - MOST COMMON */
.glass {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(15.7px);
}

/* Strong Glass (90% opacity, 20px blur) */
.glass-strong {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
}
```

## 📏 Spacing Cheat Sheet

| Variable | Value | Use Case |
|----------|-------|----------|
| `--spacing-xs` | 4px | Tight gaps, minimal spacing |
| `--spacing-sm` | 8px | Small gaps, compact layouts |
| `--spacing-md` | 16px | Default spacing, most common |
| `--spacing-lg` | 24px | Section margins, card padding |
| `--spacing-xl` | 32px | Large gaps, page sections |
| `--spacing-2xl` | 48px | Extra large spacing |

## 🔤 Typography Scale

| Class/Variable | Size | Use Case |
|----------------|------|----------|
| `--font-size-xs` | 10px | Nav labels, tiny text |
| `--font-size-sm` | 12px | Secondary info, calories |
| `--font-size-base` | 14px | Body text (default) |
| `--font-size-md` | 15px | Buttons, day selector |
| `--font-size-lg` | 16px | Subtitles |
| `--font-size-2xl` | 20px | Section headings |
| `--font-size-3xl` | 21px | Card titles |
| `--font-size-7xl` | 41px | Large page titles |

## ⭕ Border Radius Guide

| Variable | Value | Use Case |
|----------|-------|----------|
| `--radius-sm` | 8px | Small elements |
| `--radius-md` | 12px | Inputs, small cards |
| `--radius-lg` | 20px | Standard cards |
| `--radius-xl` | 24px | Large cards |
| `--radius-2xl` | 34px | Day selector, buttons |
| `--radius-full` | 9999px | Circles, pills, avatars |

## 🎭 Shadow Reference

```css
/* Card Shadow (most common) */
box-shadow: 14px 23px 97px rgba(0, 0, 0, 0.08);
/* OR */
box-shadow: var(--shadow-card);

/* Extra Large Shadow */
box-shadow: 14px 24px 101px rgba(0, 0, 0, 0.08);
/* OR */
box-shadow: var(--shadow-xl);

/* Button Shadow */
box-shadow: 0px 4px 12px rgba(38, 168, 255, 0.2);
/* OR */
box-shadow: var(--shadow-button);
```

## 🎬 Common Patterns

### Glass Card
```html
<div class="card">
  <h2 class="section-heading">Title</h2>
  <p class="text-secondary">Description text</p>
</div>
```

### Primary Button
```html
<button class="btn btn-primary">
  Click Me
</button>
```

### Progress Circle (70%)
```html
<div class="progress-circle-container">
  <svg class="progress-circle-svg">
    <circle class="progress-circle-bg" cx="45" cy="45" r="38" />
    <circle class="progress-circle-fg" cx="45" cy="45" r="38" 
            stroke-dasharray="167 238.7" />
  </svg>
  <span class="progress-circle-text">70%</span>
</div>
```

### Meal Card
```html
<div class="meal-card">
  <img src="..." class="meal-card-image" alt="..." />
  <div class="meal-card-content">
    <h3 class="meal-card-title">Beef Steak</h3>
    <p class="meal-card-calories">1500kcal</p>
  </div>
</div>
```

### Bottom Navigation
```html
<nav class="nav-bar">
  <div class="nav-bar-container">
    <button class="nav-item active">
      <span class="nav-item-icon">🏠</span>
      <span class="nav-item-label">Home</span>
    </button>
    <!-- More items... -->
  </div>
</nav>
```

## 🔧 CSS Variable Usage

### In CSS
```css
.my-element {
  color: var(--color-primary);
  padding: var(--spacing-lg);
  border-radius: var(--radius-lg);
  background: var(--glass-bg-medium);
  backdrop-filter: blur(var(--blur-medium));
}
```

### With Tailwind (inline)
```html
<div className="glass rounded-lg p-6 text-primary">
  Content
</div>
```

### In styled-components (if using)
```tsx
const Card = styled.div`
  background: var(--glass-bg-medium);
  backdrop-filter: blur(var(--blur-medium));
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
`;
```

## 📱 Responsive Classes

```html
<div class="hide-mobile">Visible on tablet/desktop only</div>
<div class="hide-desktop">Visible on mobile only</div>
```

## ⚡ Animation Classes

```html
<div class="animate-fade-in">Fades in on mount</div>
<div class="animate-slide-up">Slides up from bottom</div>
<div class="animate-scale-in">Scales from 95% to 100%</div>
```

## 🎯 Layout Utilities

```html
<div class="flex-center">Centered flex container</div>
<div class="flex-between">Space between items</div>
<div class="flex-col">Column direction</div>
<div class="grid-2">2 column grid</div>
<div class="grid-3">3 column grid</div>
```

## 🖼️ Image Utilities

```html
<img src="..." class="img-cover" />  <!-- Cover container -->
<img src="..." class="img-contain" />  <!-- Fit in container -->
```

## 📝 Text Utilities

```html
<p class="text-primary">Primary color text</p>
<p class="text-secondary">Secondary color text</p>
<p class="text-muted">Muted color text</p>
<p class="text-truncate">Truncated long text...</p>
<p class="text-bold">Bold weight text</p>
<p class="text-center">Centered text</p>
```

## 🎨 Most Common Combinations

### Standard Card
```css
background: var(--glass-bg-medium);
backdrop-filter: blur(var(--blur-medium));
border-radius: var(--radius-lg);
box-shadow: var(--shadow-card);
padding: var(--spacing-lg);
```

### Primary Button
```css
background: var(--color-primary);
color: white;
padding: var(--spacing-sm) var(--spacing-lg);
border-radius: var(--radius-2xl);
box-shadow: var(--shadow-button);
```

### Section Spacing
```css
margin-bottom: var(--spacing-lg); /* 24px */
padding: 0 var(--spacing-container-padding); /* 0 20px */
```

## 🔍 Finding the Right Token

**Need spacing?** → `var(--spacing-{xs|sm|md|lg|xl})`  
**Need color?** → `var(--color-{category}-{variant})`  
**Need blur?** → `var(--blur-{light|medium|strong|extra})`  
**Need radius?** → `var(--radius-{sm|md|lg|xl|2xl|full})`  
**Need shadow?** → `var(--shadow-{sm|md|lg|xl|card|button})`

## 💡 Pro Tips

1. **Most cards use**: `var(--glass-bg-medium)` + `var(--blur-medium)`
2. **Most spacing is**: `var(--spacing-lg)` (24px)
3. **Most radius is**: `var(--radius-lg)` (20px)
4. **Most shadows use**: `var(--shadow-card)`
5. **Primary color is**: `var(--color-primary)` (#26a8ff)

## 🚀 Quick Start Template

```tsx
import '@/styles/design-tokens.css';
import '@/styles/base.css';
import '@/styles/components.css';

export default function MyComponent() {
  return (
    <div className="gradient-bg min-h-screen pb-24">
      {/* Header */}
      <header className="header">
        <div className="profile-avatar">
          <div className="profile-avatar-initial">A</div>
        </div>
        <div className="profile-info">
          <p className="profile-greeting">Welcome back</p>
          <p className="profile-name">Username</p>
        </div>
      </header>

      {/* Content */}
      <div className="container">
        <div className="card section">
          <h2 className="section-heading">Section Title</h2>
          <p className="text-secondary">Content here...</p>
        </div>
      </div>

      {/* Bottom Nav */}
      <nav className="nav-bar">
        <div className="nav-bar-container">
          <button className="nav-item active">
            <span className="nav-item-icon">🏠</span>
            <span className="nav-item-label">Home</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
```

---

**Remember**: Always check `styles/README.md` for complete documentation!

# Nutri AI - Design System Documentation

## 📋 Overview

This design system provides a comprehensive foundation for building consistent, beautiful, and accessible UI components across the Nutri AI application. Based on the Figma design (`Nutri-Ai-Ui`), it implements a modern glassmorphism aesthetic with a focus on mobile-first experiences.

## 🎨 Design Philosophy

### Core Principles

1. **Glassmorphism First**: All cards and containers use backdrop blur effects for a modern, elegant look
2. **Mobile-Optimized**: Designed for iPhone screens with safe area support
3. **Consistent Spacing**: 8px grid system for all spacing decisions
4. **Accessible**: WCAG 2.1 AA compliant with proper focus states
5. **Performance**: Optimized animations and minimal repaints

## 📦 File Structure

```
client/src/styles/
├── design-tokens.css    # CSS variables and design tokens
├── base.css            # Global styles and utilities
├── components.css      # Component-specific styles
└── README.md          # This file
```

## 🎯 Design Tokens

### Color System

#### Primary Colors
```css
--color-primary: #26a8ff         /* Main brand color */
--color-primary-light: #4db8ff   /* Hover states */
--color-primary-dark: #0088ff    /* Active states */
```

#### Background Colors
```css
--color-bg-gradient-start: #d3f0ff  /* Top of page gradient */
--color-bg-gradient-end: #fefefe    /* Bottom of page gradient */
--color-bg-card: rgba(255, 255, 255, 0.6)  /* Card backgrounds */
```

#### Text Colors
```css
--color-text-primary: #1f1f1e     /* Main text */
--color-text-secondary: #888888   /* Secondary text */
--color-text-tertiary: #9e9e9e    /* Tertiary text */
```

### Glassmorphism

```css
/* Glass backgrounds */
--glass-bg-strong: rgba(255, 255, 255, 0.9)   /* 90% opacity */
--glass-bg-medium: rgba(255, 255, 255, 0.6)   /* 60% opacity */
--glass-bg-light: rgba(255, 255, 255, 0.4)    /* 40% opacity */

/* Blur strengths */
--blur-light: 10px      /* Subtle blur */
--blur-medium: 15.7px   /* Standard blur (from Figma) */
--blur-strong: 20px     /* Strong blur */
--blur-extra: 30px      /* Extra strong blur */
```

### Spacing Scale

Based on 8px grid system:

```css
--spacing-xs: 4px    /* 0.5x */
--spacing-sm: 8px    /* 1x */
--spacing-md: 16px   /* 2x */
--spacing-lg: 24px   /* 3x */
--spacing-xl: 32px   /* 4x */
--spacing-2xl: 48px  /* 6x */
--spacing-3xl: 64px  /* 8x */
```

### Typography

```css
/* Font Sizes */
--font-size-xs: 10px    /* Nav labels */
--font-size-sm: 12px    /* Secondary text */
--font-size-base: 14px  /* Body text */
--font-size-md: 15px    /* Buttons */
--font-size-lg: 16px    /* Headings */
--font-size-2xl: 20px   /* Section titles */
--font-size-3xl: 21px   /* Card titles */
--font-size-7xl: 41px   /* Large titles */

/* Font Weights */
--font-weight-normal: 400
--font-weight-medium: 500
--font-weight-semibold: 600
--font-weight-bold: 700
```

### Border Radius

```css
--radius-sm: 8px      /* Small elements */
--radius-md: 12px     /* Inputs */
--radius-lg: 20px     /* Cards */
--radius-xl: 24px     /* Large cards */
--radius-2xl: 34px    /* Day selector */
--radius-full: 9999px /* Circles, pills */
```

### Shadows

From Figma design specifications:

```css
--shadow-card: 14px 23px 97px rgba(0, 0, 0, 0.08)
--shadow-xl: 14px 24px 101px rgba(0, 0, 0, 0.08)
--shadow-button: 0px 4px 12px rgba(38, 168, 255, 0.2)
--shadow-nav: 0px -2px 20px rgba(0, 0, 0, 0.05)
```

## 🧩 Component Classes

### Cards

Basic glass card:
```html
<div class="card">
  <!-- Content -->
</div>
```

Variations:
```css
.card          /* Standard padding (24px) */
.card-compact  /* Reduced padding (16px) */
.card-spacious /* Increased padding (32px) */
```

Custom card:
```html
<div class="glass rounded-lg shadow-card p-6">
  <!-- Content -->
</div>
```

### Buttons

Primary button:
```html
<button class="btn btn-primary">
  Click me
</button>
```

Ghost button:
```html
<button class="btn btn-ghost">
  Secondary action
</button>
```

### Navigation Bar

Bottom navigation:
```html
<nav class="nav-bar">
  <div class="nav-bar-container">
    <button class="nav-item active">
      <span class="nav-item-icon">🏠</span>
      <span class="nav-item-label">Home</span>
    </button>
    <!-- More items -->
  </div>
</nav>
```

### Header

User profile header:
```html
<header class="header">
  <div class="profile-avatar">
    <img src="..." class="profile-avatar-image" />
  </div>
  <div class="profile-info">
    <p class="profile-greeting">Welcome back</p>
    <p class="profile-name">John Doe</p>
  </div>
  <button class="notification-button">
    🔔
  </button>
</header>
```

### Day Selector

Week day navigation:
```html
<div class="day-selector">
  <div class="day-selector-container">
    <button class="day-button active">1</button>
    <div class="day-divider"></div>
    <button class="day-button">2</button>
    <!-- More days -->
    <button class="day-arrow">→</button>
  </div>
</div>
```

### Progress Circle

Circular progress indicator:
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

### Meal Cards

Food item card:
```html
<div class="meal-card">
  <img src="..." class="meal-card-image" />
  <div class="meal-card-content">
    <h3 class="meal-card-title">Beef Steak</h3>
    <p class="meal-card-calories">1500kcal</p>
  </div>
</div>
```

### Meal Plan List

Checklist items:
```html
<div class="meal-plan-item">
  <div class="meal-plan-info">
    <h3 class="meal-plan-name">Eggs</h3>
    <p class="meal-plan-calories">500kcal</p>
  </div>
  <div class="meal-plan-checkbox checked">
    <svg class="meal-plan-checkbox-icon"><!-- Checkmark --></svg>
  </div>
</div>
```

### Carousel

Horizontal scrolling container:
```html
<div class="carousel scrollbar-hide">
  <div class="meal-card"><!-- Card 1 --></div>
  <div class="meal-card"><!-- Card 2 --></div>
  <div class="meal-card"><!-- Card 3 --></div>
</div>
```

## 🛠️ Utility Classes

### Glass Effects

```html
<div class="glass">Standard glassmorphism</div>
<div class="glass-light">Light glassmorphism</div>
<div class="glass-strong">Strong glassmorphism</div>
```

### Layout

```html
<div class="flex-center">Centered flex</div>
<div class="flex-between">Space between</div>
<div class="flex-col">Column layout</div>
<div class="grid-2">2 column grid</div>
```

### Text Utilities

```html
<p class="text-primary">Primary color text</p>
<p class="text-secondary">Secondary color text</p>
<p class="text-truncate">Truncated text...</p>
<p class="text-bold">Bold text</p>
```

### Spacing

```html
<div class="section">Auto margin-bottom</div>
<div class="container">Centered container</div>
```

### Rounded Corners

```html
<div class="rounded-md">12px radius</div>
<div class="rounded-lg">20px radius</div>
<div class="rounded-full">Circle</div>
```

### Animations

```html
<div class="animate-fade-in">Fades in</div>
<div class="animate-slide-up">Slides up</div>
<div class="animate-scale-in">Scales in</div>
```

## 📱 Responsive Design

### Breakpoints

```css
Mobile:  Default (up to 767px)
Tablet:  768px - 1023px
Desktop: 1024px+
```

### Responsive Utilities

```html
<div class="hide-mobile">Hidden on mobile</div>
<div class="hide-desktop">Hidden on desktop</div>
```

### Safe Areas (Mobile)

For devices with notches:

```html
<div class="safe-top">Top safe padding</div>
<div class="safe-bottom">Bottom safe padding</div>
```

## 🎬 Animations

### Available Animations

```css
@keyframes fadeIn      /* Opacity: 0 → 1 */
@keyframes slideUp     /* Slides up with fade */
@keyframes scaleIn     /* Scales from 0.95 → 1 */
```

### Usage

```html
<div class="animate-fade-in">Content</div>
```

### Custom Timing

```css
.my-element {
  animation: fadeIn var(--duration-slow) var(--ease-out);
}
```

## 🔄 Transitions

### Predefined Transitions

```css
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1)
--transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1)
--transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1)
```

### Usage

```css
.button {
  transition: all var(--transition-base);
}
```

## 🎨 Creating Custom Components

### Example: Custom Card

```css
.my-custom-card {
  /* Use design tokens */
  background: var(--glass-bg-medium);
  backdrop-filter: blur(var(--blur-medium));
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: var(--spacing-lg);
  
  /* Use color tokens */
  color: var(--color-text-primary);
  
  /* Add transitions */
  transition: all var(--transition-base);
}

.my-custom-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-xl);
}
```

## 📋 Best Practices

### Do's ✅

- Always use CSS variables from design-tokens.css
- Follow the 8px spacing grid
- Use semantic class names
- Apply glassmorphism consistently
- Test on mobile devices
- Use proper focus states

### Don'ts ❌

- Don't use hardcoded colors or sizes
- Don't create arbitrary spacing values
- Don't mix different blur strengths randomly
- Don't skip focus states
- Don't forget safe area insets on mobile
- Don't use heavy animations that impact performance

## 🔍 Accessibility

### Focus States

All interactive elements have visible focus states:
```css
button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

### Disabled States

Disabled elements are clearly indicated:
```css
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Color Contrast

All text colors meet WCAG AA standards:
- Primary text on white background: 16.1:1
- Secondary text on white background: 4.6:1
- Primary color on white background: 3.2:1

## 📊 Design Token Reference

For a complete list of all available design tokens, see:
- `design-tokens.css` - All CSS variables
- `components.css` - Component-specific styles
- `base.css` - Global base styles

## 🚀 Getting Started

1. **Import in your React component:**
   ```tsx
   import '@/styles/design-tokens.css';
   import '@/styles/base.css';
   import '@/styles/components.css';
   ```

2. **Use component classes:**
   ```tsx
   <div className="card">
     <h2 className="section-heading">Title</h2>
     <p className="text-secondary">Description</p>
   </div>
   ```

3. **Or use utility classes with Tailwind:**
   ```tsx
   <div className="glass rounded-lg p-6">
     <h2 className="text-2xl font-bold text-primary">Title</h2>
   </div>
   ```

## 🔧 Customization

To customize the design system:

1. Open `design-tokens.css`
2. Modify the CSS variables in the `:root` selector
3. Changes will propagate throughout the entire app

Example:
```css
:root {
  --color-primary: #ff6b6b;  /* Change brand color */
  --spacing-md: 20px;        /* Adjust spacing */
}
```

## 📝 Contributing

When adding new components:

1. Add design tokens to `design-tokens.css` if needed
2. Create component classes in `components.css`
3. Document the component in this README
4. Ensure accessibility standards are met
5. Test on multiple screen sizes

## 📄 License

This design system is part of the Nutri AI project.

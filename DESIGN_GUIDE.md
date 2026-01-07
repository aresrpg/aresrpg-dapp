# AresRPG dApp Design Guide

**Version**: 1.0
**Tech Stack**: Vue 3 + Vite + Tailwind CSS + Stylus
**Theme**: Dark Mode (default)
**Last Updated**: November 2025

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing System](#spacing-system)
5. [Component Library](#component-library)
6. [Layout Patterns](#layout-patterns)
7. [Material Design Elevations](#material-design-elevations)
8. [Animation & Effects](#animation--effects)
9. [Responsive Design](#responsive-design)
10. [Accessibility Guidelines](#accessibility-guidelines)

---

## Design Philosophy

AresRPG dApp follows a **dark fantasy gaming aesthetic** with:

- **Glassmorphism** - Frosted glass effects (backdrop-filter blur)
- **Material Design elevations** - 5 levels of shadow depth
- **Gaming-first UX** - Bold colors, high contrast, immersive overlays
- **3D integration** - Canvas-based character displays with Three.js
- **Sui blockchain integration** - Web3 wallet connectivity, NFT minting

**Core principles**:
- Dark backgrounds with high-contrast text
- Gold/amber accents (#FFCA28) for emphasis
- Gradients for CTAs (Call-to-Action buttons)
- Smooth transitions (0.3s cubic-bezier)
- Glassmorphism overlays for depth

---

## Color System

### CSS Variables

All colors are defined as CSS custom properties in `src/index.css`:

```css
:root {
  --primary: #00000080;
  --secondary: #abababb3;
  --tertiary: #4c585c8f;
  --quaternary: #373737;
  --border-color: #e2e8f0;
  --ui-border: 3px solid #ffffff00;
  --ui-inventory-border-slot: 0px;
}

[data-theme='dark'] {
  --primary: #514a3c;
  --secondary: #beb998;
  --tertiary: #929977;
  --quaternary: #50493c;
  --border-color: #374151;
  --ui-border: 3px solid #fff;
  --ui-inventory-border-slot: 2px solid #ddd8c9;
}
```

### Color Palette

#### Base Colors
| Color Name | Hex Code | Usage |
|------------|----------|-------|
| Background (Root) | `#212121` | Main app background |
| Overlay | `rgba(0,0,0,.3)` | Card backgrounds with backdrop-filter |
| Primary Dark | `#514a3c` | Primary theme color (dark mode) |
| Secondary Dark | `#beb998` | Secondary theme color (dark mode) |
| Tertiary Dark | `#929977` | Tertiary theme color (dark mode) |

#### Text Colors
| Color Name | Hex Code | Usage |
|------------|----------|-------|
| Text Primary | `#eee` | Main text color |
| Text Secondary | `#ddd` | Secondary text (titles, headers) |
| Text Bright | `#fff` | High-contrast text, hover states |
| Text Dim | `opacity: .7` | Muted labels, descriptions |

#### Accent Colors
| Color Name | Hex Code | Usage |
|------------|----------|-------|
| Gold/XP | `#FFCA28` | Level badges, highlights, borders (locked items) |
| Gradient Start | `#FBC02D` | Button gradients (start) |
| Gradient End | `#EF6C00` | Button gradients (end) |
| Link Active | `#e1c79b` | Active link states |

#### Semantic Colors
| Color Name | Hex Code | Usage |
|------------|----------|-------|
| Success | `#2ECC71` | Confirm actions, success states |
| Success Dark | `#4CAF50` | Mint/claim buttons |
| Error | `#EF5350` | Delete buttons, error states |
| Error Dark | `#E74C3C` | Cancel actions, destructive warnings |
| Special | `#AB47BC` | Free/premium actions |
| Info Blue | `#2196F3` | Alerts, descriptions (default) |
| Sui Token | `#90CAF9` | SUI token displays |

#### Gender Colors
| Color Name | Hex Code | Usage |
|------------|----------|-------|
| Male | `#26C6DA` | Male character icons |
| Female | `#EC407A` | Female character icons |

### Usage Examples

```vue
<!-- Button with gradient (Play button) -->
<div class="vs-sidebar-item play">
  <!-- linear-gradient(to right, #FBC02D, #EF6C00) -->
</div>

<!-- Card with glassmorphism -->
<div style="background: rgba(0,0,0,.3); backdrop-filter: blur(10px);">
  <!-- Content -->
</div>

<!-- Level badge -->
<b style="color: #FFCA28; background: rgba(0,0,0,.3);">
  Lvl 42
</b>
```

---

## Typography

### Font Family

**Primary Font**: Rubik (sans-serif)

```css
* {
  font-family: 'Rubik', sans-serif;
}
```

**Loaded from**: Google Fonts (or bundled)

### Type Scale

Root font size: `18px` (set on `:root`)

| Element | Size (em) | Size (px) | Weight | Usage |
|---------|-----------|-----------|--------|-------|
| H1/Title | `1.5em` | `27px` | `bold` | Card titles, modal headers |
| H2/Name | `1.2em` | `21.6px` | `normal` | Character names, section headers |
| Body | `1em` | `18px` | `normal` | Main content |
| Small | `.9em` | `16.2px` | `900` | Section headers (uppercase) |
| Button | `.9em` | `16.2px` | `900` | Button text (uppercase) |
| Label | `.8em` | `14.4px` | `normal` | Form labels, small text |
| Tiny | `.65em` | `11.7px` | `bold` | Field labels (uppercase) |

### Font Weights

- **Normal**: `400` (default)
- **Bold**: `700` (titles, emphasis)
- **Black**: `900` (buttons, headers, uppercase labels)

### Text Transformations

```css
/* Uppercase for labels/buttons */
text-transform: uppercase;

/* Capitalize for names */
text-transform: capitalize;
```

### Typography Examples

```vue
<!-- Section header (uppercase, bold) -->
<div class="title" style="
  font-size: .9em;
  text-transform: uppercase;
  font-weight: 900;
  color: #eee;">
  Characters
</div>

<!-- Card title -->
<span class="title" style="
  font-size: 1.5em;
  font-weight: bold;
  color: #eee;">
  Vaporeon Mint
</span>

<!-- Field label -->
<div class="title" style="
  font-size: .65em;
  text-transform: uppercase;
  opacity: .7;
  font-weight: bold;">
  Class:
</div>
```

---

## Spacing System

### Base Unit: `1em = 18px`

### Spacing Scale

| Size | Value | Usage |
|------|-------|-------|
| XXS | `.25em` (4.5px) | Level badge padding |
| XS | `.5em` (9px) | Small margins, button spacing |
| SM | `.6em` (10.8px) | Card padding (vertical) |
| MD | `1em` (18px) | Card padding (horizontal), standard margins |
| LG | `2em` (36px) | Button padding (horizontal) |
| XL | `3em` (54px) | Container padding |

### Border Radius

| Size | Value | Usage |
|------|-------|-------|
| Small | `3px` | Buttons, small elements |
| Medium | `5px` | Level badges, small containers |
| Large | `10px` | Cards, modals, main containers |

### Component Spacing Examples

```css
/* Card padding */
.character {
  padding: .6em 1em 0; /* 10.8px 18px 0 */
}

/* Button padding */
.ares_btn {
  padding: 1em 2em; /* 18px 36px */
}

/* Container padding */
.container {
  padding: 3em; /* 54px */
}

/* Section spacing */
section.section-header {
  padding: 1em 0; /* 18px 0 */
}
```

---

## Component Library

### 1. Cards (`<Card>`)

**Location**: `src/components/cards/`

#### Character Card (`user-character.vue`)

**Visual characteristics**:
- Width: `300px` (fixed)
- Height: `max-content` (dynamic)
- Background: `rgba(0,0,0,.3)` with `backdrop-filter: blur(10px)`
- Border radius: `10px`
- Border (locked): `1px solid #FFCA28`
- Pseudo-element overlay: Blurred class background image

**Structure**:
```pug
.character(:class="{ locked, classe, male/female }")
  span.name Character Name
    b.xp Lvl 42
  .perso (3D canvas display)
  .field
    .title classe:
    .value SENSHI
  .actions (delete button)
```

**Styling patterns**:
```stylus
.character
  width 300px
  backdrop-filter blur(10px)
  background rgba(0, 0, 0, .3)
  border-radius 10px
  position relative
  overflow hidden

  &::before
    content ''
    position absolute
    top 0; right 0; bottom 0; left 0
    z-index 1
    filter blur(3px) brightness(50%)
    background #d7d7d78c

  >*
    position relative
    z-index 20
```

#### Mint Card (`mint-card.vue`)

**Uses**: `vs-card` component (Vuesax)

**Structure**:
```pug
vs-card
  template(#title) Card Title
  template(#img) Image
  template(#text) Description
  template(#interactions) Buttons
```

### 2. Buttons

#### `.ares_btn` (Custom button class)

**Visual characteristics**:
- Background: `rgba(#212121, .3)` with `backdrop-filter: blur(12px)`
- Padding: `1em 2em`
- Border: `1px solid rgba(black .4)`
- Border radius: `3px`
- Text: Uppercase, weight 900, size .9em, shadow `0 0 3px black`
- Transition: `all 0.3s cubic-bezier(.25,.8,.25,1)`

**Hover state**:
```stylus
&:hover
  box-shadow 0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22)
```

**Disabled state**:
```stylus
&.disabled
  opacity .5
  cursor default
  pointer-events none
```

#### Gradient Play Button

```stylus
.vs-sidebar-item.play
  text-shadow 1px 2px 3px black
  background linear-gradient(to right, #FBC02D, #EF6C00)
```

### 3. Section Components

#### Section Container (`section-container.vue`)

**Purpose**: Wrapper for authenticated content

**Structure**:
```pug
.container
  span(v-if="!online && !allow_offline") Please connect
  slot(v-else)
```

**Styling**:
```stylus
.container
  padding 3em
  >span
    display flex
    width 100%
    height 100%
    color #eee
    justify-content center
    align-items center
```

#### Section Header (`section-header.vue`)

**Purpose**: Section titles with optional descriptions

**Structure**:
```pug
section.section-header
  .title Title
  vs-alert.desc(v-if="desc") Description
  .content(:class="{ rows }")
    slot
```

**Styling**:
```stylus
section.section-header
  width 100%
  border-top 1px solid white
  max-width 1400px

  .title
    color #eee
    font-size .9em
    text-transform uppercase
    font-weight 900
```

### 4. Misc Components

#### Toast (`toast.vue`)

**Purpose**: Notification system (tx updates, errors, success)

**Pattern**:
```js
toast.tx('Minting...', 'Vaporeon')
tx.update('success', 'Minted successfully!')
tx.update('error', 'Failed to mint')
tx.remove()
```

#### Floating Bubbles (`floating-bubbles.vue`)

**Purpose**: Animated background decoration

**Visual**: SVG blob filter effect with Gaussian blur

#### Control Spinner (`control-spinner.vue`)

**Purpose**: Loading state indicator

---

## Layout Patterns

### 1. Main App Layout (`home.vue`)

```pug
.app
  .blur (background overlay)
  TopBar (wallet info, navigation)
  .content
    SideBar (navigation menu)
    .right
      router-view (tab content)
      bubbles (decoration)
```

**Responsive breakpoint**: `1000px` (mobile vs desktop)

**Mobile fallback**: Shows "Screen too small" message with Moai image

### 2. Sidebar Layout

**Fixed sidebar** (left side):
- Reduced state: Icons only
- Expanded state: Icons + text labels

**Main content** (right side):
- Dynamic width based on sidebar state
- Keep-alive for `tab-world` (game canvas)

### 3. Grid Patterns

#### Character Grid (responsive)

```css
display: flex;
flex-flow: row wrap;
gap: 1em;
```

#### Card Layout

```css
display: flex;
flex-flow: column nowrap;
justify-content: center;
align-items: center;
```

---

## Material Design Elevations

Five elevation levels defined in `src/app.vue`:

```stylus
.material-1
  box-shadow 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)
  transition all 0.3s cubic-bezier(.25,.8,.25,1)
  &:hover
    box-shadow 0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22)

.material-2
  box-shadow 0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)

.material-3
  box-shadow 0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)

.material-4
  box-shadow 0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22)

.material-5
  box-shadow 0 19px 38px rgba(0,0,0,0.30), 0 15px 12px rgba(0,0,0,0.22)
```

**Usage**: Apply `.material-1` through `.material-5` classes for depth

**Interactive elevation**: `.material-1` includes hover state (elevates to material-4 level)

---

## Animation & Effects

### 1. Glassmorphism

**Standard pattern**:
```css
background: rgba(0, 0, 0, .3);
backdrop-filter: blur(10px);
```

**Button variant**:
```css
background: rgba(#212121, .3);
backdrop-filter: blur(12px);
```

### 2. Transitions

**Standard transition**:
```css
transition: all 0.3s cubic-bezier(.25, .8, .25, 1);
```

**Usage**: Hover effects, elevation changes, state transitions

### 3. Text Effects

**Text shadow** (gaming emphasis):
```css
text-shadow: 1px 2px 3px black;
/* or */
text-shadow: 0 0 3px black;
```

### 4. Blob Filter Effect

**SVG filter** (floating bubbles background):
```svg
<filter id="blob">
  <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
  <feColorMatrix in="blur" mode="matrix"
    values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
    result="blob" />
</filter>
```

---

## Responsive Design

### Breakpoints

**Mobile threshold**: `1000px`

```js
const breakpoints = useBreakpoints({
  mobile: 1000,
})
```

**Mobile behavior**:
- Shows fallback screen ("Screen too small" message)
- Hides main app content
- Displays server info card

**Desktop** (`> 1000px`):
- Full sidebar + main content layout
- 3D game canvas enabled
- Character displays with Three.js

### Mobile-First Strategy

**NOT mobile-first** - Desktop-only app by design
Reason: 3D game canvas, complex UI interactions require desktop

---

## Accessibility Guidelines

### Current State

**Theme**: Dark mode only (no light theme)
**Scroll behavior**: `smooth` (CSS)
**Focus management**: `outline: none` (custom focus states needed)

### Semantic HTML Patterns

**Good examples**:
```pug
// Links with proper href
a.value.id(:href="character_explorer_link" target="_blank")

// Icons with semantic meaning
i.bx.bx-male-sign (gender indicator)
```

### Color Contrast

**Text on dark backgrounds**:
- `#eee` on `#212121` - WCAG AA compliant
- `#ddd` on `rgba(0,0,0,.3)` - Check contrast ratio

**Action colors**:
- Error red (`#EF5350`) - High visibility
- Success green (`#2ECC71`) - High visibility
- Gold accent (`#FFCA28`) - High visibility

### Keyboard Navigation

**Dialogs**: Use `vs-dialog` component (built-in keyboard support)

**Focus states**: Need custom implementation (currently `outline: none`)

### Screen Reader Support

**Icons**: Need `aria-label` attributes
**Dialogs**: Need `role="dialog"` and `aria-labelledby`
**Buttons**: Need descriptive text or `aria-label`

### Recommendations

1. Add custom focus indicators (replace `outline: none`)
2. Add `aria-label` to icon-only buttons
3. Implement keyboard shortcuts for game actions
4. Add `role` attributes to custom components
5. Test with screen readers (NVDA, JAWS)

---

## Implementation Guidelines

### Adding New Components

1. **Location**: Place in appropriate subdirectory
   - Cards: `src/components/cards/`
   - Navigation: `src/components/navigation/`
   - Game UI: `src/components/game-ui/`
   - Misc: `src/components/misc/`

2. **Styling approach**:
   - Use Tailwind utilities where possible
   - Use Stylus scoped styles for custom patterns
   - Follow glassmorphism pattern for overlays
   - Apply material elevation classes for depth

3. **Color usage**:
   - Use CSS variables from `index.css`
   - Fallback to hex values for non-theme colors
   - Follow semantic color patterns (success = green, error = red)

4. **Typography**:
   - Use em units (relative to 18px root)
   - Apply uppercase for labels/buttons (`.9em`, weight `900`)
   - Use `.65em` for tiny labels, `.8em` for small text

### Extending the Design System

**Adding new colors**:
```css
/* In src/index.css */
[data-theme='dark'] {
  --new-color: #hex;
}
```

**Adding new elevations**:
```stylus
/* In src/app.vue */
.material-6
  box-shadow /* custom shadow */
```

**Adding new animations**:
```stylus
.custom-transition
  transition all 0.3s cubic-bezier(.25,.8,.25,1)
```

---

## Tech Stack Reference

### Core Dependencies

- **Vue 3**: Composition API, `<script setup>`
- **Vite**: Fast build tool, HMR
- **Tailwind CSS**: Utility-first styling (minimal config)
- **Stylus**: Scoped component styles
- **Vuesax**: UI component library (`vs-card`, `vs-button`, `vs-dialog`)
- **Pug**: Template syntax
- **Three.js**: 3D character rendering
- **vue-i18n**: Internationalization (EN, FR, JP)
- **@mysten/sui**: Sui blockchain integration

### File Structure

```
src/
├── app.vue           # Root component, global styles
├── index.css         # CSS variables, theme
├── main.js           # App entry point
├── router.js         # Vue Router config
├── components/
│   ├── cards/        # Card components
│   ├── game-ui/      # Game interface components
│   ├── misc/         # Utility components
│   ├── navigation/   # Navigation components
│   └── sui-login/    # Wallet components
├── views/            # Page views (tabs)
├── core/             # Game logic, modules
└── assets/           # Images, models, sounds
```

---

## Quick Reference

### Common Patterns

**Glassmorphism card**:
```stylus
.card
  background rgba(0, 0, 0, .3)
  backdrop-filter blur(10px)
  border-radius 10px
  padding .6em 1em
```

**Gradient button**:
```stylus
.button
  background linear-gradient(to right, #FBC02D, #EF6C00)
  text-shadow 1px 2px 3px black
```

**Level badge**:
```stylus
.badge
  color #FFCA28
  background rgba(0, 0, 0, .3)
  border-radius 5px
  padding .25em .5em
  font-size .65em
  font-weight 900
```

**Material elevation hover**:
```stylus
.element
  box-shadow 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)
  transition all 0.3s cubic-bezier(.25,.8,.25,1)
  &:hover
    box-shadow 0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22)
```

---

## Resources

- **Figma/Design Files**: None (code-first approach)
- **Component Library**: Vuesax (https://vuesax.com/)
- **Icons**: Boxicons (`bx-*` classes)
- **Fonts**: Rubik (Google Fonts)
- **3D Assets**: `src/assets/models/`
- **Blockchain**: Sui (https://sui.io/)

---

## Contributing

When adding new designs:

1. Follow glassmorphism aesthetic
2. Use CSS variables for colors
3. Apply material elevations for depth
4. Maintain 18px root font size (em units)
5. Test on 1920x1080 resolution (primary target)
6. Add Pug templates (no plain HTML)
7. Scope Stylus styles per component
8. Document new patterns in this guide

---

**Last Updated**: November 7, 2025
**Maintained By**: AresRPG Team
**Questions**: Refer to component source files in `src/components/`

# Burger Category Card Animation Documentation

## Overview
This component implements a premium, playful status interaction for the "Burger" category. The goal was to create a delightful "bouncing burger" effect where layers separate and stack, adding a sense of freshness and depth.

## Implementation Details

### Stack
- **React**: Component structure.
- **Framer Motion**: For physics-based spring animations and sequence control.
- **Tailwind CSS**: For styling and constructing the burger graphics using pure CSS shapes (divs with reduced border-radii).

### 1. Hover Detection & Triggering
Instead of relying solely on the `:hover` pseudo-class (which can be sticky on mobile), we use React's `onMouseEnter` and `onMouseLeave` handlers.

To conditionally trigger the animation:
- We check `window.matchMedia('(pointer: coarse)').matches` to detect touch devices (phones/tablets). If true, we **skip** the bounce animation to prevent awkward sticky states.
- We check `useReducedMotion()` from Framer Motion. If the user has requested reduced motion in their OS, we skip the animation.

### 2. Animation Logic (One-Time Trigger)
The requirement was for the animation to play **once** per hover and not loop infintely.
- We use Framer Motion's `Variants` system.
- The `hover` variant defines a keyframe sequence: `y: [0, -8, 0]`.
- This causes the element to jump up (`-8px`) and land back (`0px`) exactly once when the variant state changes to `hover`.
- When the mouse leaves, we switch back to `idle`, resetting the state.

### 3. Performance
- **CSS Shapes**: The burger is built using lightweight `div` elements with background colors and border-radius. No heavy image assets or SVGs are loaded, keeping the component extremely light.
- **Transform-Only**: All animations use `transform` (scale, translate) and `opacity`. These are GPU-accelerated and do not trigger browser reflows/layouts, ensuring 60fps performance even on lower-end devices.

### 4. Accessibility
- **Reduced Motion**: The `useReducedMotion` hook ensures that users who are sensitive to movement see a static, accessible version of the card.
- **Semantic HTML**: The card uses `role="button"` and `tabIndex={0}` to be fully navigable via keyboard.
- **Labeling**: `aria-label` provides context for screen readers.

## Usage
The component is designed as a drop-in replacement for specific category slots.

```tsx
import { BurgerCategoryCard } from './BurgerCategoryCard';

// Inside your map loop
{category.name === 'Burger' ? <BurgerCategoryCard /> : <DefaultCard />}
```

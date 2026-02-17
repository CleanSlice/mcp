---
id: setup-app-theme
title: Theme Setup (App)
version: 1.0.0
last_updated: 2025-12-19

pattern: setup
complexity: fundamental
framework: nuxt
category: setup
applies_to: [frontend, app]

tags:
  - theme
  - shadcn-vue
  - tailwind
  - css
  - dark-mode
  - ui-components

keywords:
  - theme setup
  - shadcn-vue
  - tailwind css
  - css variables
  - dark mode
  - ui components
  - design system

deprecated: false
experimental: false
production_ready: true
---

# Theme Setup (App)

> **The Theme slice provides the design system foundation** for your Nuxt application. It configures shadcn-vue, Tailwind CSS, CSS variables for theming, and utility functions for class management.

---

## Critical Rules

### 1. Theme Slice is a Setup Slice

```
slices/
├── setup/
│   └── theme/          # Theme configuration lives here
├── user/               # Feature slices import from theme
├── product/
└── ...
```

### 2. Components are Auto-Imported

The `shadcn-nuxt` module auto-imports all UI components. No import statements needed:

```vue
<!-- CORRECT - Auto-imported, just use in template -->
<template>
  <Button>Click me</Button>
  <Card><CardContent>Hello</CardContent></Card>
</template>
```

### 3. Use `#theme` Alias for Manual Imports

When you need to import in `<script>` (utilities, programmatic use):

```typescript
// CORRECT - Use alias
import { Button } from '#theme/components/ui/button';
import { cn } from '#theme/utils';

// WRONG - Relative paths
import { Button } from '../../../setup/theme/components/ui/button';
```

### 4. All UI Components Live in Theme

```typescript
// CORRECT - Components in theme slice
slices/setup/theme/components/ui/button/Button.vue

// WRONG - Components scattered in feature slices
slices/user/components/ui/button/Button.vue  // NEVER
```

---

## File Location & Naming

```
slices/setup/theme/
├── assets/
│   ├── css/
│   │   └── tailwind.css      # Tailwind + CSS variables
│   └── scss/
│       └── main.scss         # Custom SCSS styles
├── components/
│   └── ui/                   # shadcn-vue components
│       ├── button/
│       ├── card/
│       ├── input/
│       └── ...
├── plugins/
│   └── fonts.ts              # Font loading plugin
├── utils/
│   ├── index.ts
│   └── cn.ts                 # Class name utility
├── index.ts                  # Public exports
├── nuxt.config.ts            # Slice configuration
├── tailwind.config.js        # Tailwind configuration
└── components.json           # shadcn-vue CLI config
```

---

## Installation

```bash
# All dependencies
npm install -D @nuxtjs/tailwindcss shadcn-nuxt tailwindcss-animate @tailwindcss/typography sass sass-loader vite-svg-loader @types/webfontloader
npm install vee-validate @vee-validate/zod zod vaul-vue clsx tailwind-merge lucide-vue-next webfontloader
```

---

## Complete Configuration Example

### `slices/setup/theme/nuxt.config.ts`

```typescript
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import svgLoader from 'vite-svg-loader';

const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss', 'shadcn-nuxt'],
  css: ['#theme/assets/scss/main.scss'],
  alias: {
    '#theme': currentDir,
  },
  tailwindcss: {
    cssPath: '#theme/assets/css/tailwind.css',
    configPath: './tailwind.config',
  },
  vite: {
    plugins: [svgLoader()],
  },
  shadcn: {
    prefix: '',
    componentDir: './slices/setup/theme/components/ui',
  },
});
```

> **Auto-Import**: The `shadcn-nuxt` module automatically registers all components from `componentDir`. No manual imports needed in templates!

### `slices/setup/theme/tailwind.config.js`

```javascript
const animate = require('tailwindcss-animate');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  safelist: ['dark'],

  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        manrope: ['Manrope', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        xl: 'calc(var(--radius) + 4px)',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 },
        },
        'collapsible-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-collapsible-content-height)' },
        },
        'collapsible-up': {
          from: { height: 'var(--radix-collapsible-content-height)' },
          to: { height: 0 },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'collapsible-down': 'collapsible-down 0.2s ease-in-out',
        'collapsible-up': 'collapsible-up 0.2s ease-in-out',
      },
    },
  },
  plugins: [animate, require('@tailwindcss/typography')],
};
```

### `slices/setup/theme/assets/css/tailwind.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --success: 120 60% 35%;
    --success-foreground: 120 40% 98%;
    --warning: 40 90% 50%;
    --warning-foreground: 40 60% 98%;
    --info: 200 85% 50%;
    --info-foreground: 200 40% 98%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
    --sidebar-background: 0 0% 98%;
    --sidebar-foreground: 240 5.3% 26.1%;
    --sidebar-primary: 240 5.9% 10%;
    --sidebar-primary-foreground: 0 0% 98%;
    --sidebar-accent: 240 4.8% 95.9%;
    --sidebar-accent-foreground: 240 5.9% 10%;
    --sidebar-border: 220 13% 91%;
    --sidebar-ring: 217.2 91.2% 59.8%;
  }

  /* .dark theme follows same pattern with inverted values */
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground font-manrope;
  }
}
```

### `slices/setup/theme/utils/cn.ts`

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### `slices/setup/theme/plugins/fonts.ts`

```typescript
export default defineNuxtPlugin(async (nuxtApp) => {
  const webFontLoader = await import('webfontloader');

  webFontLoader.load({
    google: {
      families: ['Manrope:100,300,400,500,700,900&display=swap'],
    },
  });
});
```

### `slices/setup/theme/components.json`

```json
{
  "$schema": "https://shadcn-vue.com/schema.json",
  "style": "default",
  "typescript": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "slices/setup/theme/assets/css/tailwind.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "framework": "nuxt",
  "aliases": {
    "components": "~/slices/setup/theme/components",
    "utils": "~/slices/setup/theme/utils/cn"
  }
}
```

---

## App Configuration

### Update Root `app.vue`

```vue
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
```

---

## Adding shadcn-vue Components

### Prerequisites

Before adding components, ensure the `components.json` file is in your app root:

```bash
# Copy from theme slice to app root (required for CLI to work)
cp slices/setup/theme/components.json ./components.json
```

### Installing Components with npx

**Always use `npx shadcn-vue@latest add`** to install components. This ensures:
- Components are placed in the correct directory (`slices/setup/theme/components/ui/`)
- Dependencies are automatically installed
- TypeScript types are properly configured

```bash
cd app

# Install a single component
npx shadcn-vue@latest add button

# Install multiple components at once
npx shadcn-vue@latest add card input textarea
```

### Common Components

```bash
npx shadcn-vue@latest add card separator scroll-area input textarea select checkbox switch form dropdown-menu navigation-menu tabs breadcrumb alert alert-dialog toast sonner dialog sheet popover tooltip table avatar badge
```

Full list: https://www.shadcn-vue.com/docs/components

---

## Usage Examples

### Using UI Components (Auto-Imported)

Thanks to `shadcn-nuxt`, all UI components are **auto-imported** and can be used directly in templates:

```vue
<template>
  <Card>
    <CardHeader>
      <CardTitle>User Profile</CardTitle>
    </CardHeader>
    <CardContent>
      <Input placeholder="Enter your name" />
      <Button class="mt-4">Save</Button>
    </CardContent>
  </Card>
</template>
```

### Using Icons

```vue
<script setup lang="ts">
import { User, Settings, LogOut } from 'lucide-vue-next';
</script>

<template>
  <div class="flex gap-4">
    <User class="h-5 w-5" />
    <Settings class="h-5 w-5" />
    <LogOut class="h-5 w-5" />
  </div>
</template>
```

---

## Color Token Reference

| Token | Usage | Sidebar Variant |
| --- | --- | --- |
| `background` | Page background | `sidebar-background` |
| `foreground` | Default text | `sidebar-foreground` |
| `primary` | Primary actions, links | `sidebar-primary` |
| `primary-foreground` | Text on primary | `sidebar-primary-foreground` |
| `secondary` | Secondary actions | -- |
| `secondary-foreground` | Text on secondary | -- |
| `muted` | Muted backgrounds | -- |
| `muted-foreground` | Muted text | -- |
| `accent` | Accents, highlights | `sidebar-accent` |
| `accent-foreground` | Text on accent | `sidebar-accent-foreground` |
| `destructive` | Errors, delete actions | -- |
| `destructive-foreground` | Text on destructive | -- |
| `success` | Success states | -- |
| `warning` | Warning states | -- |
| `info` | Informational states | -- |
| `card` | Card backgrounds | -- |
| `popover` | Popover/dropdown backgrounds | -- |
| `border` | Border colors | `sidebar-border` |
| `input` | Input borders | -- |
| `ring` | Focus rings | `sidebar-ring` |

---

## Dark Mode

Dark mode uses the `.dark` class on `<html>`. Tailwind is configured with `darkMode: ['class']`.

```typescript
// composables/useDarkMode.ts
export function useDarkMode() {
  const isDark = ref(false);

  // Restore from localStorage or system preference on init
  onMounted(() => {
    const stored = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    isDark.value = stored === 'true' || (stored === null && prefersDark);
    document.documentElement.classList.toggle('dark', isDark.value);
  });

  const toggle = () => {
    isDark.value = !isDark.value;
    document.documentElement.classList.toggle('dark', isDark.value);
    localStorage.setItem('darkMode', String(isDark.value));
  };

  return { isDark, toggle };
}
```

---

## Checklist

### Initial Setup

- [ ] Install all dependencies
- [ ] Create slice folder structure
- [ ] Configure `nuxt.config.ts` with alias
- [ ] Create `tailwind.config.js`
- [ ] Create `tailwind.css` with CSS variables
- [ ] Create `cn.ts` utility
- [ ] Create fonts plugin
- [ ] Copy `components.json` to root

### For Each Component Added

- [ ] Run `npx shadcn-vue@latest add [component]`
- [ ] Component placed in `slices/setup/theme/components/ui/`
- [ ] Export from component index if needed

### Never Do

- [ ] NO UI components outside theme slice
- [ ] NO hardcoded colors (use CSS variables)
- [ ] NO relative imports (use `#theme` alias)
- [ ] NO inline styles for theming

---

## Related Documentation

- [App Setup](./setup-app.md) - Nuxt application setup
- [Error Setup](./app-error.md) - Error handling
- [i18n Setup](./app-i18n.md) - Internationalization

# UI Components Library

Reusable Tailwind CSS components for the NoClue application.

## Components

### Button

A customizable button component with primary and danger variants. Features subtle border radius and generous padding for a modern look.

```tsx
import { Button } from '@/components/ui';

// Primary button
<Button onClick={handleClick}>Submit Answer</Button>

// Danger variant
<Button variant="danger" onClick={handleDelete}>Delete</Button>

// Disabled
<Button disabled={!isValid}>Submit</Button>
```

**Props:**
- `variant?: 'primary' | 'danger'` - Button style variant (default: 'primary')
- `disabled?: boolean` - Disable the button
- `className?: string` - Additional CSS classes
- All standard HTML button attributes

**Styling:**
- Border radius: `rounded` (subtle rounded corners)
- Padding: `py-3` (vertical), `px-4` (horizontal)
- Full width by default

---

### DifficultyBadge

Displays a color-coded difficulty badge.

```tsx
import { DifficultyBadge } from '@/components/ui';

<DifficultyBadge difficulty="easy" />
<DifficultyBadge difficulty="medium" />
<DifficultyBadge difficulty="hard" />
```

**Props:**
- `difficulty: string` - Difficulty level (easy, medium, hard)
- `className?: string` - Additional CSS classes

**Colors:**
- Easy: Green (`bg-green-100 text-green-700`)
- Medium: Orange (`bg-orange-100 text-orange-700`)
- Hard: Red (`bg-red-100 text-red-700`)

---

### Card Components

Flexible card components for displaying content with consistent spacing.

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

<Card onClick={handleClick} selected={isSelected}>
  <CardHeader>
    <CardTitle>Question Title</CardTitle>
    <CardContent>
      Additional information here
    </CardContent>
  </CardHeader>
</Card>
```

**Card Props:**
- `onClick?: () => void` - Click handler (makes card clickable)
- `selected?: boolean` - Show selected state with blue border
- `className?: string` - Additional CSS classes

**CardHeader:**
- Provides `space-y-2` spacing between child elements

**CardTitle Props:**
- `href?: string` - Optional link URL
- `className?: string` - Additional CSS classes
- Styled in blue (`text-blue-600`) with hover underline

**CardContent:**
- Default text styling in slate gray (`text-slate-600`)

**Styling:**
- Padding: `p-4` (internal card padding)
- Border radius: `rounded-lg`
- Selected state: Blue border and shadow

---

### UserAvatar

Displays user initials in a circular avatar with customizable sizes.

```tsx
import { UserAvatar } from '@/components/ui';

<UserAvatar username="@johndoe" />
<UserAvatar username="@janedoe" size="lg" />
```

**Props:**
- `username: string` - Username (@ symbol is stripped automatically)
- `size?: 'sm' | 'md' | 'lg'` - Avatar size (default: 'md')
  - `sm`: 8x8 (h-8 w-8)
  - `md`: 12x12 (h-12 w-12)
  - `lg`: 16x16 (h-16 w-16)
- `className?: string` - Additional CSS classes

---

### UserCard

Complete user card with avatar, role, and join date. Features a clean layout with calendar icon.

```tsx
import { UserCard } from '@/components/ui';

<UserCard
  username="@johndoe"
  role="React Dev"
  joinedDate="Joined December 2021"
/>
```

**Props:**
- `username: string` - User's username
- `role: string` - User's role/title
- `joinedDate: string` - Join date text
- `className?: string` - Additional CSS classes

**Features:**
- Automatically uses `UserAvatar` component (size: md)
- Calendar icon for join date
- Username in blue (`text-blue-600`)
- Rounded border with shadow

---

### Loading & Spinner

Loading spinner components for indicating async operations and page loading states.

```tsx
import { Loading, Spinner } from '@/components/ui';

// Full loading state with message
<Loading message="Loading questions..." />

// Just the spinner
<Spinner size="lg" />
<Spinner size="md" />
<Spinner size="sm" />
```

**Loading Props:**
- `message?: string` - Loading message text (default: "Loading...")
- `className?: string` - Additional CSS classes

**Spinner Props:**
- `size?: 'sm' | 'md' | 'lg'` - Spinner size (default: 'md')
  - `sm`: 6x6 (h-6 w-6)
  - `md`: 12x12 (h-12 w-12)
  - `lg`: 16x16 (h-16 w-16)
- `className?: string` - Additional CSS classes

**Features:**
- Animated circular spinner
- Centered layout with optional message
- Accessibility support with ARIA labels
- Color scheme matches app design (slate with dark accent)

**Usage in Pages:**
```tsx
if (loading) {
  return (
    <PageLayout header={<PageHeader title="My App" />}>
      <Loading message="Loading data..." />
    </PageLayout>
  );
}
```

---

## Usage Example

Here's a complete example using multiple components:

```tsx
'use client';

import { useState } from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  DifficultyBadge,
  UserCard,
} from '@/components/ui';
import { PageHeader } from '@/components/layout';

export default function ExamplePage() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-white">
      <PageHeader title="Example Page" />
      
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="space-y-6">
          <Card onClick={() => setSelected('1')} selected={selected === '1'}>
            <CardHeader>
              <CardTitle>Example Question</CardTitle>
              <CardContent>Topics: Array, String</CardContent>
              <DifficultyBadge difficulty="easy" />
            </CardHeader>
          </Card>

          <UserCard
            username="@johndoe"
            role="Developer"
            joinedDate="Joined January 2024"
          />

          <div className="space-y-2">
            <Button onClick={() => alert('Clicked!')}>
              Submit Answer
            </Button>
            <Button variant="danger">
              Leave Session
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
```

## Spacing Guidelines

Use Tailwind spacing utilities for consistent layouts:

- **Between cards/sections**: `space-y-6` (24px)
- **Between form elements**: `space-y-2` or `space-y-3`
- **Page padding**: `px-6 py-8`
- **Container max width**: `max-w-6xl`

## Customization

All components accept a `className` prop for additional styling:

```tsx
<Button className="mt-4 mx-auto">Custom Button</Button>
<Card className="hover:border-blue-500">Custom Card</Card>
```

## Color Palette

The component library uses a consistent color scheme:

- **Primary**: Slate 900 (`bg-slate-900`)
- **Danger**: Red 500 (`bg-red-500`)
- **Links/Interactive**: Blue 600 (`text-blue-600`)
- **Secondary text**: Slate 600 (`text-slate-600`)
- **Borders**: Slate 200 (`border-slate-200`)
- **Selected/Active**: Blue 400 (`border-blue-400`)

## Important Notes

### Global CSS
The project uses Tailwind CSS v4 with minimal global styles. Avoid adding custom resets in `globals.css` that might conflict with Tailwind utilities (e.g., universal margin/padding resets).

### Tailwind Configuration
Components rely on Tailwind's default spacing scale. If you modify spacing in `tailwind.config.js`, ensure consistency across all components.


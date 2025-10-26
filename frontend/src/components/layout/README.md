# Layout Components

Reusable layout components for structuring pages in the NoClue application.

## Components

### PageLayout

A flexible page layout component that provides consistent structure with header, optional sidebar, and scrollable main content. Uses full viewport height with fixed positioning.

```tsx
import { PageLayout } from '@/components/layout';
import { PageHeader } from '@/components/ui';

<PageLayout
  header={<PageHeader title="My Page" />}
  sidebar={<Sidebar title="Navigation" bottomContent={<div>Footer</div>} />}
>
  {/* Main content here */}
  <div>Your scrollable content</div>
</PageLayout>
```

**Props:**
- `header: React.ReactNode` - Header content (typically PageHeader component)
- `sidebar?: React.ReactNode` - Optional sidebar component
- `children: React.ReactNode` - Main content area (scrollable)
- `className?: string` - Additional CSS classes

**Features:**
- Full viewport height (`h-screen`)
- Flexbox layout with fixed header
- Automatic sidebar/content grid layout (280px sidebar + flexible content)
- Scrollable main content area
- Responsive grid layout (sidebar collapses on mobile)

---

### Sidebar

A flexible sidebar component with title at top and content pinned to bottom. Perfect for navigation, user info, and action buttons.

```tsx
import { Sidebar } from '@/components/layout';
import { Button, UserCard } from '@/components/ui';

const bottomContent = (
  <>
    <UserCard username="@user" role="Developer" joinedDate="Joined 2024" />
    <Button>Action</Button>
  </>
);

<Sidebar
  title="Select Question:"
  bottomContent={bottomContent}
>
  {/* Optional middle content */}
  <div>Additional content here</div>
</Sidebar>
```

**Props:**
- `title: string` - Title displayed at the top of sidebar
- `children?: React.ReactNode` - Optional content in the middle section
- `bottomContent?: React.ReactNode` - Content pinned to bottom (e.g., user cards, buttons)
- `className?: string` - Additional CSS classes

**Layout Sections:**
1. **Top**: Title (fixed at top)
2. **Middle**: Optional children content (flexible height)
3. **Bottom**: Bottom content (pinned to bottom with `mt-auto`)

---

### PageHeader

Standard page header component that displays the application title. Always shows "No Clue" branding at the top of pages.

```tsx
import { PageHeader } from '@/components/layout';

<PageHeader title="No Clue" />

// With additional content
<PageHeader title="No Clue">
  <p className="text-sm text-gray-600">Your coding interview practice partner</p>
</PageHeader>
```

**Props:**
- `title: string` - Page title (typically "No Clue")
- `children?: React.ReactNode` - Optional additional content below title
- `className?: string` - Additional CSS classes

**Features:**
- Consistent branding across all pages
- Large, bold title (text-4xl font-bold)
- Bottom border for visual separation
- Centered content with max-width container
- Responsive padding

---

## Usage Examples

### Basic Page with Sidebar

```tsx
'use client';

import { PageLayout, Sidebar } from '@/components/layout';
import { PageHeader, Button, UserCard } from '@/components/ui';
import { useState } from 'react';

export default function MyPage() {
  const [selected, setSelected] = useState<string | null>(null);

  const sidebarBottom = (
    <>
      <UserCard username="@john" role="Dev" joinedDate="Joined 2024" />
      <Button disabled={!selected}>Submit</Button>
      <Button variant="danger">Leave</Button>
    </>
  );

  return (
    <PageLayout
      header={<PageHeader title="My App" />}
      sidebar={<Sidebar title="Navigation:" bottomContent={sidebarBottom} />}
    >
      <div className="space-y-4">
        {/* Your scrollable content */}
        <Card onClick={() => setSelected('1')}>Content 1</Card>
        <Card onClick={() => setSelected('2')}>Content 2</Card>
      </div>
    </PageLayout>
  );
}
```

### Page Without Sidebar

```tsx
<PageLayout header={<PageHeader title="Full Width Page" />}>
  <div className="space-y-6">
    {/* Full width content */}
    <h1>Welcome</h1>
    <p>This takes up the full width</p>
  </div>
</PageLayout>
```

### Loading/Error States

```tsx
if (loading) {
  return (
    <PageLayout header={<PageHeader title="My App" />}>
      <div className="py-12 text-slate-600">Loading...</div>
    </PageLayout>
  );
}

if (error) {
  return (
    <PageLayout header={<PageHeader title="My App" />}>
      <div className="py-12 text-red-600">Error: {error.message}</div>
    </PageLayout>
  );
}
```

---

## Layout Structure

```
┌─────────────────────────────────────────┐
│           PageHeader (fixed)            │
├──────────┬──────────────────────────────┤
│          │                              │
│  Sidebar │    Main Content              │
│  (fixed) │    (scrollable)              │
│          │                              │
│  Title   │  • Your content here         │
│  ↓       │  • Scrolls independently     │
│          │  • Full height               │
│  [flex]  │                              │
│  ↓       │                              │
│  Bottom  │                              │
│  Content │                              │
└──────────┴──────────────────────────────┘
```

---

## Styling Guidelines

### Sidebar Width
- Default: `280px` (defined in PageLayout grid)
- Customizable via Tailwind config if needed

### Spacing
- Header padding: `px-6 py-6`
- Main content padding: `px-6 py-6`
- Max width: `max-w-6xl` (centered)
- Gap between sidebar and content: `gap-6`

### Responsive Behavior
- Desktop (`lg` breakpoint): Two-column layout with sidebar
- Mobile: Sidebar stacks above content (default grid behavior)

---

## Best Practices

1. **Always use PageLayout for page structure** - Ensures consistent layout across the app
2. **Use Sidebar for fixed navigation** - Perfect for user info and persistent actions
3. **Keep main content scrollable** - Let users scroll through long lists/content
4. **Pin important actions to sidebar bottom** - Easy access without scrolling

---

## Integration with UI Components

Layout components work seamlessly with UI components:

```tsx
import { PageLayout, Sidebar } from '@/components/layout';
import { PageHeader, Card, Button, UserCard } from '@/components/ui';

// All components follow the same design system
<PageLayout
  header={<PageHeader title="App" />}
  sidebar={
    <Sidebar
      title="Menu:"
      bottomContent={
        <>
          <UserCard {...userProps} />
          <Button>Action</Button>
        </>
      }
    />
  }
>
  <Card>Content</Card>
</PageLayout>
```

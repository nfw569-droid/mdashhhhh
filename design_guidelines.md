# Design Guidelines: Excel Data Analysis Dashboard

## Design Approach
**Selected Approach:** Design System-inspired (Modern Analytics Dashboard)  
**Reference Inspiration:** Linear (clean typography), Notion (approachable data), Stripe (professional minimalism)  
**Core Principle:** Data clarity first—every element serves the user's analytical needs with sophisticated simplicity.

---

## Color Palette

**Dark Mode (Primary):**
- Background: 222 15% 8% (deep charcoal)
- Surface: 222 13% 12% (card backgrounds)
- Surface Elevated: 222 12% 15% (hover states)
- Border: 222 10% 20% (subtle separation)
- Primary: 262 83% 58% (vibrant purple for CTAs)
- Primary Muted: 262 50% 45% (secondary actions)
- Success: 142 71% 45% (positive metrics, streaks)
- Warning: 45 93% 47% (notable patterns)
- Danger: 0 72% 51% (anomalies)
- Text Primary: 0 0% 95%
- Text Secondary: 0 0% 65%
- Text Muted: 0 0% 45%

**Chart Colors (Data Visualization):**
- Person J: 262 83% 58% (purple)
- Person A: 173 80% 40% (teal)
- Person M: 24 80% 58% (coral)

---

## Typography

**Font Families:**
- Primary: 'Inter' (Google Fonts) - body, UI elements, data labels
- Display: 'Inter' with tighter letter-spacing for headings
- Monospace: 'Jetbrains Mono' - numerical data, statistics

**Type Scale:**
- Hero/Page Title: text-4xl font-bold tracking-tight
- Section Headings: text-2xl font-semibold
- Card Titles: text-lg font-medium
- Body: text-base font-normal
- Captions/Labels: text-sm text-gray-400
- Data Points: text-2xl font-mono font-semibold

---

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16, 24
- Micro spacing: p-2, gap-2 (tight UI elements)
- Standard spacing: p-4, gap-4, p-6 (cards, sections)
- Section spacing: py-8, py-12, py-16
- Large spacing: py-24 (page sections)

**Container Strategy:**
- Max width: max-w-7xl mx-auto px-6
- Dashboard grid: 12-column responsive grid
- Card spacing: gap-6 between cards

---

## Component Library

### Upload Zone
- Large dropzone (min-h-64) with dashed border (border-2 border-dashed)
- Icon: Upload cloud icon from Heroicons
- States: default, hover (border-primary), active (bg-primary/5)
- File format badge: .xlsx indicator with document icon

### Person Profile Cards (J, A, M)
- Individual cards with person initial as large decorative element
- Grid layout: 3 columns on desktop (grid-cols-3), stack on mobile
- Each card includes: person identifier, current week count, current month count, yearly total
- Color-coded accent border-top (4px) matching person's chart color

### Statistics Panels
- Key metrics in 2-column grid within each person card
- Format: Label (text-sm text-gray-400) + Value (text-2xl font-mono)
- Metrics: Weekly Avg, Monthly Avg, Peak Day, Longest Streak

### Chart Containers
- Full-width chart sections with dark surface background
- Chart titles with period selector (Week/Month/Year tabs)
- Responsive height: h-64 for compact, h-96 for detailed views
- Use Chart.js with dark theme configuration

### Insights Cards
- Highlighted insight boxes with subtle gradient backgrounds
- Icon indicators from Heroicons (TrendingUp, Calendar, Fire for streaks)
- Format: Icon + Insight text + Supporting metric

### Data Tables
- Alternating row backgrounds for readability
- Fixed header on scroll
- Monospace font for numerical columns
- Sort indicators on headers

### Navigation/Header
- Fixed top bar with app title and file upload status
- Minimal height (h-16) to maximize data viewing space
- Upload new file button always accessible

---

## Visualization Guidelines

**Chart Types:**
- Timeline: Line charts for trend analysis (daily/weekly patterns)
- Comparison: Grouped bar charts for person-to-person analysis
- Distribution: Heatmap calendar view for pattern detection
- Summary: Donut charts for yearly breakdown

**Chart Styling:**
- Grid lines: subtle (rgba(255,255,255,0.05))
- Tooltips: dark surface with white text
- Legend: horizontal, top-aligned
- Animations: smooth transitions (300ms ease)

---

## Page Structure

1. **Header Bar** - App title, current file name, re-upload button
2. **Upload Section** (when no file loaded) - Hero-style centered upload zone
3. **Overview Dashboard** - 3-column grid of person cards with quick stats
4. **Insights Panel** - Auto-detected patterns in horizontal scrollable cards
5. **Detailed Charts Section** - Stacked chart containers with period toggles
6. **Data Explorer** - Tabular view with filters and sorting

---

## Images

**No hero images required.** This is a data-focused application where visualizations (charts, graphs) serve as the primary visual elements. All imagery is data-driven through Chart.js renderings.

**Icons:** Use Heroicons via CDN for all UI icons (upload, calendar, trending, users, chart-bar).

---

## Accessibility & Interactions

- Maintain consistent dark theme across all elements including form inputs
- Chart data accessible via keyboard navigation
- Clear focus states (ring-2 ring-primary)
- Hover states for interactive elements (scale-105 transform)
- Loading states for file parsing with progress indicator
- Error states for parsing failures with retry option
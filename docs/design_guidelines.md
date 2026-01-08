# Design Guidelines: Tourism Offices Membership & License Renewal Portal

## Design Approach

**Selected System:** Material Design principles adapted for Bootstrap implementation
**Justification:** This administrative portal requires clear information hierarchy, robust form design, and intuitive status indicators. Material Design's emphasis on elevation, clear feedback, and structured layouts aligns perfectly with the workflow-driven nature of this application.

## Core Design Elements

### A. Typography

**Font Family:** 
- Primary: 'Roboto', system-ui, -apple-system, sans-serif (via Google Fonts)
- Monospace: 'Roboto Mono' for IDs, file names, technical data

**Hierarchy:**
- Page Titles: 2rem (32px), font-weight 500
- Section Headers: 1.5rem (24px), font-weight 500
- Card/Panel Titles: 1.25rem (20px), font-weight 500
- Body Text: 1rem (16px), font-weight 400
- Helper Text: 0.875rem (14px), font-weight 400
- Labels: 0.875rem (14px), font-weight 500, uppercase tracking-wide

### B. Layout System

**Spacing Units:** Tailwind-equivalent scale of 4, 8, 12, 16, 24, 32, 48
- Form spacing: 4 between labels/inputs, 8 between form groups
- Card padding: 24
- Section padding: 32 vertical, 16 horizontal (mobile), 24 horizontal (desktop)
- Page margins: 48 top/bottom on desktop, 24 on mobile

**Grid Structure:**
- Max container width: 1200px for main content areas
- Admin tables: Full-width within container
- Forms: Max-width 800px, centered
- Dashboard cards: 2-column on tablet, 3-column on desktop for metrics

### C. Component Library

**Navigation (Admin & Office)**
- Top horizontal navbar with logo left, user menu right
- Admin sidebar (collapsed on mobile): 240px wide, fixed position
- Navigation items: Clear labels, icons from Material Icons
- Active state: Subtle left border indicator (4px)
- Mobile: Hamburger menu with slide-out drawer

**Forms (Critical for this application)**
- Input fields: Full-width within form, consistent height 48px
- Labels: Above inputs, bold weight
- Multi-step indicators: Horizontal stepper showing progress (Registration, Office Info, Branches, Documents)
- File upload zones: Dashed border containers with clear drag-drop areas, min-height 120px
- Required field indicators: Asterisk in label
- Validation messages: Below input, small text
- Form sections: Separated by horizontal dividers with section titles

**Cards & Panels**
- Elevation: Subtle shadow (0 2px 8px rgba(0,0,0,0.1))
- Border-radius: 8px
- Status badges: Pill-shaped, positioned top-right of cards
- Document cards: Thumbnail icon + filename + upload date + download action

**Tables (Admin views)**
- Alternating row backgrounds for readability
- Sticky header on scroll
- Action buttons: Icon-only for compact layouts, icon+text for primary actions
- Status column: Badge indicators
- Sortable headers: Arrow indicators
- Responsive: Stack to cards on mobile

**Buttons**
- Primary actions: Solid fill, 40px height, 16px horizontal padding
- Secondary: Outlined style
- Destructive actions (reject): Distinct styling
- Icon buttons: 40px square, centered icon
- Button groups: Connected with subtle dividers

**Status Indicators**
- PENDING_APPROVAL: Amber badge
- ACTIVE: Green badge  
- REJECTED: Red badge
- SUBMITTED: Blue badge
- FINAL_APPROVED: Dark green badge
- Use consistent badge component: Rounded pill, uppercase small text

**Dashboard Widgets**
- Summary cards: Icon + label + large number/metric
- Recent activity list: Timeline-style with dates
- Document count badges: Small pill indicators
- Quick action buttons: Prominent placement above fold

**Document Upload Interface**
- Three distinct sections clearly labeled with numbers and descriptions
- Each section: Expandable panel with upload zone inside
- Uploaded files: List view with thumbnail, filename, size, remove option
- Progress indicators for uploads
- File type restrictions clearly stated

**Modal/Dialog Patterns**
- Approval/Rejection dialogs: Centered overlay, max-width 500px
- Comment/reason text areas: Multi-line, min-height 100px
- Confirmation actions: Red reject button right, gray cancel left

**Empty States**
- Centered icon + message for no renewals, no documents
- Helpful CTA button to guide next action

### D. Accessibility & Interaction

- Focus states: Visible outline on all interactive elements
- Form autocomplete attributes for efficiency
- ARIA labels on icon-only buttons
- Keyboard navigation through all workflows
- Loading states: Spinner overlay during form submission
- Success/error toast notifications: Top-right corner, auto-dismiss

## Page-Specific Layouts

**Landing Page (Public)**
- Clean centered layout with association branding at top
- Two-column card layout for Login (left) and Create Account (right)
- Brief portal description above cards (max-width 700px)

**Registration Multi-Step Form**
- Progress stepper at top showing 4 steps
- Single step visible at a time
- Next/Previous buttons at bottom
- Step 4 (Documents): Three accordion sections for upload categories

**Office Dashboard**
- Top: Welcome banner with office name + status badge
- Grid of metric cards (2-3 columns): Total documents, Active renewals, Account status
- Main content area: Tabs for Overview, Documents, Renewals
- Prominent "Request License Renewal" CTA button

**Admin Office Detail Page**
- Header: Office name + status + action buttons (Approve/Reject)
- Tabbed sections: Office Info, Branches, Documents
- Document section: Grouped by category with expandable panels

**Admin Renewals List**
- Filterable table with search
- Columns: Office Name, Year, Status, Date Submitted, Actions
- Status filter dropdown above table

**Renewal Detail View (Both Roles)**
- Timeline visualization of renewal stages
- Current status prominently displayed
- Conditional sections based on status (download area, upload area)
- Admin: Comment/action panel at bottom

## Images

**Hero/Branding:**
- No large hero image needed for this utility application
- Small association logo in navigation (max-height 40px)
- Potentially: Small decorative header image on landing page (max-height 200px) showing tourism/Jordan imagery

**Icons:**
- Material Icons via CDN for all UI icons (navigation, actions, file types)
- Document type icons for uploaded files
- Status icons within badges

**Imagery Strategy:**
This is a functional portal; avoid decorative imagery that distracts from workflows. Focus on clear iconography and data visualization.
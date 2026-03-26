# Chore Calendar Roadmap

> **Design principle:** Mobile-first, minimal friction. Optimised for quick use on phones - especially for household members like Jules who need things to just work.

> **Platform:** PWA (Progressive Web App) - no native app needed. Add to home screen, offline support, push notifications all handled via web standards. Capacitor available as escape hatch if needed later.

## User Identity

- [x] **One-tap user selection** - Tap your name/avatar on first visit, no passwords
- [x] Remember selected user in localStorage (persists across sessions)
- [x] Avatar in header showing current user, tap to switch
- [x] Auto-assign new completions to current user

## Mobile Experience (Priority)

- [x] **PWA support** - Service worker, offline capability, install prompt
- [x] **Mobile-first UI** - Large touch targets (44px minimum), thumb-friendly navigation
- [x] Bottom navigation bar for mobile (Home, Chores, Shop, Us, More)
- [x] Add to home screen with app icon
- [ ] Swipe gestures - swipe right to complete, swipe left to snooze
- [ ] Pull-to-refresh on task lists
- [ ] Haptic feedback on actions

## Notifications

- [ ] **Push notifications** - Web push for due/overdue tasks
- [ ] Notification preferences per user
- [ ] Daily digest option
- [ ] Tap notification to go directly to task

## Task Automation

- [ ] **Recurring task improvements** - Better scheduling logic for complex frequencies
- [ ] Auto-advance next due date on completion
- [ ] Skip/defer functionality with reason tracking
- [ ] Seasonal task activation/deactivation

## Recipes

- [ ] **Recipe import** - Paste URL, auto-parse recipe from common sites
- [ ] **Markdown storage** - Store recipe instructions as markdown for better formatting
- [ ] Recipe scaling (adjust servings)
- [ ] Recipe categories/tags
- [ ] "Cook mode" - large text, screen stays on, step-by-step view

## Photo Attachments

- [ ] **Local server storage** - Upload and store photos locally
- [ ] **Quick camera capture** - Tap to open camera directly on mobile
- [ ] Attach photos to appliances (product photos, serial numbers)
- [ ] Attach photos to completions (before/after, receipts)
- [ ] Attach photos to vendors (business cards, invoices)

## Financial Tracking

- [ ] **Invoice tracking** - Snap photo of invoice, link to vendor job
- [ ] **Spend tracking** - Track costs per vendor, per category, over time
- [ ] Cost history on task completions
- [ ] Simple cost entry on task completion (optional field)
- [ ] Annual maintenance cost summary

## Shopping (Enhancements)

- [ ] Quick-add from anywhere (floating action button)
- [ ] Voice input for adding items
- [ ] Check items offline, sync when back online
- [ ] Share list via link for non-app users

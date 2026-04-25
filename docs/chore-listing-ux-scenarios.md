# Chore Listing Page - User Scenarios & UI Fitness Assessment

Assessment of `/tasks` (All Tasks page) against real user scenarios.

---

## Scenario 1: Complete a task ahead of schedule

**Situation:** I cleaned the gutters this morning even though they're not due for another 2 weeks. I want to mark the task as complete so the next due date recalculates from today.

**Walkthrough:**
1. Open `/tasks` - all tasks load, sorted by `nextDue` descending (furthest future first)
2. The task isn't overdue so it has no red badge. I need to find it by scrolling or searching
3. Search "gutters" in the search bar - works, finds the task quickly
4. Click "Done" button - one click, fires immediately
5. Backend calculates `nextDue` from today (not from old due date) - correct

**Verdict: PASS (with minor friction)**

- Search works well for finding a specific task by name
- "Done" is prominent and one-click
- Next due date correctly calculates from today (line 72 of `complete/route.ts`)
- Minor friction: if I'm browsing rather than searching, the sort order doesn't help - tasks due soonest aren't near the top

---

## Scenario 2: Snooze an overdue task to a specific date

**Situation:** I have an overdue task "Service the heat pump" that I've booked a technician for next Wednesday. I want to snooze it to that exact date so it stops showing as overdue.

**Walkthrough:**
1. Open `/tasks` - the overdue task has a red "Overdue" badge, but is sorted towards the bottom of the list (descending by `nextDue` puts old dates last)
2. Search "heat pump" to find it
3. Click the snooze (clock) button
4. Options shown: 1 day, 3 days, 1 week, 2 weeks
5. None of these land on next Wednesday. Closest option might overshoot or undershoot

**Verdict: FAIL**

- No custom date picker for snooze - only preset durations
- The user's only workaround is to edit the task and manually change the `nextDue` field, which doesn't feel like a "snooze" and is more steps
- **Recommendation:** Add a "Snooze to date..." option in the snooze popover that opens a calendar picker (similar to the "Complete on date..." pattern already used in CompleteButton)

---

## Scenario 3: Find all overdue tasks

**Situation:** It's Saturday morning. I want to see which tasks are overdue so I can plan my day.

**Walkthrough:**
1. Open `/tasks` - tasks load sorted `desc(tasks.nextDue)`
2. Overdue tasks (with the earliest `nextDue` values) are at the **bottom** of the list
3. No "Status" filter exists - filters only cover Area and Frequency
4. The red "Overdue" badges exist per-row but require scrolling through the entire list to spot them
5. I can't sort by column headers - the table has no sort controls

**Verdict: FAIL**

- The sort order actively works against this use case - overdue items are buried at the bottom
- No status/urgency filter to show "just overdue" or "due this week"
- The dashboard (`/`) handles this better by categorising tasks into Overdue/Today/This Week sections, but the All Tasks page doesn't replicate that capability
- **Recommendation (pick one or both):**
  - Change default sort to ascending `nextDue` (most overdue first), or add clickable column headers for sorting
  - Add a status filter bar: All / Overdue / Due Today / Due This Week / No Date

---

## Scenario 4: Backdate a completion

**Situation:** I mowed the lawn on Tuesday but forgot to log it. It's now Friday and I want to record the correct completion date.

**Walkthrough:**
1. Find "Mow the lawn" via search
2. Click the chevron dropdown next to "Done"
3. Select "Complete on date..."
4. Calendar opens - I select Tuesday
5. Calendar correctly prevents selecting future dates (line 101: `disabled={(date) => date > new Date()}`)
6. Completion record is saved with Tuesday's date
7. `nextDue` is still calculated from **today** (Friday), not Tuesday

**Verdict: PASS**

- The "Complete on date..." feature handles this well
- The calendar correctly limits to past dates
- Next due calculating from today (not the backdated date) is the right call - it prevents the task from already being "overdue" the moment you complete it late

---

## Scenario 5: Complete a task done by a contractor and record the cost

**Situation:** A plumber came and serviced the hot water system. I want to log who did it and that it cost $180.

**Walkthrough:**
1. Find the task via search
2. Click the chevron dropdown next to "Done"
3. Select "Complete with details..."
4. CompletionDetailsDialog opens with: date picker, vendor dropdown, cost input
5. Select the plumber from vendor list, enter $180, submit

**Verdict: PASS**

- The "Complete with details..." flow handles vendor + cost well
- Vendor must already exist in the system (fetched from `/api/vendors`)
- No ability to add a new vendor inline if they don't exist yet - minor friction but out of scope for this page

---

## Scenario 6: Accidental completion

**Situation:** I accidentally tap "Done" on a task. The next due date has now jumped forward by a month.

**Walkthrough:**
1. The "Done" button fires immediately on click - no confirmation
2. A completion record is created and `nextDue` is recalculated
3. To undo: I need to edit the task, manually reset `nextDue`, and there's no way to delete the erroneous completion record from the UI

**Verdict: FAIL**

- No undo/confirmation on the primary "Done" action
- The dropdown options ("Complete on date...", "Complete with details...") have multi-step flows that provide natural confirmation, but the quick "Done" button doesn't
- On mobile especially (larger touch targets, `h-10`), accidental taps are more likely with 4 action buttons per row
- **Recommendation:** Either add a brief toast with "Undo" link after completion, or add a lightweight confirmation step (even just a 2-second "tap again to confirm" pattern)

---

## Scenario 7: Filter to a specific area for a deep clean

**Situation:** I'm deep-cleaning the kitchen today. I want to see only kitchen tasks.

**Walkthrough:**
1. Open `/tasks` - filter bar shows Area buttons
2. Click "Kitchen" - list filters to kitchen tasks only
3. Counter updates: "12 of 85 tasks"
4. I can see all kitchen tasks and work through them

**Verdict: PASS**

- Area filter is prominent and one-click
- Button highlights clearly show active filter state
- Task counter gives useful feedback
- Can combine with search for further narrowing

---

## Scenario 8: View the detailed instructions/checklist for a task

**Situation:** I need to service the dishwasher but can't remember the steps. I know there are extended notes with a checklist.

**Walkthrough:**
1. Find the task - the name is clickable (blue hover) if it has extended notes
2. Also shows a small "Extended notes" link with a file icon
3. Click either - TaskDetail dialog opens showing rendered Markdown
4. Can see the step-by-step checklist

**Verdict: PASS**

- Two clear affordances for viewing notes (clickable name + explicit link)
- Markdown rendering means checklists display nicely
- Edit button in the detail dialog allows quick corrections

---

## Summary of Issues

| # | Issue | Severity | Effort |
|---|-------|----------|--------|
| 1 | Snooze lacks custom date picker | High | Low - mirror the CompleteButton's calendar pattern |
| 2 | Default sort buries overdue tasks | High | Low - change to `asc(tasks.nextDue)` or add column sorting |
| 3 | No status/urgency filter | Medium | Medium - add filter group (Overdue/Today/This Week) |
| 4 | No undo on accidental completion | Medium | Medium - add toast with undo, or delete-completion API |
| 5 | Mobile action button density (4 per row) | Low | Medium - consider overflow menu for edit/delete |

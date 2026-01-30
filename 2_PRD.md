# GoalTree - Manual Node Creation

**Product Requirements Document (PRD) & Implementation Plan**
**Version:** 1.1 (Manual Creation Feature)

---

## 1. Feature Vision

Currently, GoalTree relies primarily on the AI chatbot to create and structure goals. This feature adds **direct manual controls** that allow users to create, edit, and organize their goal tree without AI assistance.

**Why This Matters:**

* **User Control:** Not all users want AI involvement for every action. Some prefer direct manipulation.
* **Quick Additions:** Adding a simple task shouldn't require a conversation with AI.
* **Offline-First:** Manual controls work without an API key or network connection.
* **Complementary:** AI and manual creation coexist - users can choose their preferred workflow.

## 2. User Stories

### 2.1 Creating Root Goals

> *As a user, I want to create a new top-level goal directly from the tree view, so I can start organizing my plans without using the AI chat.*

**Acceptance Criteria:**
* A visible "New Goal" button in the tree view toolbar
* When tree is empty, a prominent call-to-action button in the empty state
* Clicking opens a dialog to enter goal title and description
* New goal appears at the root level of the tree

### 2.2 Adding Child Nodes

> *As a user, I want to add children (goals, milestones, requirements, tasks) to any existing node, so I can build out my goal hierarchy manually.*

**Acceptance Criteria:**
* Each node displays an "Add" button on hover or via a menu
* Clicking opens a dialog with type selection (Goal, Milestone, Requirement, Task)
* Task-specific fields (frequency, measurement) appear when Task type is selected
* New node appears as a child of the selected parent

### 2.3 Deleting Nodes

> *As a user, I want to delete nodes I no longer need, with a confirmation to prevent accidents.*

**Acceptance Criteria:**
* Each node displays a "Delete" button on hover or via a menu
* Confirmation dialog warns about cascade deletion (children will also be deleted)
* Shows count of affected children before confirmation
* Tree updates immediately after deletion

### 2.4 Quick Task Creation

> *As a user, I want a fast way to add tasks to a milestone or goal without navigating through menus.*

**Acceptance Criteria:**
* Inline "+" button visible on goal/milestone nodes
* Single-click opens a streamlined task creation form
* Defaults to "once" frequency for quick entry
* Enter key submits the form

## 3. Feature Requirements

### 3.1 Add Node Dialog (Enhanced)

The existing `AddChildDialog` component will be enhanced to support:

* **Root Goal Creation:** When no parent is selected, create at root level
* **Context-Aware Title:** Shows "Create New Goal" for root, "Add to [Parent Name]" for children
* **Type Restrictions:** Only "Goal" type available at root level (tasks need a parent)
* **Form Fields:**
  * Type selector (Goal, Milestone, Requirement, Task)
  * Title (required)
  * Description (optional)
  * Frequency (Task only): Once, Daily, Weekly, Custom
  * Measurement (Task only): Optional metric string

### 3.2 Tree View Controls

* **Toolbar Actions:**
  * "New Goal" button (always visible, creates root goal)
  * Existing: Expand All, Collapse All, Refresh

* **Empty State:**
  * Friendly message: "No goals yet"
  * Primary action button: "Create Your First Goal"
  * Secondary text explaining the feature

* **Node Actions (on hover/focus):**
  * "+" Add child button
  * Trash icon for delete
  * Actions appear on hover for clean UI

### 3.3 Delete Confirmation Dialog

* **Title:** "Delete [Node Title]?"
* **Warning Message:** Explains cascade deletion
* **Child Count:** "This will also delete X children"
* **Actions:** Cancel (secondary), Delete (destructive)

### 3.4 Keyboard Shortcuts (Future Enhancement)

* `N` - New root goal
* `A` - Add child to selected node
* `Delete/Backspace` - Delete selected node (with confirmation)
* `Enter` - Expand/collapse selected node

## 4. UI/UX Specifications

### 4.1 Button Placement

```
┌─────────────────────────────────────────────────┐
│ GoalTree                            [Settings]  │
├─────────────────────────────────────────────────┤
│ 3 goals · 5/12 tasks done                       │
│ [+ New Goal] [Expand All] [Collapse] [Refresh]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─ Goal: Buy a House ──────────────── [+] [🗑] │
│  │   ├─ Requirement: Budget $500k               │
│  │   └─ Milestone: Financial Prep ───── [+] [🗑]│
│  │       └─ Task: Review savings ✓              │
│  │                                              │
└─────────────────────────────────────────────────┘
```

### 4.2 Empty State

```
┌─────────────────────────────────────────────────┐
│                                                 │
│                    🌲                           │
│                                                 │
│              No goals yet                       │
│                                                 │
│   Start by creating your first goal to begin   │
│        planning your journey.                  │
│                                                 │
│          [ Create Your First Goal ]            │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 4.3 Node Hover State

* Smooth fade-in of action buttons (150ms)
* Buttons appear on the right side of the node card
* Icons only (tooltips on hover): Plus (+), Trash (🗑)
* Touch devices: Actions visible via long-press or dedicated menu button

## 5. Data Flow

### 5.1 Creating a Node

```
User Action → Dialog Opens → Form Submitted
                               ↓
                         Validation
                               ↓
                    useGoalTree.addGoal()
                               ↓
                      GoalRepository.addGoal()
                               ↓
                         Dexie (IndexedDB)
                               ↓
                      Store Refresh → UI Update
```

### 5.2 Deleting a Node

```
User Clicks Delete → Confirmation Dialog
                           ↓
                    User Confirms
                           ↓
                useGoalTree.deleteGoal(id)
                           ↓
              GoalRepository.deleteNode() [CASCADE]
                           ↓
                     Dexie (IndexedDB)
                           ↓
                Store Refresh → UI Update
```

## 6. Technical Considerations

### 6.1 Existing Infrastructure

The following already exists and will be leveraged:

* **`AddChildDialog`** - Needs enhancement for root goal support
* **`GoalRepository`** - Full CRUD operations ready (`addGoal`, `deleteNode`, etc.)
* **`useGoalTree` hook** - Exposes all necessary methods
* **`GoalTreeView`** - Has `onAddChild` and `onDelete` props (need wiring)

### 6.2 New Components Needed

* **`DeleteConfirmationDialog`** - Simple confirmation with cascade warning
* No new data models or database changes required

### 6.3 State Management

* Dialog open/close state managed in `app/page.tsx`
* Selected parent node tracked for "Add Child" operations
* No changes to Zustand store structure needed

---

# Implementation Checklist

This checklist is formatted for **Ralphy** to execute sequentially.

## Phase 1: Dialog Enhancement

- [x] Modify `AddChildDialog` to accept optional `parentNode` (null = root goal)
- [x] Update dialog title: "Create New Goal" when `parentNode` is null
- [x] Restrict type selection to "Goal" only when creating at root level
- [x] Update callback signatures to support optional `parentId`
- [x] Add tests for new dialog behavior

## Phase 2: Tree View Controls

- [x] Add "New Goal" button to `GoalTreeView` toolbar
- [x] Add `onCreateRootGoal` callback prop to `GoalTreeView`
- [x] Update empty state with "Create Your First Goal" button
- [x] Style buttons consistently with existing toolbar

## Phase 3: Node Action Buttons

- [x] Verify "Add Child" button visibility on `GoalNode` hover
- [x] Verify "Add Child" button visibility on `NodeItem` hover
- [x] Add "Delete" button to node hover state
- [x] Ensure buttons are accessible (keyboard navigation, ARIA labels)

## Phase 4: Delete Confirmation

- [x] Create `DeleteConfirmationDialog` component
- [x] Show node title and child count in confirmation
- [x] Wire delete confirmation to node delete buttons
- [x] Add cascade delete warning message

## Phase 5: Page Integration

- [x] Import `AddChildDialog` and `DeleteConfirmationDialog` in `app/page.tsx`
- [x] Add state for dialog open/close and selected parent node
- [x] Wire `onAddChild` callback from `AppLayout` to open dialog
- [x] Wire `onDelete` callback from `AppLayout` to open confirmation
- [x] Wire `onCreateRootGoal` to open dialog with null parent
- [x] Connect dialog submissions to `useGoalTree` methods

## Phase 6: Polish

- [x] Add loading states during node creation/deletion
- [x] Add success feedback (toast or visual confirmation)
- [x] Test keyboard navigation through dialogs
- [x] Verify mobile responsiveness of new buttons
- [x] Update any relevant tests

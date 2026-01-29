# GoalTree - AI-Powered Goal Planning App

**Product Requirements Document (PRD) & Implementation Plan**
**Version:** 1.0 (Local-First Edition)

---

## 1. Product Vision

**GoalTree** is a local-first web application designed to replace manual paper planning with an intelligent, flexible digital system. It helps users transform vague aspirations into structured, actionable plans through a hierarchical tree interface assisted by Artificial Intelligence.

**Core Philosophy:**

* **Self-Verification:** No external tracking integrations. The user is the source of truth.
* **Flexible Hierarchy:** Goals, milestones, and tasks can be nested infinitely and rearranged easily.
* **AI as a Partner:** The AI suggests, structures, and clarifies, but the user always has the final say.
* **Privacy First:** All data lives locally in the user's browser (IndexedDB).

## 2. Core Concepts & Data Structure

### The Hierarchy

1. **Goal:** The root or sub-root objective. Often a sentence describing a desired outcome (e.g., "Raise a child without back pain" or "Buy a house").
2. **Requirement:** Informational constraints or prerequisites. These are not checkable tasks but context (e.g., "Current weight: 60kg", "Budget: $500k").
3. **Milestone:** A significant checkpoint that groups related tasks (e.g., "Financial Preparation" or "Gym Foundation").
4. **Task:** An actionable item. Can be one-time or recurring (Habit).
* **Frequency:** Daily, Weekly (specific days), or Custom.
* **Measurement:** Optional metric (e.g., "Lift 8kg").



### Relationships

* **Vertical:** Parent/Child relationships (A Goal can have Milestones, which have Tasks).
* **Horizontal:** Sibling relationships (Tasks can be ordered sequentially).
* **Polymorphic:** A "Goal" can be a sub-goal of another.

## 3. Feature Requirements

### 3.1 Main Interface (Split View)

* **Left/Center (The Workspace):** A visual **Tree View** of goals.
* Expandable/Collapsible nodes.
* Visual distinction between Goals, Milestones, Requirements, and Tasks.
* Drag-and-drop reordering (future phase) or simple move controls.
* Progress bars based on completed children.


* **Right (The Companion):** A persistent **AI Chatbot** panel.
* Always available to assist with the current view.
* Can be minimized to a floating button.



### 3.2 AI Assistant Capabilities

* **Goal Extraction:** Turns vague statements (e.g., "I want to move house") into structured trees (Requirements: "Location", Tasks: "Search listings daily").
* **Context Awareness:** Can "see" the current goal tree to make relevant suggestions.
* **Interactive Editing:** When the user confirms an AI suggestion, the system updates the Tree View in real-time.
* **Brainstorming:** Helps define requirements (e.g., "What usually goes into planning a wedding?").

### 3.3 Weekly Planning (Calendar)

* **Time Blocking:** A visual weekly grid (Monday-Sunday).
* **Constraints:** visually marks "Work" (e.g., 9-18h) and "Sleep" blocks to show available free time.
* **Scheduling:** Users can drag tasks from the tree into specific time slots (e.g., "Practice instrument" at 8:00 AM).
* **Conflict Detection:** Visual warning if a task overlaps with work/sleep (non-blocking).

### 3.4 Local Data Management

* **Storage:** IndexedDB (via Dexie.js) for robust local storage.
* **Security:** OpenAI API Key is stored in LocalStorage (never sent to a backend).
* **Export:** JSON export/import to backup data.

## 4. Technical Stack

* **Framework:** Next.js 14+ (App Router)
* **Language:** TypeScript
* **Styling:** Tailwind CSS + ShadCN/UI
* **Local Database:** Dexie.js (Wrapper for IndexedDB)
* **State Management:** Zustand (Global store synced with Dexie)
* **AI Engine:** Vercel AI SDK (Client-side usage)

---

# Implementation Checklist

This checklist is formatted for **Ralphy** to execute sequentially. It builds the "Local-First" version of GoalTree.

## Project Setup

- [x] Initialize Next.js project with TypeScript, Tailwind, and App Router
- [x] Install ShadCN/UI and add base components (Button, Input, Sheet, Dialog, Card, ScrollArea, Tabs)
- [x] Install `dexie` and `dexie-react-hooks` for local database management
- [x] Install `lucide-react` for icons and `clsx`/`tailwind-merge` for styling utilities
- [x] Configure `ai` (Vercel AI SDK) for client-side chat integration

## Local Database (IndexedDB)

- [x] Initialize Dexie database instance in `src/db/index.ts`
- [x] Define the `Goal` table schema (id, title, description, parentId, type, status, createdAt)
- [x] Define the `Task` table schema (id, parentId, title, frequency, isCompleted, scheduledDate)
- [x] Define the `Settings` table schema (workHoursStart, workHoursEnd, sleepStart, sleepEnd)
- [x] Create a `seed.ts` script to populate a demo tree (e.g., the "Buy a House" example) for first-time load

## Core State & Data Layer

- [x] Create a `GoalRepository` class to handle Dexie CRUD operations (addNode, deleteNode, moveNode)
- [x] Set up `useGoalStore` with Zustand to manage the in-memory tree state and sync with Dexie
- [x] Create React Context or Hooks (`useGoals`, `useTasks`) to expose data to components

## UI Components: The Goal Tree

- [x] Create `NodeItem` component (the recursive building block for the tree)
- [x] Implement `GoalNode` variant (distinct visual style, progress bar)
- [x] Implement `TaskNode` variant (checkbox, frequency badge)
- [x] Implement `RequirementNode` variant (informational styling, non-checkable)
- [x] Build the main `GoalTreeView` container with expand/collapse logic
- [x] Create "Add Child" dialog to append new items to any node

## UI Components: AI Chatbot

- [x] Build the `ChatSidebar` component (collapsible panel on the right)
- [x] Create `useOpenAIKey` hook to manage the API key in LocalStorage
- [x] Implement the chat interface using `useChat` from Vercel AI SDK
- [x] Create a "Suggestion Card" component to display AI-proposed goal structures
- [x] Implement the "Apply" logic: Parse AI JSON response -> Insert into Dexie -> Update Tree

## UI Components: Calendar

- [x] Build `WeeklyView` component (CSS Grid based 7-column layout)
- [x] Implement `TimeSlot` rendering logic to visualize Work and Sleep blocks from settings
- [x] Create `DraggableTask` logic (or simple "Click to Schedule" modal) to assign tasks to time slots
- [x] Render scheduled tasks onto the grid

## Polish & Integration

- [x] Create a `Layout` wrapper that combines the Tree View (Left) and Chat Sidebar (Right)
- [x] Implement the `SettingsModal` to configure Work/Sleep hours
- [x] Add a "Reset/Clear Data" button in settings for debugging
- [x] Verify mobile responsiveness (stack views instead of split screen on small devices)
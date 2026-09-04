# Ledger

Ledger is a single-page student study planner and grade dashboard. It organizes courses and assignments, tracks deadlines and grades, and runs directly in the browser with no build step.

## Run locally

Open `index.html` directly in a browser, or serve the folder with VS Code Live Server.

## Features

### Version 1

- Dashboard summary for total, completed, remaining, overdue, and average graded assignments
- Course and assignment add, edit, and delete flows
- Inline priority and status controls
- Course accent colors and progress tracking
- Unopened assignment indicators
- Overdue calculation based on the current date
- Responsive sidebar navigation and modal forms

### Version 2 additions

- Notification bell for overdue and next-48-hour assignments, with jump-to-assignment links
- Calendar month view grouped by due date
- Inline SVG grade averages by course
- Persisted dark mode
- JSON export and import backup controls
- Completion confetti for a newly completed 100% assignment
- Warm milky-coffee visual refresh and expanded empty states

## Data model

- **Course:** `id`, `name`, `code`, `instructor`, `color`, `credits`
- **Assignment:** `id`, `courseId`, `title`, `dueDate`, `priority`, `status`, `grade`, `opened`, `notes`

Data is stored in the browser's `localStorage` under the Ledger key and is therefore per-browser and per-device.

## Backups

Use the download icon in the top bar to export courses and assignments as a JSON file. Use the upload icon to select a previously exported Ledger JSON file and restore it in the current browser.

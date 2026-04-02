# Zorvyn Finance Dashboard

A responsive React + TypeScript dashboard built for a frontend evaluation task. It focuses on clean information hierarchy, interactive filtering, role-based UI behavior, and a polished visual presentation using only local mock data.

## What it includes

- Summary cards for total balance, income, expenses, and savings rate
- A balance trend chart for monthly performance
- A spending breakdown visualization by category
- A searchable, filterable, and sortable transactions table
- A multipage route setup with dedicated pages for Overview, Transactions, and Insights
- Viewer and admin roles with different UI behavior
- Admin create, edit, and delete controls for transactions
- Auto-derived insights, including the highest spending category and a monthly comparison
- CSV and JSON export actions
- Local persistence for transactions, theme, and selected role

## Tech Stack

- React 19
- TypeScript
- Vite
- Plain CSS for layout, theme, and responsive styling

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Pages

- `/overview` for summary cards and charts
- `/transactions` for filtering, sorting, searching, and admin editing
- `/insights` for auto-generated financial observations

## Notes on the implementation

- The app uses seeded mock transactions and stores updates in `localStorage`.
- The role selector simulates basic RBAC. Viewer mode is read only, while Admin mode exposes add/edit/delete controls.
- Charts are rendered with native SVG so the dashboard stays dependency-light and easy to review.
- Empty states are handled throughout the interface so filters and role changes do not break the layout.

## File Structure

- `src/App.tsx` contains the dashboard logic, computed summaries, charts, filters, and role behavior.
- `src/App.css` defines the dashboard layout, cards, chart styling, and responsive behavior.
- `src/index.css` provides the global reset and theme background.

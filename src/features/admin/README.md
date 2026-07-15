# Admin Feature

## Purpose
Administrative dashboard for inventory management, orders overview, and platform settings.
**Not yet implemented.** Infrastructure is in place; UI and pages are pending.

## Structure
```
features/admin/
├── components/ — AdminSidebar, ProductInventoryTable, OrdersOverview to be built here
├── constants/  — Admin menu items, metrics configs
├── hooks/      — useAdminDashboard, useInventory hooks
├── services/   — Admin-specific API endpoints (products CRUD, orders updates)
├── types/      — Inventory, DashboardMetrics types
└── utils/      — Report generators, analytics formatters
```

## Dependencies (planned)
- `@/lib/api` — axios instance
- `@/store/authStore` — for checking admin roles

## Future Work
1. Implement product CRUD management tables
2. Add overview graphs and status reports for orders
3. Create `src/app/admin/` dashboard layout and child page routes

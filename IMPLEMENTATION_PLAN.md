# API Usage Dashboard - Implementation Plan

This plan addresses five key areas for improvement:

1. Real API integration (replacing mock data)
2. Persistent storage for share links
3. Enhanced authentication with user accounts
4. Functional dark mode toggle
5. Shared component abstractions

---

## Phase 1: Functional Dark Mode Toggle

**Priority: High (Quick Win)**
**Complexity: Low**

The `isDark` state is already wired up but doesn't actually change the theme. This is the fastest fix.

### Tasks

1. **Update Tailwind configuration**
   - File: `tailwind.config.js`
   - Add `darkMode: 'class'` configuration
   - Define dark mode color variants in theme extension

2. **Create theme context provider**
   - File: `lib/ThemeContext.tsx` (new)
   - Wrap app with context to avoid prop drilling
   - Persist preference to localStorage
   - Respect system preference on first visit

3. **Update root element class**
   - File: `pages/_app.tsx` or `pages/index.tsx`
   - Toggle `dark` class on `<html>` or root container based on theme state

4. **Update component styles**
   - Add `dark:` variants to all components:
     - `Sidebar.tsx`: dark backgrounds, borders, text colors
     - `StatCard.tsx`: dark card backgrounds
     - `DashboardPage.tsx`: dark surface colors
     - All chart components: dark-friendly color palettes
     - All page components: consistent dark theming

5. **Test theme persistence**
   - Verify localStorage saves preference
   - Verify system preference detection works
   - Verify no flash of wrong theme on load (SSR consideration)

---

## Phase 2: Shared Component Abstractions

**Priority: High**
**Complexity: Medium**

Reduce code duplication and improve maintainability.

### Tasks

#### 2.1 Create `useLocalStorage` Hook
- File: `lib/hooks/useLocalStorage.ts` (new)
- Generic hook for persisting state to localStorage
- Handles SSR (no window on server)
- JSON serialization/deserialization
- Replace manual localStorage usage in:
  - `AlertsPage.tsx` (threshold preferences)
  - `UsageLogsPage.tsx` (filter state)
  - `pages/index.tsx` (theme preference)

#### 2.2 Create `PageHeader` Component
- File: `components/ui/PageHeader.tsx` (new)
- Props: `title`, `description`, `action` (optional ReactNode)
- Standardize the header pattern used across all 6 page components
- Responsive layout (stack on mobile, row on desktop)

#### 2.3 Create `useFilters` Hook
- File: `lib/hooks/useFilters.ts` (new)
- Generic filtering logic with:
  - Search term matching
  - Multi-field filtering
  - Memoized filtered results
- Replace duplicated filter logic in:
  - `ApiKeysPage.tsx`
  - `AlertsPage.tsx`
  - `UsageLogsPage.tsx`

#### 2.4 Centralize Color Mappings
- File: `lib/styles.ts` (new)
- Define shared color schemes:
  - Alert type colors (success, warning, error, info)
  - Status colors (active, inactive, pending)
  - Model colors for charts
- Update components to import from central location:
  - `AlertsPage.tsx`
  - `ModelBreakdown.tsx`
  - `StatCard.tsx`
  - `TeamPage.tsx`
  - `DashboardPage.tsx`

#### 2.5 Create `DataTable` Component
- File: `components/ui/DataTable.tsx` (new)
- Reusable table with:
  - Sortable columns
  - Row actions
  - Empty state integration
  - Loading skeleton state
- Apply to:
  - API Keys list
  - Alerts list
  - Usage Logs list
  - Team members list

#### 2.6 Split `DashboardPage.tsx` (766 lines)
- Extract into smaller components:
  - `components/dashboard/DashboardHeader.tsx` - Title, time range, export/share
  - `components/dashboard/ShareDialog.tsx` - Share link creation UI
  - `components/dashboard/ExportDialog.tsx` - Export options UI
  - `components/dashboard/TimeRangeSelector.tsx` - Date range picker
  - `components/dashboard/UsageCharts.tsx` - Chart section
  - `components/dashboard/StatsGrid.tsx` - StatCard grid

---

## Phase 3: Persistent Storage for Share Links

**Priority: Medium**
**Complexity: Medium**

Currently uses file-based storage which works for single-instance but not for serverless/multi-instance.

### Option A: SQLite (Recommended for simplicity)

1. **Add dependencies**
   ```bash
   npm install better-sqlite3
   npm install -D @types/better-sqlite3
   ```

2. **Create database schema**
   - File: `lib/db/schema.sql` (new)
   ```sql
   CREATE TABLE share_links (
     id TEXT PRIMARY KEY,
     token TEXT UNIQUE NOT NULL,
     created_at INTEGER NOT NULL,
     expires_at INTEGER NOT NULL,
     password_protected INTEGER DEFAULT 0,
     access_count INTEGER DEFAULT 0,
     last_accessed_at INTEGER
   );
   ```

3. **Create database client**
   - File: `lib/db/index.ts` (new)
   - Initialize database on first use
   - Provide typed query methods

4. **Update share store**
   - File: `lib/shareStore.ts`
   - Replace file operations with SQLite queries
   - Add methods: `createShareLink`, `getShareLink`, `deleteShareLink`, `cleanupExpired`

5. **Add share link management UI**
   - Show active share links in settings/admin
   - Allow revoking share links
   - Show access statistics

### Option B: Vercel KV / Redis (For serverless)

1. **Add dependencies**
   ```bash
   npm install @vercel/kv
   ```

2. **Create KV client wrapper**
   - File: `lib/kv.ts` (new)
   - Environment-based configuration
   - Fallback to in-memory for local development

3. **Update share store**
   - Use Redis SETEX for automatic expiration
   - Store share metadata as JSON

---

## Phase 4: Enhanced Authentication

**Priority: Medium**
**Complexity: High**

Replace single-password auth with proper user accounts.

### Option A: NextAuth.js (Recommended)

1. **Add dependencies**
   ```bash
   npm install next-auth @auth/prisma-adapter
   npm install prisma @prisma/client
   ```

2. **Configure Prisma**
   - File: `prisma/schema.prisma` (new)
   ```prisma
   model User {
     id            String    @id @default(cuid())
     email         String    @unique
     name          String?
     password      String?   // For credentials provider
     role          String    @default("viewer")
     createdAt     DateTime  @default(now())
     sessions      Session[]
   }

   model Session {
     id           String   @id @default(cuid())
     sessionToken String   @unique
     userId       String
     expires      DateTime
     user         User     @relation(fields: [userId], references: [id])
   }
   ```

3. **Configure NextAuth**
   - File: `pages/api/auth/[...nextauth].ts` (new)
   - Providers:
     - Credentials (email/password)
     - Optional: Google, GitHub OAuth
   - Session strategy: JWT or database

4. **Create user management**
   - File: `pages/admin/users.tsx` (new)
   - CRUD operations for users
   - Role assignment (admin, editor, viewer)

5. **Update authorization logic**
   - File: `lib/auth.ts`
   - Replace `getSessionFromRequest` with NextAuth session
   - Add role-based access control (RBAC)
   - Update `readOnly` logic based on user role

6. **Update UI components**
   - `UserAccountDropdown.tsx`: Show actual user info
   - `Sidebar.tsx`: Show/hide nav items based on role
   - Add user profile page

7. **Migration path**
   - Keep `DASHBOARD_PASSWORD` as fallback during transition
   - Add setup wizard for first admin user

### Option B: Custom Auth with Database

If avoiding external dependencies:

1. **User table in SQLite**
   - Store hashed passwords (bcrypt)
   - Email verification tokens
   - Password reset tokens

2. **Session management**
   - Database-backed sessions
   - Sliding expiration
   - Device tracking

3. **Custom auth pages**
   - Login, Register, Forgot Password
   - Email verification flow

---

## Phase 5: Real API Integration

**Priority: High**
**Complexity: High**

Replace mock data with real Anthropic API usage data.

### Option A: Direct Anthropic API Integration

1. **Research Anthropic Admin API**
   - Investigate available endpoints for usage data
   - Required scopes/permissions
   - Rate limits and quotas

2. **Create API client**
   - File: `lib/anthropic/client.ts` (new)
   - Type-safe API wrapper
   - Error handling and retries
   - Response caching

3. **Map API responses to dashboard types**
   - File: `lib/anthropic/mappers.ts` (new)
   - Transform API data to `DashboardData` interface
   - Handle pagination for large datasets

4. **Update data source**
   - File: `lib/dataSource.ts`
   - Add Anthropic API as primary source
   - Fallback chain: Anthropic API → Custom URL → File → Mock

5. **Configuration**
   - Add `ANTHROPIC_ADMIN_API_KEY` env variable
   - Add `ANTHROPIC_ORG_ID` if required

### Option B: Webhook-Based Data Collection

If direct API not available:

1. **Create webhook endpoint**
   - File: `pages/api/webhook/usage.ts` (new)
   - Receive usage events from Anthropic
   - Validate webhook signatures
   - Store events in database

2. **Event storage**
   - SQLite table for usage events
   - Aggregation queries for dashboard metrics

3. **Background aggregation**
   - Scheduled job to compute daily/weekly/monthly stats
   - Cache aggregated data for fast dashboard loads

### Option C: Manual Data Import

For organizations that export usage data:

1. **CSV/JSON import**
   - File: `pages/api/import.ts` (new)
   - Parse uploaded files
   - Validate data format
   - Store in database

2. **Import UI**
   - File: `components/pages/ImportPage.tsx` (new)
   - File upload component
   - Preview before import
   - Import history/status

---

## Implementation Order

### Recommended sequence:

```
Week 1: Phase 1 (Dark Mode) + Phase 2.1-2.2 (Hooks + PageHeader)
        - Quick wins, immediate visual improvement
        - Foundation for other refactoring

Week 2: Phase 2.3-2.6 (Remaining Abstractions)
        - Complete component cleanup
        - Split DashboardPage

Week 3: Phase 3 (Persistent Storage)
        - Database setup
        - Share link migration

Week 4: Phase 4 (Authentication)
        - User accounts setup
        - Migration from single password

Week 5+: Phase 5 (API Integration)
        - Depends on Anthropic API availability
        - May require coordination with Anthropic
```

---

## File Changes Summary

### New Files
```
lib/ThemeContext.tsx
lib/hooks/useLocalStorage.ts
lib/hooks/useFilters.ts
lib/styles.ts
lib/db/index.ts
lib/db/schema.sql
lib/anthropic/client.ts
lib/anthropic/mappers.ts
components/ui/PageHeader.tsx
components/ui/DataTable.tsx
components/dashboard/DashboardHeader.tsx
components/dashboard/ShareDialog.tsx
components/dashboard/ExportDialog.tsx
components/dashboard/TimeRangeSelector.tsx
components/dashboard/UsageCharts.tsx
components/dashboard/StatsGrid.tsx
pages/api/auth/[...nextauth].ts
pages/admin/users.tsx
prisma/schema.prisma
```

### Modified Files
```
tailwind.config.js (dark mode config)
pages/index.tsx (theme context, dark class)
pages/_app.tsx (providers)
components/layout/Sidebar.tsx (dark mode styles)
components/pages/*.tsx (use new hooks/components)
lib/dataSource.ts (API integration)
lib/shareStore.ts (database storage)
lib/auth.ts (NextAuth integration)
```

---

## Environment Variables (Final)

```env
# Existing
AUTH_SECRET=
DASHBOARD_PASSWORD=           # Deprecated after Phase 4

# Phase 3: Database
DATABASE_URL=                 # SQLite or PostgreSQL connection

# Phase 4: NextAuth
NEXTAUTH_URL=
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=             # Optional
GOOGLE_CLIENT_SECRET=         # Optional

# Phase 5: Anthropic
ANTHROPIC_ADMIN_API_KEY=
ANTHROPIC_ORG_ID=
```

---

## Success Metrics

1. **Dark Mode**: Toggle works, persists, no flash on load
2. **Shared Components**: DashboardPage < 300 lines, no duplicated patterns
3. **Persistent Storage**: Share links survive server restarts
4. **Authentication**: Multiple users with different roles
5. **API Integration**: Real usage data displayed, auto-refreshes

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Anthropic API not available | Build flexible data source with fallbacks |
| Database migration complexity | Start with SQLite, upgrade later |
| Breaking existing share links | Migrate existing file data to DB |
| Auth migration disrupts users | Gradual rollout with password fallback |
| Dark mode affects chart readability | Test all chart colors in both themes |

---

## Questions to Resolve

1. Is there an Anthropic Admin API for usage data?
2. Should we support OAuth providers (Google, GitHub)?
3. What user roles are needed (admin, editor, viewer)?
4. Should share links have usage limits in addition to expiration?
5. Database preference: SQLite (simple) vs PostgreSQL (scalable)?

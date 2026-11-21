# Add Non-Teaching Staff Role Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new "Staff" user role (`non_teaching_staff`) with full student parity — same UI, same permissions, self-registration enabled, distinguishable by role label only.

**Architecture:** Add the role to the backend UserRole enum, frontend types, auth store computed properties, NavBar navigation, router guards, and registration DTO. The role mirrors `STUDENT` in all access patterns.

**Tech Stack:** NestJS/TypeORM backend, Vue 3/Pinia frontend, TypeScript throughout.

**Spec:** Derived from user conversation — Approach A (Full Student Parity), self-registration enabled, display label "Staff", no future differentiation planned.

## Global Constraints

- Backend enum values use snake_case: `non_teaching_staff`
- Frontend role type union must match backend exactly
- Display label "Staff" used in UI (profile, ID card, user management)
- Self-registration allowed via `/auth/register`
- No new routes or components — reuses student routes/views entirely
- Role treated identically to `student` in all authorization checks

## Review Focus

| Input / Condition | Expected Behavior |
|-------------------|-------------------|
| Staff user registers via `/auth/register` | Account created with role `non_teaching_staff`, same flow as student |
| Staff user logs in | Gets standard nav (OPAC, Profile), no dashboard access |
| Staff user accesses `/profile` | Sees StudentProfileView with "Staff" role label on ID card |
| Staff user accesses `/opac` | Full catalog access, can borrow/reserve books |
| Admin creates Staff user via `/users` | Works with `role: non_teaching_staff` in payload |

---

### Task 1: Backend - Add Role to UserRole Enum

**Files:**
- Modify: `backend/src/users/entities/user.entity.ts:18-25`

**Interfaces:**
- Produces: `UserRole.NON_TEACHING_STAFF = 'non_teaching_staff'` available to all consumers

- [ ] **Step 1: Add enum value**

```typescript
export enum UserRole {
  STUDENT = 'student',
  FACULTY = 'faculty',
  LIBRARIAN = 'librarian',
  CHIEF_LIBRARIAN = 'chief_librarian',
  ADMIN = 'admin',
  KIOSK = 'kiosk',
  NON_TEACHING_STAFF = 'non_teaching_staff',  // NEW
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd backend && npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add backend/src/users/entities/user.entity.ts
git commit -m "feat: add non_teaching_staff to UserRole enum"
```

---

### Task 2: Backend - Allow Self-Registration for Staff

**Files:**
- Modify: `backend/src/auth/dto/register.dto.ts:36-37`

**Interfaces:**
- Consumes: `UserRole.NON_TEACHING_STAFF` from Task 1
- Produces: RegisterDto accepts `non_teaching_staff` role

- [ ] **Step 1: Update @IsIn validator**

```typescript
@IsIn([UserRole.STUDENT, UserRole.FACULTY, UserRole.LIBRARIAN, UserRole.NON_TEACHING_STAFF])
role: UserRole.STUDENT | UserRole.FACULTY | UserRole.LIBRARIAN | UserRole.NON_TEACHING_STAFF;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd backend && npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add backend/src/auth/dto/register.dto.ts
git commit -m "feat: allow non_teaching_staff self-registration"
```

---

### Task 3: Frontend - Add Role to User Type and Auth Store

**Files:**
- Modify: `frontend/src/stores/useLibraryStore.ts:11, 130-135`

**Interfaces:**
- Consumes: `UserRole.NON_TEACHING_STAFF` (backend sync)
- Produces: Updated `User` interface, `isStaff` computed, updated `standardNavItems` logic

- [ ] **Step 1: Update User interface role union**

```typescript
role: 'student' | 'faculty' | 'librarian' | 'chief_librarian' | 'admin' | 'kiosk' | 'non_teaching_staff'
```

- [ ] **Step 2: Add isStaff computed property**

```typescript
const isStaff = computed(() => user.value?.role === 'non_teaching_staff')
```

- [ ] **Step 3: Update return object to export isStaff**

```typescript
return { ..., isStaff }
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd frontend && npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/stores/useLibraryStore.ts
git commit -m "feat: add non_teaching_staff to User type and auth store"
```

---

### Task 4: Frontend - Update RegisterPayload for Staff Registration

**Files:**
- Modify: `frontend/src/stores/useLibraryStore.ts:114-115`

**Interfaces:**
- Produces: RegisterPayload accepts `non_teaching_staff` role

- [ ] **Step 1: Update RegisterPayload role union**

```typescript
role: 'student' | 'faculty' | 'librarian' | 'non_teaching_staff'
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/stores/useLibraryStore.ts
git commit -m "feat: allow non_teaching_staff in RegisterPayload"
```

---

### Task 5: Frontend - Update NavBar for Staff Navigation

**Files:**
- Modify: `frontend/src/components/NavBar.vue:69-72`

**Interfaces:**
- Consumes: `isStaff` from Task 3 (via auth store)

- [ ] **Step 1: Add 'non_teaching_staff' to standardNavItems roles**

```typescript
const standardNavItems = computed(() => [
  { to: '/opac', name: 'Opac', label: 'View opac', icon: BookOpenIcon, roles: ['student', 'faculty', 'guest', 'non_teaching_staff'] },
  { to: '/profile', name: 'Profile', label: 'Profile', icon: UserCircleIcon, roles: ['student', 'faculty', 'guest', 'non_teaching_staff'] },
  { to: '/dashboard/faculty-requests', name: 'FacultyRequests', label: 'My Requests', icon: DocumentTextIcon, roles: ['faculty'] },
])
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/NavBar.vue
git commit -m "feat: add non_teaching_staff to standard navigation"
```

---

### Task 6: Frontend - Update Router Guards for Staff Access

**Files:**
- Modify: `frontend/src/router/index.ts:46-50, 52-56`

**Interfaces:**
- Consumes: None new (uses existing auth store)

- [ ] **Step 1: Allow non_teaching_staff on Profile route (already works via requiresAuth only)**

No change needed — Profile route only has `requiresAuth: true`

- [ ] **Step 2: Verify Opac route has no role restriction**

No change needed — Opac route has no role meta

- [ ] **Step 3: Commit (no changes needed, but verify)**

```bash
git commit --allow-empty -m "verify: staff access works via existing auth-only routes"
```

---

### Task 7: Frontend - Display "Staff" Label in UI

**Files:**
- Modify: `frontend/src/views/StudentProfileView.vue:329-331`

**Interfaces:**
- Consumes: `user.role` from auth store

- [ ] **Step 1: Update ID card role display to show "Staff" for non_teaching_staff**

```vue
<p class="text-[13px] font-bold text-[#b91c1c] uppercase tracking-[0.1em]" style="min-width: 120px;">
  {{ user.role === 'non_teaching_staff' ? 'STAFF' : (user.role || 'STUDENT').toUpperCase() }}
</p>
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/StudentProfileView.vue
git commit -m "feat: display 'Staff' label on ID card for non_teaching_staff"
```

---

### Task 8: End-to-End Verification

**Files:**
- Test: Manual verification via running app

**Interfaces:**
- Consumes: All previous tasks

- [ ] **Step 1: Start backend**

Run: `cd backend && npm run start:dev`

- [ ] **Step 2: Start frontend**

Run: `cd frontend && npm run dev`

- [ ] **Step 3: Register as Staff**

Navigate to `/signup`, select "Staff" role, complete registration

- [ ] **Step 4: Verify login and navigation**

Login → See OPAC and Profile in sidebar, no Dashboard

- [ ] **Step 5: Verify Profile page**

Navigate to `/profile` → See "STAFF" on ID card

- [ ] **Step 6: Verify OPAC access**

Navigate to `/opac` → Can browse, borrow, reserve

- [ ] **Step 7: Commit final verification**

```bash
git commit --allow-empty -m "verify: non_teaching_staff role fully functional"
```
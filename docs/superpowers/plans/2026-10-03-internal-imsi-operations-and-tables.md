# IMSI nội bộ cho đầu vào và bảng — Implementation Plan

> **For agentic workers:** Use inline execution in this session. Each task updates only the agreed input/search/sort surfaces.

**Goal:** Use the 10-digit internal IMSI for group and bulk-action inputs, and expose a searchable/sortable internal IMSI column in every IMSI table that does not already have one.

**Architecture:** Keep source IMSI storage, display, search, and sort unchanged. Resolve user-provided IMSI identifiers against `internalImsi` in backend services; add internal-Imsi filters and sort keys only to tables that need them. The SIM management table already has the internal column and remains as-is.

**Tech Stack:** React, TypeScript, Ant Design, NestJS, Prisma, PostgreSQL.

**Spec:** User request in this conversation (2026-10-03).

## Global Constraints

- Internal IMSI is the last 10 digits of source IMSI and is treated as unique.
- Group CSV and all six bulk actions accept phone number or internal IMSI.
- Preserve source IMSI display, search, and sort behavior.
- Add an internal IMSI column only where the table does not already have one.
- Do not change source IMSI ingestion or data storage.

## Review Focus

- Group CSV resolves by internal IMSI while preserving phone-number support.
- All six bulk actions match internal IMSI exactly and preserve phone-number behavior.
- Master SIM list supports internal-Imsi search and server-side sort.
- Group member table supports internal-Imsi search and server-side sort.
- Triggered-alert table supports internal-Imsi search and local sort.
- SIM management already has the column and must not receive a duplicate.
- Source IMSI behavior and upstream synchronization remain unchanged.

---

### Task 1: Backend identifier resolution

**Files:**
- Modify `vinaphone-m2m-api-gateway/src/groups/groups.service.ts`
- Modify `vinaphone-m2m-api-gateway/src/groups/dto/create-group.dto.ts`
- Modify `vinaphone-m2m-api-gateway/src/groups/dto/update-group.dto.ts`
- Modify `vinaphone-m2m-api-gateway/src/sims/sims.service.ts`
- Modify `vinaphone-m2m-api-gateway/src/sims/dto/update-sim-status.dto.ts`
- Modify `vinaphone-m2m-api-gateway/src/sims/sims.controller.ts`

- [ ] Group identifier query/map uses `internalImsi` instead of source `imsi`, preserving phone lookup.
- [ ] Bulk matcher uses exact `internalImsi` equality instead of source-IMSI suffix matching, preserving phone lookup.
- [ ] Update endpoint/API descriptions to say internal IMSI.

### Task 2: Frontend group and bulk-action inputs

**Files:**
- Modify `vinaphone-dashboard/src/components/Group/GroupDrawer.tsx`
- Modify `vinaphone-dashboard/src/api/groups.api.ts`
- Modify `vinaphone-dashboard/src/components/BulkSimActionsModal/index.tsx`
- Modify `vinaphone-dashboard/src/api/sims.api.ts`
- Modify `vinaphone-dashboard/src/hooks/useSims.ts`

- [ ] Group CSV lookup uses `sim.internalImsi`, and its hint identifies internal IMSI.
- [ ] Bulk CSV/manual-action copy identifies internal IMSI; payload shape remains unchanged.

### Task 3: Master SIM table

**Files:**
- Modify `vinaphone-dashboard/src/pages/MasterSims.tsx`
- Modify `vinaphone-dashboard/src/types/index.ts`
- Modify `vinaphone-m2m-api-gateway/src/master-sims/master-sims.service.ts`
- Modify `vinaphone-m2m-api-gateway/src/master-sims/dto/query-master-sim.dto.ts`

- [ ] Add an `internalImsi` column with server-side sort.
- [ ] Global search includes internal IMSI while source IMSI search remains unchanged.
- [ ] Backend sort whitelist includes `internalImsi`.

### Task 4: Group member table

**Files:**
- Modify `vinaphone-dashboard/src/components/SIM/SimGroupMembersTable.tsx`
- Modify `vinaphone-dashboard/src/types/index.ts`
- Modify `vinaphone-m2m-api-gateway/src/sims/dto/query-group-members.dto.ts`
- Modify `vinaphone-m2m-api-gateway/src/sims/sims.service.ts`

- [ ] Add an `internalImsi` column with server-side sort.
- [ ] Existing search input also searches internal IMSI and continues to search phone numbers.

### Task 5: Triggered alert table

**Files:**
- Modify `vinaphone-dashboard/src/pages/AlertManagement.tsx`

- [ ] Add an `internalImsi` column with local sort and a filter input.
- [ ] Leave the source IMSI column behavior unchanged.

### Task 6: Review changed files

- [ ] Inspect the final diff for scope, type consistency, and preservation of source IMSI behavior.
- [ ] Do not run or add tests unless the user requests verification.


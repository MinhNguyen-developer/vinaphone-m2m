# SIM picker loading and multiple code filters

**Goal:** Resolve the reported SIM lookup failures and let SimManagement filter several SIM codes together.

**Evidence:** The customer video shows existing SIMs on SimManagement but an empty transfer list in the code drawer. Both drawers silently default failed queries to an empty list. Manual lookup also checks only phone numbers, unlike group CSV lookup. The video does not establish the HTTP failure behind the empty list.

**Design:** Keep the existing transfer UI and `/sims/all` route. Add optional bounded pagination to that route, preserve its legacy array response without pagination, and load all pages before enabling membership editing. Surface failed queries with retry and block saving incomplete membership. Use one exact phone/internal-IMSI lookup for CSV and manual input. Reuse the existing group filter pattern for multiple SIM codes, synchronized with the URL and sent as repeated query parameters.

**Constraints:** Preserve tenant scoping, existing memberships, leading zeroes, phone-number lookup, and old single-code links. No database migration or new dependency.

- [x] Add failing regression tests for paged loading, identifier lookup, query validation, and multiple-code matching.
- [x] Implement paged loading and loading/error guards in both drawers.
- [x] Consolidate manual/CSV identifier lookup and preserve unmatched manual input.
- [x] Enable multiple-code selection, URL persistence, and server filtering with `in`.
- [x] Verify builds, relevant tests, and browser interactions with local fixtures.

**Verification:** Both production builds passed. All 55 backend tests and 6 frontend tests passed. Chromium checks with 501 fixture SIMs passed for manual group/code entry, code CSV upload, failed-load guards and retry, old single-code links, repeated multi-code API parameters, and filter persistence after refresh. An independent review found no actionable issue. Existing lint errors remain; the changes add none.

**Deployment:** Release the API changes before or with the dashboard. A dashboard connected to the old API still accepts its array response, but the bounded-loading improvement requires the API update. Production HTTP logs are needed to establish the original empty-list failure conclusively.

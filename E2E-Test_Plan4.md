# E2E Test Plan 4.0: Mobile & Advanced Operations

This test plan addresses the remaining verified scope for production readiness, focusing on Mobile Workflows, Warehouse Capacity logic, and Live Integrations.

## Phase 7: Mobile Workflows (PWA)
**Persona**: Floor Operator (Mobile User)

- [x] **Scenario 7.1: Mobile Dashboard Access**
    - **Action**: Navigate to `/mobile/dashboard` (simulate mobile viewport).
    - **Expected**: specialized Mobile Dashboard loads with "Quick Actions" (Scan, Pick, Putaway).
    - **Verify**: Layout is responsive and touch-friendly. (Verified: Dashboard loads with Scan/Pick/Putaway cards)

- [x] **Scenario 7.2: Mobile Quick Scan (Lookup)**
    - **Action**: Navigate to `/mobile/scan`.
    - **Action**: Enter/Scan a Location Code (e.g., "LOC-001" or the ID of "Bin 01").
    - **Expected**: Location Details page loads showing available stock. (Verified: "Bin 01" scan redirects to details)

- [x] **Scenario 7.3: Mobile Picking Execution**
    - **Pre-condition**: An order in `ALLOCATED` or `PICKING` state.
    - **Action**: Open Picking Task on mobile.
    - **Action**: Scan Location -> Scan Product -> Enter Qty -> Confirm.
    - **Expected**: Task marks as `PICKED`. UI advances to next task or completion screen. (Verified: Flow completed with generic product via Browser)

## Phase 8: Advanced Putaway & Capacity
**Persona**: Warehouse Manager

- [x] **Scenario 8.1: Define Location Capacity**
    - **Action**: Edit "Bin 01". Set `maxWeight: 10kg` or `maxVolume: 0.1m3`.
    - **Action**: Ensure Product "Pro Laptop X" has dimensions/weight defined.
    - **Expected**: Attributes persisted. (Verified: Weight set to 10kg via API)

- [x] **Scenario 8.2: Verify Putaway Blocking (Capacity Exceeded)**
    - **Action**: Attempt to receive/putaway a quantity that exceeds "Bin 01" capacity.
    - **Example**: Bin Capacity 10 units. Current 5. Try to putaway 6.
    - **Expected**: Logic blocks "Bin 01" as a candidate. System suggests alternative location or "General Storage".
    - **Result**: System returns 400 Bad Request with "Capacity Limit Reached" message when capacity exceeded. Blocking confirmed.

## Phase 9: Live Carrier Integration (Lalamove)
**Persona**: Shipping Manager

- [ ] **Scenario 9.1: Configure Live Credentials**
    - **Action**: Configure `LALAMOVE_API_KEY_SG` (Sandbox) in `.env` (or mock server if live not possible).
    - **Action**: Update Warehouse Settings to Market: `SG`.
    - **Expected**: Settings saved.

- [ ] **Scenario 9.2: Real-time Quotation**
    - **Action**: Create Order. Click "Ship". Select "Lalamove".
    - **Action**: Click "Get Quote".
    - **Expected**: Real price returned from Lalamove Sandbox API (not static mock).
    - **Note**: Requires valid Lat/Long on Warehouse and Customer Address.

## Phase 10: Regression Hardening
- [ ] **Scenario 10.1: Automated Picking Loop**
    - **Goal**: Hardening the "Execute Picking" flow that was previously flaky.
    - **Action**: Scripted E2E: Order -> Allocate -> Pick -> Ship.
    - **Expected**: 100% success rate without manual intervention.

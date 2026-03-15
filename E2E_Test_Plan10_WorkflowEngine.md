# E2E Test Plan 10.0: Dynamic Routing & Workflow Engine

This test plan is specifically focused on verifying the newly implemented **Dynamic Routing & Multi-Step Workflow Engine**. It covers everything from template creation in the builder to dynamic task generation, conditions, and analytics.

**Date**: 2026-03-07
**Prerequisites**: Dev servers running on ports 3000 (web) and 3001 (api)

---

## Traceability Matrix: Feature → E2E Coverage

| # | Feature component | E2E Scenario(s) | Expected Impact |
|---|---|---|---|
| 1 | Workflow Template CRUD | 1.1–1.5 (Create, View, Version, Clone, Delete) | Ensure templates can be defined and managed effectively |
| 2 | Visual Builder Canvas | 2.1–2.4 (Drag & Drop, Connections, Config) | Validates frontend UX & logic for designing graphs |
| 3 | Graph Validation | 2.5 (Validate dead ends, missing triggers) | Prevents invalid broken workflows from activating |
| 4 | Execution Engine: Basic | 3.1–3.3 (Start, Complete Task, Finish) | Proves core state machine transition logic works |
| 5 | Execution Engine: Complex | 4.1–4.3 (Conditions, Cross-Dock logic) | Proves `ConditionHandler` and dynamic routing paths |
| 6 | Execution Engine: Admin | 5.1–5.3 (Pause, Resume, Override) | Proves manager controls over active instances |
| 7 | Dashboard & Monitoring | 6.1–6.2 (Monitor display, Activity Logs) | Proves real-time progress visibility for ongoing work |
| 8 | Telemetry & Analytics | 7.1–7.2 (Throughput metrics, Graphing) | Validates completion metrics are aggregated correctly |

---

## Phase 1: Workflow Template Management
**Persona**: Administrator / System Architect

- [ ] **Scenario 1.1: Access Workflows List**
    - **Action**: Navigate to `http://localhost:3000/workflows`.
    - **Expected**: Workflow Template table loads successfully with default/empty state. No 500 errors.

- [ ] **Scenario 1.2: Create New Template**
    - **Action**: Click "New Workflow". Name: "Standard Inbound", Trigger: `PO_RECEIPT`.
    - **Expected**: Directed to `/workflows/:id/builder`. Template is created in `DRAFT` status with Version 1.

- [ ] **Scenario 1.3: Create New Version**
    - **Action**: On an existing workflow template, click "Save as New Version".
    - **Expected**: 2 versions of the same template name now exist. Original is preserved, new one is v2.

- [ ] **Scenario 1.4: Clone Template**
    - **Action**: On an existing workflow template row in the list view, click "Clone".
    - **Expected**: A new template is created with `(Copy)` appended to the name, completely detached from the original version history.

- [ ] **Scenario 1.5: Delete/Archive Template**
    - **Action**: Delete a `DRAFT` template.
    - **Expected**: Template is removed from the active list (or status changes to `ARCHIVED`).

---

## Phase 2: Visual Builder & Graph Validation
**Persona**: Administrator / System Architect

- [ ] **Scenario 2.1: Add Steps to Canvas**
    - **Action**: Inside the builder for "Standard Inbound", drag the following components from the Library to the Canvas: `RECEIVE`, `QC_INSPECT`, `PUTAWAY`.
    - **Expected**: Node elements appear on the grid layout, with draggable behavior.

- [ ] **Scenario 2.2: Configure Step Details**
    - **Action**: Click the `QC_INSPECT` node. In the right-side Properties panel, toggle "Requires Supervisor Approval" checkbox to true.
    - **Expected**: Step configuration saves into the JSON config schema for that specific step.

- [ ] **Scenario 2.3: Connect Nodes (Transitions)**
    - **Action**: Draw edges connecting: `RECEIVE` → `QC_INSPECT` → `PUTAWAY`.
    - **Expected**: Directed edges render on canvas and transition rules are successfully saved to the backend.

- [ ] **Scenario 2.4: Validate Invalid Graph (Missing End)**
    - **Action**: Only connect `START` → `RECEIVE` with no subsequent steps. Click "Validate".
    - **Expected**: Validation API catches the error and returns user-friendly warning: "All branches must terminate in an END state".

- [ ] **Scenario 2.5: Publish Valid Graph**
    - **Action**: Ensure the full `RECEIVE` → `QC` → `PUTAWAY` flow connects to an `END` node. Click "Validate". Click "Publish/Activate".
    - **Expected**: Validation succeeds. Template status switches to `ACTIVE` and is now ready to receive execution triggers.

---

## Phase 3: Basic Execution Lifecycle & Handlers
**Persona**: Warehouse Worker

- [ ] **Scenario 3.1: Trigger Workflow Start (Receive)**
    - **Action**: Via API or completing a standard Purchase Order Receive action, trigger the "Standard Inbound" workflow template ID.
    - **Expected**: `WorkflowInstance` is created in DB. Instance status is `RUNNING`. A `WorkflowTaskInstance` for the `RECEIVE` step is created as `IN_PROGRESS` or `PENDING`.

- [ ] **Scenario 3.2: Complete Task and Advance**
    - **Action**: Use API to mark the `RECEIVE` task as `COMPLETED`.
    - **Expected**: Transition logic automatically triggers. The instance current stage moves to `QC_INSPECT`. A new `WorkflowTaskInstance` for QC is assigned.

- [ ] **Scenario 3.3: Complete Workflow**
    - **Action**: Finish the `QC_INSPECT` and `PUTAWAY` tasks sequentially.
    - **Expected**: The instance transitions to the `END` node. Instance status becomes `COMPLETED`. Completed timestamp is recorded.

---

## Phase 4: Conditional Logic & Cross-Dock Routing
**Persona**: System automatically routing dynamically

- [ ] **Scenario 4.1: Build Conditional Routing Graph**
    - **Action**: Create "Priority Inbound". `RECEIVE` → `CONDITION`.
        - Condition Path A (Urgent): `CROSS_DOCK` → `SHIP`.
        - Condition Path B (Normal): `PUTAWAY`.
    - **Expected**: Builder allows configuring the `CONDITION` node with custom JSON logic rules (e.g., `triggerContext.isUrgent == true`).

- [ ] **Scenario 4.2: Execute Path A (Cross-Dock Bypass)**
    - **Action**: Trigger the workflow with context payload `{ isUrgent: true }`. Complete `RECEIVE`.
    - **Expected**: The engine evaluates the condition, skips Putaway, and dynamically creates a `CROSS_DOCK` task immediately moving it to the shipping queue.

- [ ] **Scenario 4.3: Execute Path B (Standard Storage)**
    - **Action**: Trigger the workflow with context payload `{ isUrgent: false }`. Complete `RECEIVE`.
    - **Expected**: Engine evaluates condition and assigns a standard `PUTAWAY` task.

---

## Phase 5: Supervisor Incident Management
**Persona**: Warehouse Shift Supervisor

- [ ] **Scenario 5.1: Pause Active Incident**
    - **Action**: With a workflow instance currently mid-execution (e.g., sitting at Putaway step), navigate to the `/workflows/monitor` page. Click the instance and select "Pause".
    - **Expected**: Instance status becomes `PAUSED`. Task progression is halted.

- [ ] **Scenario 5.2: Resume Incident**
    - **Action**: Select the paused instance and click "Resume".
    - **Expected**: Status reverts to `RUNNING`. Processing can continue normally.

- [ ] **Scenario 5.3: Override / Force Step Advance**
    - **Action**: Take an active workflow on `QC_INSPECT`. Click "Supervisor Override". Select target step: `PUTAWAY`. Enter reason: "Skip QC authorized by management".
    - **Expected**: The QC task is aborted/skipped. The instance forcibly jumps to the Putaway stage. Audit Log creates a detailed `ACTION_OVERRIDE` entry.

---

## Phase 6: Monitoring Dashboard
**Persona**: Operations Manager

- [ ] **Scenario 6.1: Active Instances View**
    - **Action**: Navigate to `http://localhost:3000/workflows/monitor`.
    - **Expected**: Data grid displays all `RUNNING` or `PAUSED` workflow instances with their current Step Name, Progress Bar, and Elapsed Time.

- [ ] **Scenario 6.2: Instance Drill-Down & Visual Trace**
    - **Action**: Click on a distinct active workflow instance in the monitor list.
    - **Expected**: Loads a graphical view of the template with the *currently active step* highlighted (e.g., glowing green outline) and past steps marked completed.

---

## Phase 7: Telemetry & Analytics
**Persona**: Operations Manager / Data Analyst

- [ ] **Scenario 7.1: View Workflow Throughput**
    - **Action**: Navigate to `http://localhost:3000/workflows/analytics`.
    - **Expected**: Dashboard charts render showing total executions by template type (Standard vs Priority), completion success rates, and volume over the last 7 days.

- [ ] **Scenario 7.2: Step Processing Bottleneck Time**
    - **Action**: View the Average Step Duration chart in analytics.
    - **Expected**: The chart accurately reflects aggregate wait time + processing time parsed from `WorkflowTaskInstance` timestamps, helping identify which step (e.g., QC vs Putaway) is the slowest.

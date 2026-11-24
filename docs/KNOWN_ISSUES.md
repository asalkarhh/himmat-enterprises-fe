# Known Issues & Architectural Boundaries — Himmat Enterprises Frontend

This document outlines recognized architectural constraints, intentional design trade-offs, and boundary decisions for **Himmat Enterprises Frontend (FE01–FE08)**.

---

## 1. Intentional Architectural Boundaries

### 1.1 In-Memory Session Token Storage
* **Constraint**: On hard browser refresh (`F5` / `Cmd+R`), the user's active session is cleared and the application redirects to `/login`.
* **Rationale**: Required by project security invariants. Access tokens are kept strictly in-memory (`authStore.ts`) to prevent XSS exfiltration from `localStorage` or `sessionStorage`. For a single-location counter POS and backoffice ERP, in-memory tokens ensure safe credential boundaries on shared store computers.

### 1.2 No Client-Side Excel / CSV Direct Bulk Importer
* **Constraint**: The catalog, opening stock, and supplier price lists do not have an in-app file dropzone for uploading arbitrary Excel files.
* **Rationale**: The client's initial master workbook and batch imports are verified and processed exclusively by backend migration scripts. In-app inventory counts are established via initial manual stock adjustments (FE04) or inward purchases (FE05).

### 1.3 Immutable Non-Negative Inventory
* **Constraint**: No cashier or store manager (nor Owner) can force-sell a product variant when its on-hand inventory count is 0.
* **Rationale**: Enforces physical physical-reality inventory tracking. If a physical item exists on the shelf but is 0 in the system, an inward purchase or initial stock adjustment must be recorded first.

### 1.4 Profit Margins Based on Purchase Cost Snapshots
* **Constraint**: Profit reports omit variant sales from COGS if the variant was sold before any inward purchase cost was ever recorded.
* **Rationale**: The system never guesses or assumes ₹0.00 purchase costs for missing inward entries. Doing so would artificially inflate gross margin to 100%. The frontend displays a dedicated "Excluded Sales (Unrecorded Inward Cost)" card and cost coverage percentage to preserve accounting integrity.

### 1.5 Cash Movements Qualification
* **Constraint**: Cash Movements Report does not constitute a bank reconciliation statement.
* **Rationale**: The report tracks recorded transactions (receipts, supplier payments, refunds, expenses) logged into the POS and ERP. It is designated as "Recorded Money Movements" to distinguish it from external bank account statements.

---

## 2. Browser & Environment Nuances

### 2.1 PDF Downloads on Certain Mobile Browsers
* When downloading invoices, receipts, or ledger statements on iOS Safari or mobile Chrome, pop-up blockers or sandboxed iframes may prevent direct file downloads via synthetic `<a download>` anchors.
* **Mitigation**: The app uses `window.URL.createObjectURL(blob)` with cleanup revocation (`revokeObjectURL`). For mobile counter use, a dedicated desktop terminal or tablet with pop-ups allowed is recommended.

### 2.2 Date Formatting in Localized En-IN Context
* Dates are consistently formatted in business standard `DD/MM/YYYY` (`formatBusinessDate`). In rare cases where browser locale overrides default date inputs, HTML5 `<input type="date">` displays native platform pickers while serializing to standard `YYYY-MM-DD` strings for backend API requests.

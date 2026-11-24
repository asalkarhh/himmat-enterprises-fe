# Frontend Acceptance Checklist — Himmat Enterprises

This checklist details the frontend verification for **Himmat Enterprises ERP / POS Portal** covering **FE01 through FE08**. All items have been implemented against actual backend API contracts and validated with automated test suites and production build checks.

---

## 1. Authentication & Security (FE01)
- [x] **In-Memory JWT Storage**: Bearer access token is strictly stored in memory and never persisted to `localStorage`, `sessionStorage`, or cookies.
- [x] **Role-Based Guards**: Two roles supported (`OWNER` and `MANAGER`). Administrative user management and profit reports are restricted to `OWNER`.
- [x] **Safe Logout & Token Invalidation**: Clears in-memory token, query cache, and redirects to login on explicit logout or password change.
- [x] **Session Recovery**: Protected routes redirect unauthenticated users to `/login?redirect=...`.
- [x] **403 Forbidden State**: Displays access restricted screen without crashing or terminating user session.

---

## 2. Catalog Hierarchy & Pricing Engine (FE02)
- [x] **Entity Hierarchy**: Brands $\rightarrow$ Categories $\rightarrow$ Subcategories $\rightarrow$ Products $\rightarrow$ Product Variants / SKUs.
- [x] **Pricing Methods**:
  - `MRP_DISCOUNT`: Billed at MRP minus category sales discount (or line discount override).
  - `COST_PLUS`: Billed at Purchase Cost $\times (1 + \text{Margin}\%) \times (1 + \text{GST}\%)$. Category discount does not apply.
  - `FIXED`: Fixed price inclusive of GST. Prohibits any discount.
- [x] **No Opening Stock on Creation**: Product variant creation initializes balance to 0. Stock is brought in exclusively via Purchases (FE05) or Initial Adjustment (FE04).
- [x] **Pricing Preview Simulator**: Standalone interactive simulator testing pricing methods, GST rates, and margin outputs.

---

## 3. Customer & Supplier Master Management (FE03)
- [x] **Customer Master**: Customer types (`RETAIL`, `CONTRACTOR`, `BUILDER`), GSTIN validation, phone search.
- [x] **Customer Multi-Sites**: Supports multiple delivery/job sites per customer, linked during sales billing.
- [x] **Supplier Master**: Supplier contact details, GSTIN, and account tracking.
- [x] **Reusable Selectors**: Async debounced `CustomerSelector`, `CustomerSiteSelector`, and `SupplierSelector`.

---

## 4. Inventory Balances & Movements (FE04)
- [x] **Single-Location Tracking**: Whole integer pieces only; no fractional quantities.
- [x] **Strict Non-Negative Stock Invariant**: Enforced for all roles including Owner.
- [x] **Audit Trail**: Every movement logs immutable reference type, transaction ID, before/after quantity, and user.
- [x] **Multi-Line Manual Stock Adjustments**: Supports opening stock take, shrinkage, damage, and count corrections with optimistic locking (`expectedVersion`).

---

## 5. Purchases & Goods Inward (FE05)
- [x] **Inward Purchase Entry**: Multi-line entry with entered unit price (GST-inclusive or exclusive basis), line discounts, and GST rates.
- [x] **Automatic Inventory Reception**: Posting an inward bill atomically increments variant stock balances.
- [x] **Supplier Settlements**: Records supplier payments and debit note refund collections with CASH and ONLINE split.
- [x] **Purchase Returns (Debit Notes)**: Reduces stock and credits supplier balance.
- [x] **Supplier Account & Ledger**: Reconciles purchases, returns, payments, and open balances.

---

## 6. Immediate Counter Invoicing & Receipts (FE06)
- [x] **Immediate POS Billing**: Direct bill creation without prerequisite sales orders.
- [x] **Credit Allocation & Receipts**: Allows payment at checkout or on account; records customer receipts with multi-tender splits.
- [x] **30-Day Dues Aging**: Tracks receivables with overdue filtering ($>30$ days from invoice date).
- [x] **Customer Ledger Statement**: Running balance statement of invoices, receipts, and returns.

---

## 7. Versioned Invoice Corrections, Returns & Refunds (FE07)
- [x] **No Arbitrary Age Limit**: Corrections and returns allowed anytime for legitimate business auditing.
- [x] **Immutable Invoice Identity**: Bill number and original invoice date are strictly preserved across corrections.
- [x] **Versioned Revisions**:
  - Full revision history with delta financial impact.
  - Line-by-line diff view (original vs modified quantity/rate).
  - Stock auto-adjusts for quantity changes.
- [x] **Customer Returns (Credit Notes)**: Restores inventory to stock, issues credit note, and updates customer balance.
- [x] **Customer Refunds**: Disburses refunds against unallocated credit notes or advances with CASH/ONLINE split.

---

## 8. Operational Expenses, Business Reports & PDF Downloads (FE08)
- [x] **Operating Expenses**:
  - 10 standardized categories (`RENT`, `UTILITIES`, `SALARY`, `TRANSPORT`, `MAINTENANCE`, `OFFICE_SUPPLIES`, `TAX_AND_GOVERNMENT`, `BANK_CHARGES`, `MARKETING`, `MISCELLANEOUS`).
  - Multi-tender split (`PaymentComponentsInput` for CASH/ONLINE).
  - Bookkeeping reversals via `POST /api/v1/expenses/{id}/reversals` with `expectedVersion` and mandatory reason.
- [x] **Sales Report**:
  - `ACTIVITY` basis (events on transaction date) vs `DOCUMENT` basis (retrospective mapped to original invoice date).
  - Gross sales, revisions delta, returns credit, net sales, and GST tax components.
  - Unknown tax rate disclosure alert.
- [x] **Purchase Report**:
  - Inward purchases, debit notes, net purchases, and distinct supplier cashflows.
- [x] **Inventory Report**:
  - Current pieces on hand, reorder alerts, and stock valuation calculated strictly at purchase cost excluding tax.
  - Quick filters for zero-stock and low-stock items.
- [x] **Cash Movements Report**:
  - Recorded cash and online inflows/outflows logged across POS, inward bills, and expenses.
- [x] **Owner Profit & Margins Report**:
  - Gated strictly to `OWNER` credentials (`REPORT:PROFIT`). Non-owners cannot see or trigger profit queries.
  - Derived from immutable purchase cost snapshots at transaction time.
  - Displays Known Net Revenue, Known COGS, Gross Profit, Gross Margin %, Operating Expenses, Estimated Net Profit.
  - Discloses purchase cost coverage % and flags excluded sales with unrecorded inward costs.
- [x] **Consistent Authenticated PDF Downloads**:
  - Audited across all 12 document endpoints via `src/utils/pdfDownloader.ts`.
  - Blob URL revocation on cleanup and user-friendly JSON error parsing on failures.

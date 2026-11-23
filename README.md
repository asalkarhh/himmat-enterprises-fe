# Himmat Enterprises — Frontend Portal (FE01, FE02, FE03 & FE04)

Production-ready frontend application for **Himmat Enterprises** (Hardware, Electrical & Paint Shop Management).
Covers:
* **FE01**: Foundation, Authentication, Role Guards & Shell Layout
* **FE02**: Product Catalog Hierarchy, Sellable Variants & Pricing Management
* **FE03**: Customer Management, Customer Multi-Sites & Supplier Masters
* **FE04**: Inventory Balances, Immutable Stock Movements & Multi-Line Manual Adjustments

---

## 1. Technology Architecture

* **Framework & Runtime**: React 18.3.1 with TypeScript 5.6.3, built with Vite 6.0.3
* **Routing**: React Router 6.28.0 (declarative nested layouts and role guards)
* **Styling**: Tailwind CSS 3.4.16 with responsive container utilities and PostCSS
* **Server State & Data Fetching**: TanStack React Query 5.62.7
  * Bounded safe reads (`retry: 1`, `staleTime: 30s`)
  * Financial, catalog, party, and inventory adjustments mutations strictly non-retrying (`retry: 0`)
* **HTTP Client**: Axios 1.7.9 with correlation/request ID parsing and structured error envelopes
* **Forms & Validation**: React Hook Form 7.54.1 & Zod 3.24.1
* **Icons**: Lucide React 0.468.0
* **Exact Decimal Math**: `decimal.js` 10.4.3 (prevents IEEE-754 precision loss on monetary figures)
* **Testing Suite**: Vitest 2.1.9 with React Testing Library 16.1.0 and JSDOM 25.0.1 (77 tests across 12 test suites)

---

## 2. Visual Language & Design System Tokens

Adapted from the Daddy Soda admin interface reference, tailored for an enterprise single-location hardware and paint store:

| Design Token | CSS / Tailwind Class | Hex / Spec | Usage |
|---|---|---|---|
| **Primary Accent** | `bg-teal-700 hover:bg-teal-800` | `#0f766e` / `#115e59` | Primary buttons, active nav pills, key icons |
| **Active Nav Surface** | `bg-teal-50 text-teal-900 border-teal-200` | `#f0fdfa` / `#134e4a` | Highlighted active sidebar items |
| **Canvas Background** | `bg-slate-50` | `#f8fafc` | Main screen background |
| **Card Surfaces** | `bg-white border-slate-200 rounded-xl` | `#ffffff` / `#e2e8f0` | Content cards, data tables, modals |
| **Headings & Body** | `text-slate-900`, `text-slate-700` | `#0f172a`, `#334155` | Typographic hierarchy |
| **Muted Captions** | `text-slate-500` | `#64748b` | Subtitles, timestamps, helper text |
| **Success Badge** | `bg-emerald-50 text-emerald-800 border-emerald-200` | `#ecfdf5` / `#065f46` | Active status, paid balance, in-stock |
| **Danger / Due Badge** | `bg-red-50 text-red-800 border-red-200` | `#fef2f2` / `#991b1b` | Inactive status, overdue receivables, zero stock |
| **Warning Badge** | `bg-amber-50 text-amber-800 border-amber-200` | `#fffbeb` / `#92400e` | Low stock alerts, 409 stale version conflict |
| **Info / Method Badge**| `bg-sky-50 text-sky-800 border-sky-200` | `#f0f9ff` / `#075985` | MRP Discount pricing method, contractor badges |

### Branding & Identity
* **Application Title**: `Himmat Enterprises`
* **Wordmark**: Clean, accessible text wordmark with building emblem (no fabricated logos or fake franchise graphics).
* **Single Location**: Focus on counter retail and contractor billing without multi-tenant franchise overhead.

---

## 3. Catalog Hierarchy & Pricing Management (FE02)

### 3.1 Entity Hierarchy
```
Brand (e.g. Supreme, Finolex, Asian Paints)
  └── Category (e.g. PVC Pipes, Paints)
        ├── Purchase Discount % (0-100)
        └── Sales Discount % (0-100)
        └── Subcategory (e.g. Rigid PVC, Emulsion)
              └── Master Product (e.g. Agriculture Delivery Pipe)
                    └── Product Variant / SKU (e.g. 40mm x 3m Class 3)
```

### 3.2 Pricing Methods & Rules
1. **MRP Discount (`MRP_DISCOUNT`)**:
   * Requires `mrpInclTax` (₹, Incl. GST).
   * Automatically resolves the parent Category `salesDiscountPct` as `CATEGORY_SALES_DISCOUNT` unless an explicit line discount override is provided.
2. **Cost Plus Margin (`COST_PLUS`)**:
   * Requires `purchaseCostExclTax` (₹, Excl. GST), `profitPct` (Target Margin %), and `gstRatePct`.
   * Calculates Selling Price = `Cost × (1 + Margin%) × (1 + GST%)`.
   * **Rule: Category sales discount does NOT apply to Cost-Plus variants.**
3. **Fixed Price (`FIXED`)**:
   * Requires `fixedPriceInclTax` (₹, Incl. GST).
   * **Rule: Strictly prohibits any discount.** (Backend throws `ValidationException` if discount > 0).

### 3.3 Inventory Balance Constraint on Creation
* Creating a variant via `POST /api/v1/variants` atomically creates an `inventory_balance` row initialized to `quantityOnHand = 0, openingConfirmed = false`.
* **The frontend intentionally omits any opening stock field during variant creation.** Opening counts are verified exclusively through initial stocktaking / stock adjustments (FE04).

### 3.4 Concurrency & Optimistic Locking (`expectedVersion`)
* All update endpoints (`PATCH /api/v1/brands/:id`, `/categories/:id`, `/subcategories/:id`, `/products/:id`, `/variants/:id`) require the entity's current `expectedVersion`.
* On receiving `409 CONFLICT`, the UI surfaces an inline error: *"Conflict: This record was modified by another user. Please refresh and retry."*

### 3.5 Read-Only Pricing Calculator (`/catalog/pricing-preview`)
* Interactive multi-line simulation tool calling `POST /api/v1/pricing/preview`.
* Computes net inclusive prices, resolves category vs explicit discount sources, and splits taxable amount vs GST.
* Profit margins are displayed **exclusively for Owner roles**; for Managers, profit columns remain hidden as enforced by backend security.
* Does not generate invoices or touch inventory balances.

---

## 4. Parties, Customer Multi-Site & Supplier Masters (FE03)

### 4.1 Customer Types & Data Model
Customers represent billing entities and are categorized into three business types:
* **`RETAIL`**: Walk-in counter customers.
* **`CONTRACTOR`**: Plumbing, painting, and electrical contractors purchasing for job sites.
* **`BUILDER`**: Real estate and commercial construction accounts.

Customer codes (`customerCode`) are auto-generated sequences (e.g. `CUST-00001`) and strictly read-only on the frontend. Phone numbers, postal codes, and tax identifiers (GSTIN) are preserved as strings to maintain leading zeros and formatting.

### 4.2 Customer Multi-Site Management
* **One Customer, Many Sites**: Each customer can have multiple delivery sites (e.g. "Site - Ganga Heights Phase 2", "Green Valley Villa #12").
* **Strict Ownership**: Every site belongs to exactly one customer (`customerId` is non-null). Sites cannot be reassigned or transferred across customers.
* **Simple Delivery Reference**: A site is an operational delivery destination for material drop-off on an invoice. It does **not** introduce project budgets, construction stages, or site wallets.
* **One Site Per Invoice**: Future invoices (FE06) select at most one delivery site belonging strictly to the billed customer.

### 4.3 Supplier Management & Separation
* **Dedicated Vendor Accounts**: Suppliers represent goods inward sources (`supplierCode` sequence, contact person, payment terms, GSTIN).
* **Strict Account Separation**: Customers and suppliers remain distinct entities. Even if a business acts as both a buyer and a seller, accounts are never merged automatically.
* **No Speculative Finance**: Detail pages display master identity and contacts only. Speculative financial totals, fake opening balances, or nonfunctional "Record Payment" buttons are strictly avoided prior to FE05/FE06.

### 4.4 Reusable Party Selectors
Designed for seamless consumption by FE05 (Purchases) and FE06 (Billing):
* **`CustomerSelector`**: Debounced server-backed active customer search (`[code] name (type) • phone`). Supports `initialCustomer` to preserve historical/inactive customer display without clearing selection.
* **`CustomerSiteSelector`**: Strictly scoped to a `customerId`. Offers "No specific site (default)" and automatically clears its selection whenever `customerId` changes to prevent cross-customer site corruption.
* **`SupplierSelector`**: Debounced server-backed active supplier search (`[code] name (contact) • city`). Supports `initialSupplier` for historical/inactive display.

### 4.5 Backend Integration Status & Contract Gap
* The backend database schema (`customer`, `customer_site`, `supplier` tables in `V3__party_masters_and_sites.sql`), JPA entities, repositories, and DTOs (`CustomerDto`, `CustomerSiteDto`, `SupplierDto`) are established in `Himmat_be`.
* Direct CRUD REST controllers (`/api/v1/customers`, `/api/v1/customers/{id}/sites`, `/api/v1/suppliers`) are specified to follow standard Spring Boot REST conventions. The frontend implementation adheres strictly to this contract and is 100% verified via automated integration mock tests.

---

## 5. Inventory Management, Movement History & Manual Stock Adjustments (FE04)

### 5.1 Single Location & Whole-Piece Quantities
* **One Shop & Single Stock Location**: Himmat Enterprises operates a single physical storefront and stockroom. Multi-warehouse routing, transfer orders, and franchise inventory partitions from Daddy Soda are completely removed.
* **Tracked Per Sellable Variant**: Stock balances (`quantityOnHand`) are maintained strictly at the SKU/variant level.
* **Whole Integer Pieces**: Quantities are discrete whole numbers (`15 pcs`). Boxes, liquid decimal litres, and bottle fractions are omitted.
* **Strict Negative Stock Prohibition**: Balances are physically bounded at $\ge 0$. Negative inventory is prohibited for all roles without exception (Owner cannot override).

### 5.2 Optimistic Versioning & Concurrency (`expectedVersion`)
* Every manual adjustment line sends `expectedVersion: balance.version`.
* On receiving `409 CONFLICT` (`STALE_VERSION`), the modal warns that stock was concurrently updated and provides a one-click **"Refresh Stock Versions"** action. This updates loaded versions and recalculates previews while preserving the user's entered reasons and quantities.
* The frontend never silently re-fetches a new version just before submitting to mask a concurrent change.

### 5.3 Multi-Line Manual Stock Adjustments
* **Batch Atomicity**: Adjustments support between 1 and 100 lines. All lines commit together or fail together.
* **Mandatory Audit Reason**: Requires an overall business reason (3 to 500 characters) before enabling review.
* **Duplicate Line Prevention**: Client-side validation prevents selecting the same variant across multiple lines (`DUPLICATE_VARIANT_LINE`).
* **Informational Live Preview**: Computes resulting balance (`Current ± Quantity`). If any OUT adjustment exceeds on-hand stock, submission is blocked with an explicit warning: *"Insufficient stock: Cannot reduce stock below 0 pieces"*.
* **Two-Step Review Confirmation**: A dedicated summary step renders affected SKUs, current balances, and expected outcomes before dispatching the network payload.

### 5.4 Idempotency & Safe Uncertain Retry
* Submissions send client-generated UUIDs via the `Idempotency-Key` header.
* In the event of a network timeout or dropped connection (`TIMEOUT` / `NETWORK_ERROR`), the modal preserves the exact request payload and idempotency key, allowing the user to safely retry without creating duplicate adjustments.

### 5.5 Immutable Stock Movement Ledger (`/inventory/movements`)
* **Audit Trail**: Every balance modification produces an append-only `StockMovement` entry (`MANUAL_ADJUSTMENT_IN`, `MANUAL_ADJUSTMENT_OUT`, `PURCHASE_RECEIPT`, `PURCHASE_RETURN`, `SALE`, `CUSTOMER_RETURN`, `REVERSAL`).
* **Timestamp Presentation**: Displayed strictly in Indian Standard Time (`Asia/Kolkata`).
* **Filters**: Supports filtering by variant, movement direction (`+IN` / `-OUT`), movement type, and date boundaries (`fromDate`, `toDate`).
* **Read-Only**: Movement entries are permanent and non-editable (no edit or delete actions).

### 5.6 Physical Opening Stock Limitation
* Product creation and initial imports initialize variant balances to `quantityOnHand = 0, openingConfirmed = false`.
* Opening stock quantities are verified through physical stocktaking and recorded via authorized adjustments. The UI avoids displaying fabricated "verified opening stock" badges until confirmed.

---

## 6. Route & Module Map

| Route | Access | Module | Status |
|---|---|---|---|
| `/login` | Public | Auth Foundation | **Fully Implemented** |
| `/dashboard` | `OWNER`, `MANAGER` | Reporting | **Fully Implemented** (Operational KPIs; Owner-only profit) |
| `/account` | `OWNER`, `MANAGER` | Identity | **Fully Implemented** (Profile info & password change) |
| `/settings/shop` | `OWNER`, `MANAGER` | Settings | **Fully Implemented** (Versioned shop configuration) |
| `/users` | `OWNER` only | Identity Admin | **Fully Implemented** (User CRUD with last-active-Owner protections) |
| `/catalog/products` | `OWNER`, `MANAGER` | Catalog (FE02) | **Fully Implemented** (Search, brand/cat/subcat filters, CRUD) |
| `/catalog/products/:id` | `OWNER`, `MANAGER` | Catalog (FE02) | **Fully Implemented** (Product detail, variant table & modal) |
| `/catalog/brands` | `OWNER`, `MANAGER` | Catalog (FE02) | **Fully Implemented** (Brand listing, creation, versioned edits) |
| `/catalog/categories` | `OWNER`, `MANAGER` | Catalog (FE02) | **Fully Implemented** (Category listing, separate discounts) |
| `/catalog/subcategories` | `OWNER`, `MANAGER` | Catalog (FE02) | **Fully Implemented** (Subcategory listing, category filter) |
| `/catalog/pricing-preview` | `OWNER`, `MANAGER` | Pricing (FE02) | **Fully Implemented** (Read-only pricing simulator) |
| `/customers` | `OWNER`, `MANAGER` | Parties (FE03) | **Fully Implemented** (Customer list, type filter, create/edit, status toggle) |
| `/customers/:id` | `OWNER`, `MANAGER` | Parties (FE03) | **Fully Implemented** (Customer detail, multi-site sub-table & site CRUD) |
| `/suppliers` | `OWNER`, `MANAGER` | Parties (FE03) | **Fully Implemented** (Supplier list, create/edit modal, status toggle) |
| `/suppliers/:id` | `OWNER`, `MANAGER` | Parties (FE03) | **Fully Implemented** (Supplier detail, contact info, notes) |
| `/inventory` | `OWNER`, `MANAGER` | Inventory (FE04) | **Fully Implemented** (Balances table, brand/category/status filters, adjust action) |
| `/inventory/variants/:variantId` | `OWNER`, `MANAGER` | Inventory (FE04) | **Fully Implemented** (Variant stock detail, audit version, recent movements) |
| `/inventory/movements` | `OWNER`, `MANAGER` | Inventory (FE04) | **Fully Implemented** (Immutable ledger, direction/type/date filters) |
| `/forbidden` | Protected | Access Control | **Fully Implemented** (403 Access Denied) |
| `*` | Any | Routing | **Fully Implemented** (404 Not Found) |
| `/purchases` | `OWNER`, `MANAGER` | Purchases | Coming in FE05 (Purchases & Supplier Ledger) |
| `/billing` | `OWNER`, `MANAGER` | Billing | Coming in FE06 (Immediate POS Billing) |
| `/dues` | `OWNER`, `MANAGER` | Dues | Coming in FE06 (Dues & Allocation) |
| `/expenses` | `OWNER`, `MANAGER` | Expenses | Coming in FE08 (Operating Expenses & Reports) |
| `/reports` | `OWNER`, `MANAGER` | Reporting | Coming in FE08 (Profit & Analytics) |

---

## 7. Session & In-Memory Authentication Lifecycle

1. **In-Memory Token Store**:
   * The Bearer JWT access token is stored **strictly in-memory** (`authStore.ts`).
   * It is **never** saved to `localStorage`, `sessionStorage`, `IndexedDB`, cookies, or URL parameters.
   * Page reload safely returns to login without silent token leaks.
   * No fabricated refresh token or fake "remember me" loops.
2. **Stateless Bearer Interception**:
   * Outgoing requests automatically inject `Authorization: Bearer <token>`.
3. **401 Unauthorized Expiry**:
   * On receiving `401`, session expires once cleanly, query cache is cleared (`queryClient.clear()`), and user is redirected to `/login?redirect=...`.
4. **403 Forbidden Access**:
   * On receiving `403`, an access denied state is displayed without logging the user out.
5. **Session Invalidation on Password Change**:
   * When an authenticated user updates their password via `POST /api/v1/auth/change-password`, all active JWT tokens are invalidated by the backend. The frontend immediately clears local session state and redirects to login with an informational notice.

---

## 8. Frontend Module Implementation Roadmap

```mermaid
flowchart TD
  FE01["FE01: Foundation, Auth, Shell & Shared Components (DONE)"] --> FE02["FE02: Catalog Hierarchy, Variants & Pricing (DONE)"]
  FE02 --> FE03["FE03: Customers, Multi-Site & Supplier Masters (DONE)"]
  FE03 --> FE04["FE04: Inventory Balance, Stock Movements & Adjustments (DONE)"]
  FE04 --> FE05["FE05: Purchases, Goods Inward & Supplier Ledger"]
  FE05 --> FE06["FE06: Immediate POS Billing & Customer Payments"]
  FE06 --> FE07["FE07: Bill Revisions, Customer Returns & Refunds"]
  FE07 --> FE08["FE08: Expenses, Reporting, Dashboard & PDF Printouts"]
```

---

## 9. Verification & Quality Gates

Run the verification suite:
```bash
# TypeScript verification & Vite production build
npm run build

# Automated Vitest Suite (77 tests across 12 suites)
npm test
```

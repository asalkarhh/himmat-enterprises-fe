# Client Review & Operational Readiness Checklist — Himmat Enterprises

This checklist is prepared for the store owner and management team of **Himmat Enterprises** to verify operational workflows before full store go-live.

---

## 1. Catalog & Master Data Verification
- [ ] **Brands & Categories**: Confirm that core brands (e.g., Asian Paints, Finolex, Supreme, Havells) and categories are configured with their respective sales and purchase discount percentages.
- [ ] **Sellable Product Variants**: Confirm variants have correct SKU codes, size/pack labels, and assigned pricing models (`MRP_DISCOUNT`, `COST_PLUS`, or `FIXED`).
- [ ] **Initial Stocktaking**: Perform physical shelf count and log starting inventory via **Inventory > Stock Adjustments** using reason `STOCKTAKE`.

---

## 2. Supplier & Inward Purchasing Workflow
- [ ] **Supplier Masters**: Ensure primary distributors and depots have valid names, phone numbers, and GSTINs entered.
- [ ] **Inward Purchase Entry**: Enter a sample supplier bill under **Purchases > New Purchase Entry**. Verify that piece counts automatically reflect in **Inventory Balances**.
- [ ] **Supplier Payment & Settlement**: Record sample supplier payment with cash or bank UTR reference. Verify running balance under **Suppliers > Supplier Detail > Ledger Statement**.

---

## 3. Counter Sales & Invoicing Workflow
- [ ] **Walk-in Retail Bill**: Generate an immediate counter invoice for a walk-in retail customer. Confirm printout / PDF generation.
- [ ] **Contractor Account Sale**: Bill goods to a registered contractor on account (without immediate payment). Confirm invoice appears in **Outstanding Dues** with 30-day aging counter.
- [ ] **Customer Receipt Entry**: Record cash receipt from contractor. Confirm automatic allocation against oldest open bills and balance update on customer ledger.
- [ ] **Invoice Correction**: Test versioned revision on an existing bill (e.g. quantity change). Confirm revision history preserves original bill number and updates inventory accordingly.
- [ ] **Customer Return**: Process returned paint cans / pipe fittings. Confirm inventory is returned to shelf and credit note is issued.

---

## 4. Daily Operating Expenses & Cash Tracking
- [ ] **Record Expense**: Enter daily tea, transport, or shop maintenance expense under **Expenses > New Expense Voucher**.
- [ ] **Bookkeeping Reversal**: Test reversing an accidental duplicate entry with a recorded reason. Confirm voucher displays `REVERSED` status.
- [ ] **Cash Movement Reconciliation**: Review **Reports > Cash Movements** at close of day to verify recorded cash drawer balance matches actual cash on hand.

---

## 5. Owner Financial & Margin Reviews
- [ ] **Owner-Only Login**: Log in with Owner credentials. Verify that **Owner Profit & Margins** appears in the top navigation and dashboard.
- [ ] **Manager Restricted Login**: Log in with Manager credentials. Confirm that Profit and Margins are completely invisible and inaccessible.
- [ ] **Tax & Valuation Reports**: Review GST tax components breakdown under **Reports > Sales Activity** and stock valuation under **Reports > Inventory & Valuations**.

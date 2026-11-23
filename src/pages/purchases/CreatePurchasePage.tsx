import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import Decimal from 'decimal.js';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Checkbox } from '../../components/ui/Checkbox';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { Card } from '../../components/ui/Card';
import { SupplierSelector } from '../../components/party/SupplierSelector';
import { VariantSelector } from '../../components/inventory/VariantSelector';
import { PaymentComponentsInput } from '../../components/finance/PaymentComponentsInput';
import { purchaseApi } from '../../api/purchase.api';
import { queryKeys } from '../../api/queryKeys';
import { useToast } from '../../hooks/useToast';
import {
  CreatePurchaseRequest,
  PriceBasis,
  PaymentComponentDto,
} from '../../types/purchase.types';
import { SupplierDto } from '../../types/party.types';
import { ProductVariantDto } from '../../types/catalog.types';
import { formatInr } from '../../utils/formatters';
import { generateIdempotencyKey, parseApiError } from '../../api/apiHelpers';

interface LineFormState {
  id: string;
  variantId: string;
  variant?: ProductVariantDto;
  quantity: string;
  priceBasis: PriceBasis;
  enteredUnitPrice: string;
  discountPct: string;
  gstRatePct: string;
  updateProductCost: boolean;
}

const emptyLine = (): LineFormState => ({
  id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  variantId: '',
  quantity: '1',
  priceBasis: 'GST_EXCLUSIVE',
  enteredUnitPrice: '',
  discountPct: '0',
  gstRatePct: '18',
  updateProductCost: false,
});

export const CreatePurchasePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const [supplierId, setSupplierId] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierDto | undefined>();
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState('');

  const [lines, setLines] = useState<LineFormState[]>([emptyLine()]);

  // Payment components
  const [recordPaymentNow, setRecordPaymentNow] = useState(false);
  const [paymentComponents, setPaymentComponents] = useState<PaymentComponentDto[]>([
    { method: 'CASH', amount: '', onlineReference: '' },
  ]);

  // Review step & submission
  const [isReviewStep, setIsReviewStep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Line manipulation
  const handleAddLine = () => {
    setLines([...lines, emptyLine()]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length <= 1) {
      setLines([emptyLine()]);
      return;
    }
    const next = [...lines];
    next.splice(idx, 1);
    setLines(next);
  };

  const handleVariantChange = (idx: number, varId: string, variant?: ProductVariantDto) => {
    const next = [...lines];
    next[idx] = {
      ...next[idx],
      variantId: varId,
      variant,
      // If variant has gstRatePct, pre-fill it
      gstRatePct: variant?.gstRatePct ? variant.gstRatePct : next[idx].gstRatePct,
    };
    setLines(next);
  };

  const handleLineFieldChange = (idx: number, field: keyof LineFormState, val: any) => {
    const next = [...lines];
    next[idx] = { ...next[idx], [field]: val };
    setLines(next);
  };

  // Exact Decimal Line Math
  const computeLineCalculations = (line: LineFormState) => {
    try {
      const qty = parseInt(line.quantity, 10);
      if (isNaN(qty) || qty <= 0 || !line.enteredUnitPrice || isNaN(Number(line.enteredUnitPrice))) {
        return { grossUnitCost: '0.00', netUnitCost: '0.00', lineTotal: '0.00', taxPerUnit: '0.00' };
      }

      const unitPrice = new Decimal(line.enteredUnitPrice);
      const discountPct = line.discountPct ? new Decimal(line.discountPct) : new Decimal(0);
      const discountPerUnit = unitPrice.mul(discountPct).div(100);

      let grossUnitCost: Decimal;
      let netUnitCost: Decimal | null = null;
      let taxPerUnit: Decimal | null = null;

      if (line.priceBasis === 'GST_EXCLUSIVE') {
        const discountedExcl = unitPrice.minus(discountPerUnit);
        const gstRate = line.gstRatePct ? new Decimal(line.gstRatePct) : new Decimal(0);
        taxPerUnit = discountedExcl.mul(gstRate).div(100);
        grossUnitCost = discountedExcl.plus(taxPerUnit);
        netUnitCost = discountedExcl;
      } else {
        const discountedIncl = unitPrice.minus(discountPerUnit);
        grossUnitCost = discountedIncl;
        if (line.gstRatePct !== '') {
          const gstRate = new Decimal(line.gstRatePct);
          const taxFactor = new Decimal(1).plus(gstRate.div(100));
          netUnitCost = discountedIncl.div(taxFactor);
          taxPerUnit = grossUnitCost.minus(netUnitCost);
        }
      }

      const lineTotal = grossUnitCost.mul(qty);

      return {
        grossUnitCost: grossUnitCost.toFixed(2),
        netUnitCost: netUnitCost ? netUnitCost.toFixed(2) : null,
        taxPerUnit: taxPerUnit ? taxPerUnit.toFixed(2) : null,
        lineTotal: lineTotal.toFixed(2),
      };
    } catch {
      return { grossUnitCost: '0.00', netUnitCost: '0.00', lineTotal: '0.00', taxPerUnit: '0.00' };
    }
  };

  // Overall Totals
  let subtotalExclTax = new Decimal(0);
  let totalDiscount = new Decimal(0);
  let totalGst = new Decimal(0);
  let totalPayable = new Decimal(0);

  lines.forEach((l) => {
    const calc = computeLineCalculations(l);
    totalPayable = totalPayable.plus(new Decimal(calc.lineTotal));
    if (calc.netUnitCost) {
      subtotalExclTax = subtotalExclTax.plus(new Decimal(calc.netUnitCost).mul(parseInt(l.quantity, 10) || 0));
    } else {
      subtotalExclTax = subtotalExclTax.plus(new Decimal(calc.lineTotal));
    }
    if (calc.taxPerUnit) {
      totalGst = totalGst.plus(new Decimal(calc.taxPerUnit).mul(parseInt(l.quantity, 10) || 0));
    }
    const unitPrice = parseFloat(l.enteredUnitPrice) || 0;
    const discPct = parseFloat(l.discountPct) || 0;
    const qty = parseInt(l.quantity, 10) || 0;
    totalDiscount = totalDiscount.plus(new Decimal(unitPrice).mul(discPct).div(100).mul(qty));
  });

  // Tendered Payment Total
  let totalTendered = new Decimal(0);
  if (recordPaymentNow) {
    paymentComponents.forEach((c) => {
      if (c.amount && !isNaN(Number(c.amount))) {
        totalTendered = totalTendered.plus(new Decimal(c.amount));
      }
    });
  }

  const remainingOutstanding = Decimal.max(0, totalPayable.minus(totalTendered));
  const excessAdvance = Decimal.max(0, totalTendered.minus(totalPayable));

  // Form Validation
  const validateForm = (): string | null => {
    if (!supplierId) {
      return 'Please select a supplier.';
    }
    if (lines.length === 0) {
      return 'At least one purchase line is required.';
    }

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const lineNum = i + 1;
      if (!l.variantId) {
        return `Line ${lineNum}: Please select a product variant.`;
      }
      const qty = parseInt(l.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        return `Line ${lineNum}: Quantity must be a whole positive integer >= 1.`;
      }
      const price = parseFloat(l.enteredUnitPrice);
      if (isNaN(price) || price <= 0) {
        return `Line ${lineNum}: Unit price must be greater than 0.`;
      }
      if (l.priceBasis === 'GST_EXCLUSIVE' && (l.gstRatePct === '' || isNaN(Number(l.gstRatePct)))) {
        return `Line ${lineNum}: GST % is mandatory when price basis is GST_EXCLUSIVE.`;
      }
      if (l.priceBasis === 'GST_INCLUSIVE' && l.updateProductCost && l.gstRatePct === '') {
        return `Line ${lineNum}: GST % is required to update master purchase cost when price basis is GST_INCLUSIVE.`;
      }
    }

    if (recordPaymentNow) {
      if (paymentComponents.length === 0 || totalTendered.lessThanOrEqualTo(0)) {
        return 'Please enter a valid payment amount greater than 0.';
      }
    }

    return null;
  };

  const handleProceedToReview = () => {
    const err = validateForm();
    if (err) {
      setFormError(err);
      return;
    }
    setFormError(null);
    setIsReviewStep(true);
  };

  const handleSubmit = async () => {
    const err = validateForm();
    if (err) {
      setFormError(err);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const payload: CreatePurchaseRequest = {
      supplierId,
      supplierInvoiceNumber: supplierInvoiceNumber.trim() || undefined,
      purchaseDate: purchaseDate || undefined,
      notes: notes.trim() || undefined,
      lines: lines.map((l) => ({
        variantId: l.variantId,
        quantity: parseInt(l.quantity, 10),
        priceBasis: l.priceBasis,
        enteredUnitPrice: new Decimal(l.enteredUnitPrice).toFixed(2),
        discountPct: l.discountPct ? new Decimal(l.discountPct).toFixed(2) : '0.00',
        gstRatePct: l.gstRatePct !== '' ? new Decimal(l.gstRatePct).toFixed(2) : null,
        updateProductCost: l.updateProductCost,
        variantVersion: l.variant?.version,
      })),
      paymentComponents: recordPaymentNow
        ? paymentComponents
            .filter((c) => c.amount && parseFloat(c.amount) > 0)
            .map((c) => ({
              method: c.method,
              amount: new Decimal(c.amount).toFixed(2),
              onlineReference: c.onlineReference?.trim() || undefined,
            }))
        : null,
    };

    try {
      const idempotencyKey = generateIdempotencyKey();
      const response = await purchaseApi.createPurchase(payload, idempotencyKey);

      // Invalidate relevant query caches
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.supplierFinance.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.variants.all });

      toastSuccess(`Purchase invoice ${response.purchaseNumber} created successfully!`);
      navigate(`/purchases/${response.id}`);
    } catch (rawErr) {
      const parsed = parseApiError(rawErr);
      setFormError(parsed.message || 'Failed to post inward purchase invoice.');
      toastError(parsed.message || 'Purchase creation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isReviewStep ? 'Review Inward Purchase Bill' : 'New Inward Purchase Invoice'}
        subtitle="Record goods inward from supplier, update live inventory stock, and track payables."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate('/purchases')}
              disabled={isSubmitting}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back to Purchases
            </Button>
          </div>
        }
      />

      {formError && <ErrorMessage error={formError} />}

      {!isReviewStep ? (
        /* STEP 1: FORM ENTRY */
        <div className="space-y-6">
          {/* Header Card */}
          <Card className="p-5 border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">
              1. Supplier & Invoice Reference
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <SupplierSelector
                  label="Supplier *"
                  value={supplierId}
                  onChange={(id, sup) => {
                    setSupplierId(id);
                    setSelectedSupplier(sup);
                  }}
                  required
                />
              </div>

              <div>
                <Input
                  label="Supplier Invoice / DC #"
                  placeholder="e.g. INV-2026-908"
                  value={supplierInvoiceNumber}
                  onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                  helperText="Physical vendor bill reference"
                />
              </div>

              <div>
                <Input
                  label="Purchase Date"
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Textarea
                label="Commercial Notes"
                placeholder="Optional delivery terms, transporter, or inward remarks..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={1}
              />
            </div>
          </Card>

          {/* Line Items Card */}
          <Card className="p-5 border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">
                  2. Line Items & Inward Rates
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Stock on hand will atomically increase upon posting.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddLine}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Line
              </Button>
            </div>

            <div className="space-y-4">
              {lines.map((line, idx) => {
                const calc = computeLineCalculations(line);

                return (
                  <div
                    key={line.id}
                    className="p-4 bg-slate-50/60 border border-slate-200 rounded-xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase">
                        Item #{idx + 1}
                      </span>
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="text-slate-400 hover:text-red-600 p-1"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                      {/* Variant selector */}
                      <div className="md:col-span-4">
                        <VariantSelector
                          label="Product Variant *"
                          value={line.variantId}
                          onChange={(id, v) => handleVariantChange(idx, id, v)}
                          required
                        />
                      </div>

                      {/* Quantity */}
                      <div className="md:col-span-2">
                        <Input
                          label="Qty (pcs) *"
                          type="number"
                          min="1"
                          step="1"
                          value={line.quantity}
                          onChange={(e) => handleLineFieldChange(idx, 'quantity', e.target.value)}
                          required
                        />
                      </div>

                      {/* Price Basis */}
                      <div className="md:col-span-2">
                        <Select
                          label="Price Basis"
                          value={line.priceBasis}
                          onChange={(e) =>
                            handleLineFieldChange(idx, 'priceBasis', e.target.value as PriceBasis)
                          }
                          options={[
                            { value: 'GST_EXCLUSIVE', label: 'Excl. GST' },
                            { value: 'GST_INCLUSIVE', label: 'Incl. GST' },
                          ]}
                        />
                      </div>

                      {/* Entered Unit Price */}
                      <div className="md:col-span-2">
                        <Input
                          label="Unit Price (₹) *"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={line.enteredUnitPrice}
                          onChange={(e) =>
                            handleLineFieldChange(idx, 'enteredUnitPrice', e.target.value)
                          }
                          required
                        />
                      </div>

                      {/* Discount % */}
                      <div className="md:col-span-1">
                        <Input
                          label="Disc %"
                          type="number"
                          step="0.01"
                          placeholder="0"
                          value={line.discountPct}
                          onChange={(e) =>
                            handleLineFieldChange(idx, 'discountPct', e.target.value)
                          }
                        />
                      </div>

                      {/* GST % */}
                      <div className="md:col-span-1">
                        <Select
                          label="GST %"
                          value={line.gstRatePct}
                          onChange={(e) =>
                            handleLineFieldChange(idx, 'gstRatePct', e.target.value)
                          }
                          options={[
                            { value: '', label: line.priceBasis === 'GST_INCLUSIVE' ? 'Unknown' : 'Select' },
                            { value: '0', label: '0%' },
                            { value: '5', label: '5%' },
                            { value: '12', label: '12%' },
                            { value: '18', label: '18%' },
                            { value: '28', label: '28%' },
                          ]}
                        />
                      </div>
                    </div>

                    {/* Cost update & calculation preview */}
                    <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-200/60 text-xs gap-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`cost-update-${line.id}`}
                          checked={line.updateProductCost}
                          onChange={(e) =>
                            handleLineFieldChange(idx, 'updateProductCost', e.target.checked)
                          }
                          disabled={line.priceBasis === 'GST_INCLUSIVE' && line.gstRatePct === ''}
                          label="Update Master Purchase Cost with Net Excl. Tax Rate"
                        />
                        {line.priceBasis === 'GST_INCLUSIVE' && line.gstRatePct === '' && (
                          <span className="text-amber-700 font-medium">
                            (Requires known GST rate)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-slate-700">
                        <span>
                          Gross Unit: <strong>₹{calc.grossUnitCost}</strong>
                        </span>
                        <span>
                          Line Total: <strong className="text-slate-900 text-sm">₹{calc.lineTotal}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Payment Section (Optional Instant Settlement) */}
          <Card className="p-5 border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">
                  3. Settlement & Payment
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Record counter cash or bank payment made during inward bill generation.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="record-payment-toggle"
                  checked={recordPaymentNow}
                  onChange={(e) => setRecordPaymentNow(e.target.checked)}
                  label="Record Payment Now"
                />
              </div>
            </div>

            {recordPaymentNow && (
              <PaymentComponentsInput
                components={paymentComponents}
                onChange={setPaymentComponents}
                helperText="Enter cash or online transactions for this inward bill."
              />
            )}
          </Card>

          {/* Totals Summary Footer */}
          <Card className="p-5 border-slate-200 shadow-sm bg-slate-50/50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1 text-sm text-slate-600">
                <p>
                  Subtotal (Excl. Tax):{' '}
                  <strong className="text-slate-900">{formatInr(subtotalExclTax.toFixed(2))}</strong>
                </p>
                <p>
                  Total Discounts:{' '}
                  <strong className="text-emerald-700">{formatInr(totalDiscount.toFixed(2))}</strong>
                </p>
                <p>
                  Total GST:{' '}
                  <strong className="text-slate-900">{formatInr(totalGst.toFixed(2))}</strong>
                </p>
              </div>

              <div className="text-right space-y-1">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  Total Payable Amount
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatInr(totalPayable.toFixed(2))}
                </p>
                {recordPaymentNow && (
                  <p className="text-xs font-medium text-slate-600">
                    Remaining Payable: {formatInr(remainingOutstanding.toFixed(2))}
                    {excessAdvance.greaterThan(0) && (
                      <span className="text-emerald-700 ml-1">
                        (Advance Credit: {formatInr(excessAdvance.toFixed(2))})
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-5 border-t border-slate-200 mt-4">
              <Button
                variant="primary"
                size="lg"
                onClick={handleProceedToReview}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Review & Confirm Purchase
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        /* STEP 2: REVIEW STEP */
        <div className="space-y-6">
          <Card className="p-5 border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-teal-700" />
              <div>
                <p className="font-semibold">Review Purchase Details</p>
                <p className="text-xs text-teal-800">
                  Posting this purchase will immediately increase inventory on hand for all lines and post an entry to the supplier ledger.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm bg-slate-50 p-4 rounded-xl">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Supplier</p>
                <p className="font-bold text-slate-900 mt-0.5">
                  {selectedSupplier ? `[${selectedSupplier.supplierCode}] ${selectedSupplier.name}` : supplierId}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Vendor Invoice #</p>
                <p className="font-medium text-slate-900 mt-0.5">
                  {supplierInvoiceNumber || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Purchase Date</p>
                <p className="font-medium text-slate-900 mt-0.5">{purchaseDate}</p>
              </div>
            </div>

            {/* Lines Summary Table */}
            <div>
              <h4 className="text-sm font-semibold text-slate-800 mb-2">Lines ({lines.length})</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Variant / SKU</th>
                      <th className="py-2.5 px-3 text-right">Qty</th>
                      <th className="py-2.5 px-3">Price Basis</th>
                      <th className="py-2.5 px-3 text-right">Entered Rate</th>
                      <th className="py-2.5 px-3 text-right">Disc %</th>
                      <th className="py-2.5 px-3 text-right">GST %</th>
                      <th className="py-2.5 px-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lines.map((l) => {
                      const calc = computeLineCalculations(l);
                      return (
                        <tr key={l.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-semibold bg-slate-100 px-1 py-0.5 rounded">
                              {l.variant?.sku || l.variantId}
                            </span>
                            <span className="ml-1.5 text-slate-600">
                              {l.variant?.productName} ({l.variant?.sizeLabel})
                            </span>
                            {l.updateProductCost && (
                              <span className="ml-2 text-[10px] text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                                Updates Master Cost
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold">{l.quantity} pcs</td>
                          <td className="py-2.5 px-3 font-medium">{l.priceBasis}</td>
                          <td className="py-2.5 px-3 text-right font-mono">₹{l.enteredUnitPrice}</td>
                          <td className="py-2.5 px-3 text-right">{l.discountPct}%</td>
                          <td className="py-2.5 px-3 text-right">{l.gstRatePct ? `${l.gstRatePct}%` : '—'}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            ₹{calc.lineTotal}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Totals */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl">
              <div className="text-sm space-y-1">
                <p>Total Payable: <strong className="text-slate-900">{formatInr(totalPayable.toFixed(2))}</strong></p>
                {recordPaymentNow && (
                  <p>Immediate Payment: <strong className="text-teal-700">{formatInr(totalTendered.toFixed(2))}</strong></p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase font-semibold">Net Payable to Supplier</p>
                <p className="text-xl font-bold text-slate-900">
                  {formatInr(remainingOutstanding.toFixed(2))}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <Button
                variant="outline"
                size="md"
                onClick={() => setIsReviewStep(false)}
                disabled={isSubmitting}
              >
                Back to Edit
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={handleSubmit}
                isLoading={isSubmitting}
              >
                Post Inward Purchase Bill
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

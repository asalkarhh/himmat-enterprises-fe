import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  FileText,
  Info,
  CheckCircle2,
} from 'lucide-react';
import Decimal from 'decimal.js';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Checkbox } from '../../components/ui/Checkbox';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { CustomerSelector } from '../../components/party/CustomerSelector';
import { CustomerSiteSelector } from '../../components/party/CustomerSiteSelector';
import { VariantSelector } from '../../components/inventory/VariantSelector';
import { PaymentComponentsInput } from '../../components/finance/PaymentComponentsInput';
import { invoiceApi, customerFinanceApi } from '../../api/billing.api';
import { queryKeys } from '../../api/queryKeys';
import { useToast } from '../../hooks/useToast';
import {
  InvoiceDisplayFormat,
  InvoiceLineRequest,
  InvoicePreviewResponseDto,
  CreateInvoiceRequest,
} from '../../types/billing.types';
import { CustomerDto, CustomerSiteDto } from '../../types/party.types';
import { ProductVariantDto } from '../../types/catalog.types';
import { PaymentComponentDto } from '../../types/purchase.types';
import { formatInr, formatBusinessDate } from '../../utils/formatters';
import { generateIdempotencyKey, parseApiError } from '../../api/apiHelpers';

interface LineFormState {
  id: string;
  variantId: string;
  variant?: ProductVariantDto;
  quantity: string;
  unitPriceOverride: string;
  overrideReason: string;
  discountPct: string;
  expectedVariantVersion?: number;
}

const emptyLine = (): LineFormState => ({
  id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  variantId: '',
  quantity: '1',
  unitPriceOverride: '',
  overrideReason: '',
  discountPct: '',
});

export const CreateInvoicePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const preselectedCustomerId = searchParams.get('customerId') || '';

  const [customerId, setCustomerId] = useState(preselectedCustomerId);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDto | undefined>();
  const [siteId, setSiteId] = useState('');
  const [selectedSite, setSelectedSite] = useState<CustomerSiteDto | undefined>();

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [invoiceDate, setInvoiceDate] = useState(todayStr);

  const calculatedDueDate = useMemo(() => {
    try {
      const d = new Date(invoiceDate);
      if (isNaN(d.getTime())) return '';
      d.setDate(d.getDate() + 30);
      return d.toISOString().slice(0, 10);
    } catch {
      return '';
    }
  }, [invoiceDate]);

  const [displayFormat, setDisplayFormat] = useState<InvoiceDisplayFormat>('NORMAL');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineFormState[]>([emptyLine()]);

  // Advance application state
  const [applyAdvanceCredit, setApplyAdvanceCredit] = useState(false);
  const [applyAdvanceAmount, setApplyAdvanceAmount] = useState('');

  // Payment components state
  const [recordPaymentNow, setRecordPaymentNow] = useState(false);
  const [paymentComponents, setPaymentComponents] = useState<PaymentComponentDto[]>([
    { method: 'CASH', amount: '', onlineReference: '' },
  ]);

  // Review step & submission state
  const [isReviewStep, setIsReviewStep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Uncertain submission state (for timeout recovery)
  const [uncertainState, setUncertainState] = useState<{
    idempotencyKey: string;
    requestPayload: CreateInvoiceRequest;
  } | null>(null);

  // Clear site when customer changes
  const handleCustomerChange = (newCustomerId: string, customer?: CustomerDto) => {
    setCustomerId(newCustomerId);
    setSelectedCustomer(customer);
    setSiteId('');
    setSelectedSite(undefined);
    setApplyAdvanceCredit(false);
    setApplyAdvanceAmount('');
  };

  // Fetch customer account summary to see available advance credit
  const { data: customerSummary } = useQuery({
    queryKey: queryKeys.customerFinance.accountSummary(customerId),
    queryFn: ({ signal }) => customerFinanceApi.getAccountSummary(customerId, signal),
    enabled: !!customerId,
  });

  const availableAdvanceCredit = useMemo(() => {
    if (!customerSummary) return new Decimal(0);
    const unalloc = parseFloat(customerSummary.unallocatedCredit || '0');
    return new Decimal(unalloc > 0 ? unalloc : 0);
  }, [customerSummary]);

  // Debounced line preparation for preview
  const validPreviewLines: InvoiceLineRequest[] = useMemo(() => {
    return lines
      .filter((l) => l.variantId && parseInt(l.quantity, 10) >= 1)
      .map((l) => ({
        variantId: l.variantId,
        quantity: parseInt(l.quantity, 10),
        unitPriceOverride: l.unitPriceOverride ? l.unitPriceOverride : null,
        discountPct: l.discountPct ? l.discountPct : null,
        overrideReason: l.unitPriceOverride ? l.overrideReason || null : null,
        expectedVariantVersion: l.expectedVariantVersion || l.variant?.version || null,
      }));
  }, [lines]);

  const [debouncedLines, setDebouncedLines] = useState<InvoiceLineRequest[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedLines(validPreviewLines);
    }, 250);
    return () => clearTimeout(timer);
  }, [validPreviewLines]);

  // Authoritative Pricing Preview Query
  const {
    data: previewData,
    isLoading: isPreviewLoading,
    isFetching: isPreviewFetching,
    error: previewError,
  } = useQuery<InvoicePreviewResponseDto>({
    queryKey: queryKeys.invoices.preview({
      customerId,
      siteId: siteId || null,
      displayFormat,
      lines: debouncedLines,
    }),
    queryFn: ({ signal }) =>
      invoiceApi.previewInvoice(
        {
          customerId,
          siteId: siteId || null,
          displayFormat,
          lines: debouncedLines,
        },
        signal
      ),
    enabled: !!customerId && debouncedLines.length > 0,
    staleTime: 5000,
  });

  // Line manipulation handlers
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
      unitPriceOverride: '',
      overrideReason: '',
      discountPct: '',
      expectedVariantVersion: variant?.version,
    };
    setLines(next);
  };

  const handleQuantityChange = (idx: number, val: string) => {
    if (val === '' || /^[0-9]+$/.test(val)) {
      const next = [...lines];
      next[idx] = { ...next[idx], quantity: val };
      setLines(next);
    }
  };

  const handlePriceOverrideChange = (idx: number, val: string) => {
    if (val === '' || /^\d*(\.\d{0,2})?$/.test(val)) {
      const next = [...lines];
      next[idx] = { ...next[idx], unitPriceOverride: val };
      setLines(next);
    }
  };

  const handleOverrideReasonChange = (idx: number, val: string) => {
    const next = [...lines];
    next[idx] = { ...next[idx], overrideReason: val };
    setLines(next);
  };

  const handleDiscountChange = (idx: number, val: string) => {
    if (val === '' || /^\d*(\.\d{0,4})?$/.test(val)) {
      const num = parseFloat(val);
      if (isNaN(num) || (num >= 0 && num <= 100)) {
        const next = [...lines];
        next[idx] = { ...next[idx], discountPct: val };
        setLines(next);
      }
    }
  };

  // Financial summary calculations
  const totalPayableDec = useMemo(() => {
    if (!previewData) return new Decimal(0);
    return new Decimal(previewData.totalPayableAmount || 0);
  }, [previewData]);

  const advanceAppliedDec = useMemo(() => {
    if (!applyAdvanceCredit || !applyAdvanceAmount || isNaN(Number(applyAdvanceAmount))) {
      return new Decimal(0);
    }
    return new Decimal(applyAdvanceAmount);
  }, [applyAdvanceCredit, applyAdvanceAmount]);

  // Payment components total
  const tenderedDec = useMemo(() => {
    if (!recordPaymentNow) return new Decimal(0);
    let sum = new Decimal(0);
    paymentComponents.forEach((c) => {
      if (c.amount && !isNaN(Number(c.amount))) {
        sum = sum.plus(new Decimal(c.amount));
      }
    });
    return sum;
  }, [recordPaymentNow, paymentComponents]);

  const remainingBalanceDec = useMemo(() => {
    const rem = totalPayableDec.minus(advanceAppliedDec).minus(tenderedDec);
    return rem.greaterThan(0) ? rem : new Decimal(0);
  }, [totalPayableDec, advanceAppliedDec, tenderedDec]);

  const newAdvanceCreditDec = useMemo(() => {
    const totalCover = advanceAppliedDec.plus(tenderedDec);
    const excess = totalCover.minus(totalPayableDec);
    return excess.greaterThan(0) ? excess : new Decimal(0);
  }, [totalPayableDec, advanceAppliedDec, tenderedDec]);

  // Quick action: Fill max available advance
  const handleApplyMaxAdvance = () => {
    const maxCanApply = Decimal.min(availableAdvanceCredit, totalPayableDec);
    setApplyAdvanceAmount(maxCanApply.toFixed(2));
  };

  // Quick action: Pay full remaining balance now
  const handlePayRemainingBalance = () => {
    const rem = totalPayableDec.minus(advanceAppliedDec);
    const target = rem.greaterThan(0) ? rem.toFixed(2) : '0.00';
    setRecordPaymentNow(true);
    setPaymentComponents([{ method: 'CASH', amount: target, onlineReference: '' }]);
  };

  // Validation before opening review modal
  const handleOpenReview = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!customerId) {
      setFormError('Please select a customer for this invoice.');
      return;
    }

    if (validPreviewLines.length === 0) {
      setFormError('Please add at least one line item with a sellable variant and quantity >= 1.');
      return;
    }

    // Check duplicate variants
    const variantIds = validPreviewLines.map((l) => String(l.variantId));
    const duplicates = variantIds.filter((item, index) => variantIds.indexOf(item) !== index);
    if (duplicates.length > 0) {
      setFormError('Duplicate variants detected across lines. Please consolidate items into a single line.');
      return;
    }

    // Check price overrides have mandatory reasons
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (l.unitPriceOverride && (!l.overrideReason || !l.overrideReason.trim())) {
        setFormError(`Line #${i + 1}: An authorized reason is required when overriding the unit price.`);
        return;
      }
    }

    if (!previewData) {
      setFormError('Authoritative price preview is not ready. Please verify line items and retry.');
      return;
    }

    // Validate advance credit applied
    if (applyAdvanceCredit) {
      if (advanceAppliedDec.lessThanOrEqualTo(0)) {
        setFormError('Please enter a valid advance credit amount to apply, or uncheck the option.');
        return;
      }
      if (advanceAppliedDec.greaterThan(availableAdvanceCredit)) {
        setFormError(`Applied advance (${formatInr(advanceAppliedDec.toNumber())}) exceeds available credit (${formatInr(availableAdvanceCredit.toNumber())}).`);
        return;
      }
      if (advanceAppliedDec.greaterThan(totalPayableDec)) {
        setFormError(`Applied advance (${formatInr(advanceAppliedDec.toNumber())}) exceeds bill payable (${formatInr(totalPayableDec.toNumber())}).`);
        return;
      }
    }

    // Validate payment components if tendered
    if (recordPaymentNow) {
      if (tenderedDec.lessThanOrEqualTo(0)) {
        setFormError('Tendered payment total must be greater than zero, or uncheck the payment option.');
        return;
      }
      for (let i = 0; i < paymentComponents.length; i++) {
        const c = paymentComponents[i];
        if (c.method === 'ONLINE' && (!c.onlineReference || !c.onlineReference.trim())) {
          setFormError(`Payment Row #${i + 1}: Online UTR / transaction reference is required for bank payments.`);
          return;
        }
      }
    }

    setIsReviewStep(true);
  };

  // Submission handler
  const handleConfirmSubmit = async () => {
    if (!previewData) return;
    setIsSubmitting(true);
    setFormError(null);

    const idempotencyKey = uncertainState ? uncertainState.idempotencyKey : generateIdempotencyKey();

    const requestPayload: CreateInvoiceRequest = {
      customerId,
      siteId: siteId || null,
      invoiceDate: invoiceDate || null,
      displayFormat,
      notes: notes.trim() || null,
      lines: validPreviewLines,
      pricingFingerprint: previewData.pricingFingerprint,
      receiptComponents: recordPaymentNow
        ? paymentComponents.map((c) => ({
            method: c.method,
            amount: new Decimal(c.amount).toFixed(2),
            onlineReference: c.method === 'ONLINE' ? c.onlineReference?.trim() || null : null,
          }))
        : null,
      applyAdvanceAmount: applyAdvanceCredit ? advanceAppliedDec.toFixed(2) : null,
    };

    try {
      const createdInvoice = await invoiceApi.createInvoice(requestPayload, idempotencyKey);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.customerFinance.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dues.all });

      toastSuccess(`Invoice ${createdInvoice.invoiceNumber} created and posted successfully.`);
      setIsReviewStep(false);
      navigate(`/billing/invoices/${createdInvoice.id}`);
    } catch (err: unknown) {
      const apiErr = parseApiError(err);
      if (apiErr.code === 'TIMEOUT' || apiErr.code === 'NETWORK_ERROR') {
        setUncertainState({ idempotencyKey, requestPayload });
        setFormError('Network timeout: The invoice submission request took too long. The server outcome is uncertain. You can safely retry with the same submission key, or check the invoices list.');
      } else if (apiErr.status === 409 || apiErr.code === 'PRICING_CHANGED') {
        setFormError('Pricing conflict: Catalog prices or variant definitions changed since preview. Please review updated prices and confirm again.');
        setIsReviewStep(false);
      } else {
        setFormError(apiErr.message || 'Failed to create invoice.');
        setIsReviewStep(false);
      }
      toastError(apiErr.message || 'Invoice creation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Sales Invoice"
        subtitle="Create immediate customer bill with live pricing preview, tax split, and optional payment settlement."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/billing')}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Invoices List
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLines([emptyLine()]);
                setFormError(null);
                setApplyAdvanceCredit(false);
                setApplyAdvanceAmount('');
                setRecordPaymentNow(false);
                setPaymentComponents([{ method: 'CASH', amount: '', onlineReference: '' }]);
              }}
            >
              Reset Form
            </Button>
          </div>
        }
      />

      {formError && <ErrorMessage error={formError} />}

      {uncertainState && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            Uncertain Posting Outcome
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            The previous submission timed out before receiving a confirmation from the server.
            To avoid double billing, you may retry with the preserved idempotency key, or verify in the invoice list.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="primary"
              onClick={handleConfirmSubmit}
              isLoading={isSubmitting}
            >
              Retry Same Submission
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/billing')}
            >
              Check Invoices List
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={handleOpenReview} className="space-y-6">
        {/* Customer & Billing Header */}
        <Card>
          <div className="p-6 space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              1. Customer & Delivery Site
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <CustomerSelector
                  value={customerId}
                  onChange={handleCustomerChange}
                  label="Select Customer"
                  required
                />
              </div>

              <div>
                <CustomerSiteSelector
                  customerId={customerId}
                  value={siteId}
                  onChange={(val, s) => {
                    setSiteId(val);
                    setSelectedSite(s);
                  }}
                  label="Delivery Site (Optional)"
                  disabled={!customerId}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Invoice Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  max={todayStr}
                  required
                />
                <span className="text-[11px] text-slate-400 block mt-1">
                  Due date: <strong>{formatBusinessDate(calculatedDueDate)}</strong> (30 days)
                </span>
              </div>
            </div>

            {/* Customer Details Snapshot Banner */}
            {selectedCustomer && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex flex-wrap items-center gap-4">
                  <span>
                    Code: <strong>{selectedCustomer.customerCode}</strong>
                  </span>
                  <span>
                    Type: <Badge variant="info">{selectedCustomer.customerType}</Badge>
                  </span>
                  {selectedCustomer.phone && (
                    <span>
                      Phone: <strong>{selectedCustomer.phone}</strong>
                    </span>
                  )}
                  {selectedCustomer.gstin && (
                    <span>
                      GSTIN: <strong className="font-mono">{selectedCustomer.gstin}</strong>
                    </span>
                  )}
                </div>
                {customerSummary && (
                  <div className="flex items-center gap-3">
                    <span>
                      Current Balance:{' '}
                      <strong
                        className={
                          parseFloat(customerSummary.currentBalance) > 0
                            ? 'text-rose-700'
                            : parseFloat(customerSummary.currentBalance) < 0
                            ? 'text-teal-700'
                            : 'text-slate-600'
                        }
                      >
                        {formatInr(Math.abs(parseFloat(customerSummary.currentBalance)))}{' '}
                        {parseFloat(customerSummary.currentBalance) > 0
                          ? '(Owes)'
                          : parseFloat(customerSummary.currentBalance) < 0
                          ? '(Credit)'
                          : '(Settled)'}
                      </strong>
                    </span>
                    {availableAdvanceCredit.greaterThan(0) && (
                      <span className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-semibold">
                        Advance Credit: {formatInr(availableAdvanceCredit.toNumber())}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Display Format & Commercial Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Invoice Display Format <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <label
                    className={`flex-1 p-3 rounded-lg border cursor-pointer text-xs flex items-center justify-between transition-colors ${
                      displayFormat === 'NORMAL'
                        ? 'bg-teal-50/50 border-teal-500 text-teal-950 font-medium'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="displayFormat"
                        value="NORMAL"
                        checked={displayFormat === 'NORMAL'}
                        onChange={() => setDisplayFormat('NORMAL')}
                        className="text-teal-600 focus:ring-teal-500"
                      />
                      <span>NORMAL Format (Retail)</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Inclusive line prices</span>
                  </label>

                  <label
                    className={`flex-1 p-3 rounded-lg border cursor-pointer text-xs flex items-center justify-between transition-colors ${
                      displayFormat === 'GST'
                        ? 'bg-teal-50/50 border-teal-500 text-teal-950 font-medium'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="displayFormat"
                        value="GST"
                        checked={displayFormat === 'GST'}
                        onChange={() => setDisplayFormat('GST')}
                        className="text-teal-600 focus:ring-teal-500"
                      />
                      <span>GST Format (Tax Invoice)</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Net price + GST breakdown</span>
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  Both formats produce identical payable totals. Format affects presentation only.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Commercial Notes / Dispatch Instructions
                </label>
                <Textarea
                  placeholder="e.g. Site gate delivery instructions or PO reference"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Invoice Lines Table */}
        <Card>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  2. Bill Line Items
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select variants, enter whole-piece quantities, and review live calculated line totals.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddLine}
                leftIcon={<Plus className="w-4 h-4 text-teal-600" />}
              >
                Add Line Item
              </Button>
            </div>

            {/* Warnings from preview */}
            {previewData?.warnings && previewData.warnings.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
                {previewData.warnings.map((w, i) => (
                  <div key={i} className="flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    {w}
                  </div>
                ))}
              </div>
            )}

            {previewError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                Preview error: {parseApiError(previewError).message}
              </div>
            )}

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 w-8">#</th>
                    <th className="py-2.5 px-3 min-w-[240px]">Product Variant / SKU</th>
                    <th className="py-2.5 px-3 w-24 text-right">Qty (pcs)</th>
                    <th className="py-2.5 px-3 w-28 text-right">Unit Price (₹)</th>
                    <th className="py-2.5 px-3 w-24 text-right">Disc %</th>
                    <th className="py-2.5 px-3 w-24 text-right">GST %</th>
                    <th className="py-2.5 px-3 w-32 text-right">Line Total (₹)</th>
                    <th className="py-2.5 px-3 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((line, idx) => {
                    const previewLine = previewData?.lines[idx];

                    return (
                      <React.Fragment key={line.id}>
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-3 px-3 text-slate-400 font-mono text-center">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3">
                            <VariantSelector
                              value={line.variantId}
                              onChange={(val, variant) => handleVariantChange(idx, val, variant)}
                            />
                            {line.variant && (
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                                <span>Method: <strong>{line.variant.pricingMethod}</strong></span>
                                <span>Stock: <strong>{line.variant.quantityOnHand ?? '—'} pcs</strong></span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <Input
                              value={line.quantity}
                              onChange={(e) => handleQuantityChange(idx, e.target.value)}
                              className="text-right font-mono text-xs py-1.5"
                              placeholder="1"
                              required
                            />
                          </td>
                          <td className="py-3 px-3 text-right">
                            <Input
                              value={line.unitPriceOverride}
                              onChange={(e) => handlePriceOverrideChange(idx, e.target.value)}
                              placeholder={previewLine?.baseUnitPrice ? formatInr(parseFloat(previewLine.baseUnitPrice)) : 'Auto'}
                              className="text-right font-mono text-xs py-1.5"
                            />
                            {line.unitPriceOverride && (
                              <span className="text-[10px] text-amber-700 font-medium block mt-0.5">
                                Overridden
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <Input
                              value={line.discountPct}
                              onChange={(e) => handleDiscountChange(idx, e.target.value)}
                              placeholder={previewLine?.discountPct ? `${previewLine.discountPct}%` : '0%'}
                              className="text-right font-mono text-xs py-1.5"
                            />
                            {previewLine?.discountSource && (
                              <span className="text-[10px] text-slate-400 block mt-0.5 truncate max-w-[80px]">
                                {previewLine.discountSource}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-600">
                            {previewLine?.gstRatePct !== undefined && previewLine.gstRatePct !== null
                              ? `${previewLine.gstRatePct}%`
                              : <span className="text-slate-400 italic">Unknown</span>}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                            {previewLine
                              ? formatInr(parseFloat(previewLine.lineTotal))
                              : isPreviewFetching
                              ? '...'
                              : '₹0.00'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(idx)}
                              className="text-slate-400 hover:text-red-600 transition-colors p-1"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>

                        {/* If unit price is overridden, show inline reason requirement */}
                        {line.unitPriceOverride && (
                          <tr className="bg-amber-50/50">
                            <td colSpan={2} className="py-2 px-3 text-right text-xs text-amber-900 font-medium">
                              Override Reason <span className="text-red-500">*</span>:
                            </td>
                            <td colSpan={6} className="py-2 px-3">
                              <Input
                                value={line.overrideReason}
                                onChange={(e) => handleOverrideReasonChange(idx, e.target.value)}
                                placeholder="Mandatory explanation for manual price override (e.g. bulk contractor verbal quote)"
                                className="text-xs py-1 bg-white border-amber-300"
                                required
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        {/* Payment & Settlement at Bill Creation */}
        <Card>
          <div className="p-6 space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              3. Payment & Settlement at Creation
            </h3>

            {/* Existing Advance Application */}
            {availableAdvanceCredit.greaterThan(0) && (
              <div className="p-4 bg-teal-50/50 border border-teal-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="apply-advance-credit-chk"
                      label="Apply Customer Advance / Credit Balance"
                      checked={applyAdvanceCredit}
                      onChange={(e) => {
                        setApplyAdvanceCredit(e.target.checked);
                        if (!e.target.checked) setApplyAdvanceAmount('');
                        else handleApplyMaxAdvance();
                      }}
                    />
                  </div>
                  <span className="text-xs text-teal-800">
                    Available Advance: <strong>{formatInr(availableAdvanceCredit.toNumber())}</strong>
                  </span>
                </div>

                {applyAdvanceCredit && (
                  <div className="flex items-center gap-3 pt-2">
                    <span className="text-xs text-slate-600 font-medium">Amount to Apply (₹):</span>
                    <Input
                      value={applyAdvanceAmount}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^\d*(\.\d{0,2})?$/.test(val)) {
                          setApplyAdvanceAmount(val);
                        }
                      }}
                      placeholder="0.00"
                      className="w-36 text-right font-mono text-xs py-1 bg-white"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleApplyMaxAdvance}
                      className="text-xs py-1 h-8"
                    >
                      Max Applicable
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* New Money Tendered (CASH / ONLINE) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Checkbox
                  id="record-payment-now-chk"
                  label="Record Customer Payment Now (Cash / Online / Bank Transfer)"
                  checked={recordPaymentNow}
                  onChange={(e) => setRecordPaymentNow(e.target.checked)}
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handlePayRemainingBalance}
                  className="text-xs text-teal-700 hover:bg-teal-50"
                >
                  Pay Remaining Balance
                </Button>
              </div>

              {recordPaymentNow && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <PaymentComponentsInput
                    components={paymentComponents}
                    onChange={setPaymentComponents}
                  />
                </div>
              )}
            </div>

            {/* Live Financial Totals Breakdown Bar */}
            <div className="p-4 bg-slate-100/70 border border-slate-200 rounded-xl space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block uppercase font-semibold">Gross Subtotal:</span>
                  <span className="text-base font-bold font-mono text-slate-800">
                    {previewData ? formatInr(parseFloat(previewData.grossTotal)) : '₹0.00'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block uppercase font-semibold">Total Discount:</span>
                  <span className="text-base font-bold font-mono text-amber-700">
                    {previewData ? formatInr(parseFloat(previewData.totalDiscountAmount)) : '₹0.00'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block uppercase font-semibold">Total Tax:</span>
                  <span className="text-base font-bold font-mono text-slate-700">
                    {previewData?.totalTaxAmount ? formatInr(parseFloat(previewData.totalTaxAmount)) : '—'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block uppercase font-semibold">Net Total Payable:</span>
                  <span className="text-lg font-bold font-mono text-teal-800">
                    {formatInr(totalPayableDec.toNumber())}
                  </span>
                </div>
              </div>

              {(advanceAppliedDec.greaterThan(0) || tenderedDec.greaterThan(0)) && (
                <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between text-xs gap-3">
                  <div className="flex items-center gap-4 text-slate-600">
                    {advanceAppliedDec.greaterThan(0) && (
                      <span>Advance Applied: <strong>-{formatInr(advanceAppliedDec.toNumber())}</strong></span>
                    )}
                    {tenderedDec.greaterThan(0) && (
                      <span>Tendered Now: <strong>-{formatInr(tenderedDec.toNumber())}</strong></span>
                    )}
                  </div>
                  <div>
                    {remainingBalanceDec.greaterThan(0) ? (
                      <span className="text-rose-700 font-bold">
                        Remaining Dues (Due in 30 days): {formatInr(remainingBalanceDec.toNumber())}
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Fully Settled
                        {newAdvanceCreditDec.greaterThan(0) && (
                          <span className="ml-1 text-teal-800">
                            (+{formatInr(newAdvanceCreditDec.toNumber())} to advance credit)
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Submit Action Bar */}
        <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/billing')}
          >
            Cancel
          </Button>

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={!customerId || validPreviewLines.length === 0 || isPreviewLoading}
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              Review & Post Invoice
            </Button>
          </div>
        </div>
      </form>

      {/* Review Confirmation Modal */}
      {isReviewStep && previewData && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                <h3 className="text-lg font-bold text-slate-900">Confirm & Post Sales Invoice</h3>
              </div>
              <Badge variant={displayFormat === 'GST' ? 'info' : 'neutral'}>
                {displayFormat} FORMAT
              </Badge>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg">
                <div>
                  <span className="text-slate-400 block uppercase font-medium">Customer:</span>
                  <span className="text-sm font-bold text-slate-900">{previewData.customerName}</span>
                  {selectedSite && (
                    <span className="text-slate-500 block mt-0.5">Site: {selectedSite.siteName}</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-medium">Invoice Date:</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {formatBusinessDate(invoiceDate)} (Due: {formatBusinessDate(calculatedDueDate)})
                  </span>
                </div>
              </div>

              {/* Items Summary */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="p-2">Item</th>
                      <th className="p-2 text-right">Qty</th>
                      <th className="p-2 text-right">Net Price</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData.lines.map((l, i) => (
                      <tr key={i}>
                        <td className="p-2 font-medium text-slate-800">
                          {l.productName} ({l.sizeLabel})
                        </td>
                        <td className="p-2 text-right font-mono">{l.quantity} pcs</td>
                        <td className="p-2 text-right font-mono">{formatInr(parseFloat(l.unitNetPrice))}</td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900">
                          {formatInr(parseFloat(l.lineTotal))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Summary */}
              <div className="p-3 bg-slate-50 rounded-lg space-y-1.5 font-medium">
                <div className="flex justify-between text-slate-700">
                  <span>Gross Total:</span>
                  <span className="font-mono">{formatInr(parseFloat(previewData.grossTotal))}</span>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>Discount:</span>
                  <span className="font-mono">-{formatInr(parseFloat(previewData.totalDiscountAmount))}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-bold text-sm pt-1 border-t border-slate-200">
                  <span>Total Payable:</span>
                  <span className="font-mono text-teal-800">{formatInr(totalPayableDec.toNumber())}</span>
                </div>
                {advanceAppliedDec.greaterThan(0) && (
                  <div className="flex justify-between text-teal-700">
                    <span>Applied Existing Advance:</span>
                    <span className="font-mono">-{formatInr(advanceAppliedDec.toNumber())}</span>
                  </div>
                )}
                {tenderedDec.greaterThan(0) && (
                  <div className="flex justify-between text-teal-700">
                    <span>Tendered Payment Now:</span>
                    <span className="font-mono">-{formatInr(tenderedDec.toNumber())}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-900 font-bold pt-1 border-t border-slate-200">
                  <span>Remaining Outstanding Balance:</span>
                  <span className={remainingBalanceDec.greaterThan(0) ? 'text-rose-700 font-mono' : 'text-emerald-700'}>
                    {remainingBalanceDec.greaterThan(0) ? formatInr(remainingBalanceDec.toNumber()) : '₹0.00 (Fully Settled)'}
                  </span>
                </div>
                {newAdvanceCreditDec.greaterThan(0) && (
                  <div className="flex justify-between text-teal-800 font-semibold">
                    <span>Excess Overpayment Credited to Advance:</span>
                    <span className="font-mono">+{formatInr(newAdvanceCreditDec.toNumber())}</span>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-400 italic">
                Posting this invoice immediately deducts stock from inventory and appends a transaction to the customer ledger.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsReviewStep(false)}
                disabled={isSubmitting}
              >
                Go Back & Edit
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleConfirmSubmit}
                isLoading={isSubmitting}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Confirm & Post Invoice
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateInvoicePage;

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Calculator,
  Plus,
  Trash2,
  AlertTriangle,
  Info,
  DollarSign,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import { variantApi } from '../../api/catalog.api';
import { pricingApi } from '../../api/pricing.api';
import { queryKeys } from '../../api/queryKeys';
import { useAuth } from '../../hooks/useAuth';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { MoneyDisplay } from '../../components/ui/MoneyDisplay';
import { QuantityDisplay } from '../../components/ui/QuantityDisplay';
import {
  PricingPreviewLineRequest,
  PricingPreviewResponse,
} from '../../types/pricing.types';
import { PricingMethod } from '../../types/catalog.types';
import { ApiError } from '../../types/api.types';

interface BuilderLine {
  id: string; // Client-side row key
  variantId: string;
  quantity: string;
  unitPriceOverride: string;
  discountPct: string;
  overrideReason: string;
}

const emptyLine = (): BuilderLine => ({
  id: Math.random().toString(36).substring(2, 9),
  variantId: '',
  quantity: '1',
  unitPriceOverride: '',
  discountPct: '',
  overrideReason: '',
});

export const PricingPreviewPage: React.FC = () => {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  const [lines, setLines] = useState<BuilderLine[]>([emptyLine()]);
  const [calculationResult, setCalculationResult] = useState<PricingPreviewResponse | null>(null);
  const [calculationError, setCalculationError] = useState<string | null>(null);

  // Fetch all active variants to select from
  const { data: variantsData, isLoading: isVariantsLoading } = useQuery({
    queryKey: queryKeys.variants.list({ size: 100, isActive: true }),
    queryFn: ({ signal }) => variantApi.getVariants({ size: 100, isActive: true }, signal),
  });

  // Calculate mutation
  const calculateMutation = useMutation({
    mutationFn: (reqLines: PricingPreviewLineRequest[]) =>
      pricingApi.calculatePreview({ lines: reqLines }),
    onSuccess: (data) => {
      setCalculationResult(data);
      setCalculationError(null);
    },
    onError: (err: ApiError) => {
      setCalculationError(err.message || 'Pricing calculation failed. Please check inputs.');
      setCalculationResult(null);
    },
  });

  const handleAddLine = () => {
    setLines([...lines, emptyLine()]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length === 1) {
      setLines([emptyLine()]);
      setCalculationResult(null);
      return;
    }
    const next = [...lines];
    next.splice(index, 1);
    setLines(next);
  };

  const handleUpdateLine = (index: number, field: keyof BuilderLine, value: string) => {
    const next = [...lines];
    next[index] = { ...next[index], [field]: value };
    setLines(next);
  };

  const handleReset = () => {
    setLines([emptyLine()]);
    setCalculationResult(null);
    setCalculationError(null);
  };

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    setCalculationError(null);

    // Validate lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.variantId) {
        setCalculationError(`Line ${i + 1}: Please select a product variant`);
        return;
      }
      const qty = parseInt(line.quantity, 10);
      if (isNaN(qty) || qty < 1) {
        setCalculationError(`Line ${i + 1}: Quantity must be at least 1`);
        return;
      }
      if (line.discountPct && (isNaN(Number(line.discountPct)) || Number(line.discountPct) < 0 || Number(line.discountPct) > 100)) {
        setCalculationError(`Line ${i + 1}: Discount % must be between 0 and 100`);
        return;
      }
      if (line.unitPriceOverride && (isNaN(Number(line.unitPriceOverride)) || Number(line.unitPriceOverride) < 0)) {
        setCalculationError(`Line ${i + 1}: Unit price override must be a positive amount`);
        return;
      }
    }

    const payload: PricingPreviewLineRequest[] = lines.map((l) => ({
      variantId: l.variantId,
      quantity: parseInt(l.quantity, 10),
      unitPriceOverride: l.unitPriceOverride.trim() ? l.unitPriceOverride.trim() : undefined,
      discountPct: l.discountPct.trim() ? l.discountPct.trim() : undefined,
      overrideReason: l.overrideReason.trim() ? l.overrideReason.trim() : undefined,
    }));

    calculateMutation.mutate(payload);
  };

  const renderPricingBadge = (method: PricingMethod) => {
    switch (method) {
      case 'MRP_DISCOUNT':
        return <Badge variant="info">MRP Discount</Badge>;
      case 'COST_PLUS':
        return <Badge variant="default">Cost Plus</Badge>;
      case 'FIXED':
        return <Badge variant="warning">Fixed Price</Badge>;
      default:
        return <Badge variant="neutral">{method}</Badge>;
    }
  };

  const renderDiscountSourceBadge = (source: string) => {
    switch (source) {
      case 'CATEGORY_SALES_DISCOUNT':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-100 text-teal-800">
            Category Rate
          </span>
        );
      case 'EXPLICIT_LINE_OVERRIDE':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
            Line Override
          </span>
        );
      default:
        return <span className="text-[11px] text-slate-400">None</span>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pricing Calculator & Preview"
        subtitle="Test real-time pricing rules, category sales discounts, manual price overrides, and GST tax breakdowns"
      />

      {/* Read-only simulation disclaimer */}
      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
        <div className="text-xs text-teal-900 space-y-1">
          <p className="font-semibold text-teal-950">
            Read-Only Price Simulation Tool
          </p>
          <p className="text-teal-800">
            This tool evaluates products against the backend pricing engine. It accurately resolves Category Sales Discounts for MRP items, computes Cost-Plus formulas, and enforces zero-discount validation on Fixed-Price items.
            <strong> It does not generate invoices, commit sales orders, or modify inventory stock.</strong>
          </p>
        </div>
      </div>

      {/* Line Builder Form */}
      <form onSubmit={handleCalculate} className="space-y-4">
        <Card>
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-slate-600" />
              <h2 className="text-sm font-bold text-slate-900">Line Items to Calculate</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                Reset
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddLine}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Item
              </Button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {calculationError && <ErrorMessage error={calculationError} />}

            <div className="space-y-3">
              {lines.map((line, index) => {
                const selectedVariant = variantsData?.data.find((v) => v.id === line.variantId);

                return (
                  <div
                    key={line.id}
                    className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Item #{index + 1}
                      </span>
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(index)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                          aria-label={`Remove Item ${index + 1}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
                      {/* Variant Selector */}
                      <div className="lg:col-span-5">
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                          Product Variant <span className="text-red-500">*</span>
                        </label>
                        <Select
                          value={line.variantId}
                          onChange={(e) => handleUpdateLine(index, 'variantId', e.target.value)}
                          options={[
                            { value: '', label: isVariantsLoading ? 'Loading variants...' : 'Select SKU / Variant...' },
                            ...(variantsData?.data.map((v) => ({
                              value: v.id,
                              label: `[${v.sku}] ${v.productName} - ${v.sizeLabel} (${v.pricingMethod})`,
                            })) || []),
                          ]}
                          required
                        />
                      </div>

                      {/* Quantity */}
                      <div className="lg:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                          Qty (pcs) <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={line.quantity}
                          onChange={(e) => handleUpdateLine(index, 'quantity', e.target.value)}
                          required
                        />
                      </div>

                      {/* Unit Price Override */}
                      <div className="lg:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                          Price Override (₹)
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.unitPriceOverride}
                          onChange={(e) => handleUpdateLine(index, 'unitPriceOverride', e.target.value)}
                          placeholder="Default"
                        />
                      </div>

                      {/* Discount % Override */}
                      <div className="lg:col-span-3">
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                          Discount % Override
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={line.discountPct}
                          onChange={(e) => handleUpdateLine(index, 'discountPct', e.target.value)}
                          placeholder={
                            selectedVariant?.pricingMethod === 'FIXED'
                              ? 'Prohibited for FIXED'
                              : 'Auto / Category rate'
                          }
                          disabled={selectedVariant?.pricingMethod === 'FIXED'}
                        />
                      </div>
                    </div>

                    {/* Override Reason (visible if override provided) */}
                    {(line.unitPriceOverride || line.discountPct) && (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                          Override Reason / Note
                        </label>
                        <Input
                          value={line.overrideReason}
                          onChange={(e) => handleUpdateLine(index, 'overrideReason', e.target.value)}
                          placeholder="e.g. Promotional rate, contractor discount"
                        />
                      </div>
                    )}

                    {/* Live item info hint */}
                    {selectedVariant && (
                      <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-3 pt-1 border-t border-slate-200/60">
                        <span>
                          Method: <strong>{selectedVariant.pricingMethod}</strong>
                        </span>
                        {selectedVariant.mrpInclTax && (
                          <span>
                            MRP: <strong>₹{selectedVariant.mrpInclTax}</strong> (Incl. GST)
                          </span>
                        )}
                        {selectedVariant.fixedPriceInclTax && (
                          <span>
                            Fixed Price: <strong>₹{selectedVariant.fixedPriceInclTax}</strong> (No discounts)
                          </span>
                        )}
                        {selectedVariant.purchaseCostExclTax && (
                          <span>
                            Cost: <strong>₹{selectedVariant.purchaseCostExclTax}</strong> (+{selectedVariant.profitPct}% profit)
                          </span>
                        )}
                        <span>
                          GST: <strong>{selectedVariant.gstRatePct ? `${selectedVariant.gstRatePct}%` : 'Unknown'}</strong>
                        </span>
                        <span>
                          Stock On Hand: <strong>{selectedVariant.quantityOnHand} pcs</strong>
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddLine}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Another Item
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={calculateMutation.isPending}
                leftIcon={<Calculator className="w-4 h-4" />}
              >
                Calculate Pricing
              </Button>
            </div>
          </div>
        </Card>
      </form>

      {/* Calculation Results Section */}
      {calculationResult && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Top Warnings Banner if applicable */}
          {calculationResult.warnings && calculationResult.warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1">
              <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Calculation Notices & Warnings
              </div>
              <ul className="list-disc list-inside text-xs text-amber-800 space-y-0.5">
                {calculationResult.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Totals Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 border-slate-200">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Gross Line Total
              </span>
              <span className="text-xl font-bold text-slate-800 mt-1 block">
                <MoneyDisplay amount={calculationResult.grossTotal} />
              </span>
              <span className="text-[11px] text-slate-500">Before category/line discounts</span>
            </Card>

            <Card className="p-4 border-slate-200">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Taxable Base Value
              </span>
              <span className="text-xl font-bold text-slate-800 mt-1 block">
                {calculationResult.taxBreakdownAvailable && calculationResult.totalTaxableAmount ? (
                  <MoneyDisplay amount={calculationResult.totalTaxableAmount} />
                ) : (
                  <span className="text-sm font-medium text-amber-600">GST Rate Missing</span>
                )}
              </span>
              <span className="text-[11px] text-slate-500">Net price excl. GST</span>
            </Card>

            <Card className="p-4 border-slate-200">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Total GST (CGST + SGST)
              </span>
              <span className="text-xl font-bold text-slate-800 mt-1 block">
                {calculationResult.taxBreakdownAvailable && calculationResult.totalTaxAmount ? (
                  <MoneyDisplay amount={calculationResult.totalTaxAmount} />
                ) : (
                  <span className="text-sm font-medium text-amber-600">Unavailable</span>
                )}
              </span>
              <span className="text-[11px] text-slate-500">Computed from GST rates</span>
            </Card>

            <Card className="p-4 bg-teal-900 text-white border-teal-800">
              <span className="text-xs font-semibold text-teal-300 uppercase tracking-wider block">
                Net Payable Total
              </span>
              <span className="text-2xl font-black text-white mt-1 block">
                <MoneyDisplay amount={calculationResult.grossTotal} />
              </span>
              <span className="text-[11px] text-teal-200">All discounts applied (Incl. GST)</span>
            </Card>
          </div>

          {/* Line Items Results Table */}
          <Card>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-teal-700" />
                <h3 className="text-sm font-bold text-slate-900">Line-by-Line Price Resolution</h3>
              </div>
              <span className="text-xs text-slate-500">
                {calculationResult.lines.length} {calculationResult.lines.length === 1 ? 'line' : 'lines'} calculated
              </span>
            </div>

            <div className="overflow-x-auto">
              <Table ariaLabel="Price calculation lines">
                <TableHeader>
                  <TableRow>
                    <TableHead align="left">Product & SKU</TableHead>
                    <TableHead align="left">Method</TableHead>
                    <TableHead align="right">Qty</TableHead>
                    <TableHead align="right">Base Price</TableHead>
                    <TableHead align="left">Discount Applied</TableHead>
                    <TableHead align="right">Unit Net (Incl.)</TableHead>
                    <TableHead align="right">Line Total</TableHead>
                    <TableHead align="right">GST Breakdown</TableHead>
                    {isOwner && <TableHead align="right">Estimated Profit</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calculationResult.lines.map((line, idx) => (
                    <TableRow key={idx}>
                      <TableCell align="left">
                        <div className="font-semibold text-slate-900 text-xs">{line.productName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {line.sku} &bull; {line.sizeLabel}
                        </div>
                      </TableCell>

                      <TableCell align="left">{renderPricingBadge(line.pricingMethod)}</TableCell>

                      <TableCell align="right" className="font-medium text-slate-800">
                        <QuantityDisplay quantity={line.quantity} />
                      </TableCell>

                      <TableCell align="right" className="text-slate-600">
                        <MoneyDisplay amount={line.baseInclusivePrice} />
                      </TableCell>

                      <TableCell align="left">
                        <div className="space-y-0.5">
                          <div className="text-xs font-semibold text-slate-800">
                            {Number(line.discountPct) > 0 ? `${line.discountPct}%` : '0%'}
                          </div>
                          <div>{renderDiscountSourceBadge(line.discountSource)}</div>
                        </div>
                      </TableCell>

                      <TableCell align="right" className="font-medium text-slate-800">
                        <MoneyDisplay amount={line.unitNetInclusive} />
                      </TableCell>

                      <TableCell align="right" className="font-bold text-slate-900">
                        <MoneyDisplay amount={line.lineTotal} />
                      </TableCell>

                      <TableCell align="right" className="text-xs">
                        {line.taxBreakdownAvailable && line.taxableAmount && line.taxAmount ? (
                          <div>
                            <div className="text-slate-700">
                              Taxable: <MoneyDisplay amount={line.taxableAmount} />
                            </div>
                            <div className="text-slate-500 text-[11px]">
                              GST ({line.gstRatePct}%): <MoneyDisplay amount={line.taxAmount} />
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-600">Tax rate unknown</span>
                        )}
                      </TableCell>

                      {isOwner && (
                        <TableCell align="right">
                          {line.costAvailable && line.profitAmount ? (
                            <span className="text-xs font-bold text-emerald-700">
                              +<MoneyDisplay amount={line.profitAmount} />
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">Cost unavailable</span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PricingPreviewPage;

import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  CreditCard,
  Download,
  RefreshCw,
  Clock,
  Layers,
  MapPin,
  Phone,
  CheckCircle2,
  Edit3,
  RotateCcw,
  FileText,
  History,
  Eye,
} from 'lucide-react';
import { invoiceApi, customerFinanceApi, invoiceRevisionApi, customerReturnApi } from '../../api/billing.api';
import { queryKeys } from '../../api/queryKeys';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import { CustomerReceiptModal } from '../../components/billing/CustomerReceiptModal';
import { CustomerAllocationModal } from '../../components/billing/CustomerAllocationModal';
import { InvoiceRevisionModal } from '../../components/billing/InvoiceRevisionModal';
import { InvoiceRevisionDetailModal } from '../../components/billing/InvoiceRevisionDetailModal';
import { CustomerReturnModal } from '../../components/billing/CustomerReturnModal';
import { InvoiceRevisionResponseDto } from '../../types/billing.types';
import { useToast } from '../../hooks/useToast';
import { formatInr, formatBusinessDate } from '../../utils/formatters';

export const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { error: toastError } = useToast();

  // Active Tab: 'lines' | 'revisions' | 'returns' | 'allocations'
  const [activeTab, setActiveTab] = useState<'lines' | 'revisions' | 'returns' | 'allocations'>('lines');

  // Modal States
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedRevisionForDetail, setSelectedRevisionForDetail] = useState<InvoiceRevisionResponseDto | null>(null);

  // Download loading states
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [downloadingRevPdfId, setDownloadingRevPdfId] = useState<string | null>(null);
  const [downloadingReturnPdfId, setDownloadingReturnPdfId] = useState<string | null>(null);

  // Fetch Invoice Details
  const {
    data: invoice,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.invoices.detail(id || ''),
    queryFn: ({ signal }) => invoiceApi.getInvoiceById(id || '', signal),
    enabled: !!id,
  });

  // Fetch Revisions for this Invoice
  const {
    data: revisionsData,
    isLoading: isRevisionsLoading,
    refetch: refetchRevisions,
  } = useQuery({
    queryKey: queryKeys.invoiceRevisions.list(id || ''),
    queryFn: ({ signal }) => invoiceRevisionApi.getRevisions(id || '', signal),
    enabled: !!id,
  });

  // Fetch Customer Returns for this Invoice
  const {
    data: returnsData,
    isLoading: isReturnsLoading,
    refetch: refetchReturns,
  } = useQuery({
    queryKey: queryKeys.customerReturns.listByInvoice(id || ''),
    queryFn: ({ signal }) => customerReturnApi.getReturnsByInvoice(id || '', signal),
    enabled: !!id,
  });

  const handleDownloadInvoicePdf = async () => {
    if (!invoice) return;
    setIsDownloadingPdf(true);
    try {
      const blob = await invoiceApi.downloadInvoicePdf(invoice.id, invoice.displayFormat);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toastError('Failed to download invoice PDF.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadReceiptPdf = async (receiptId: string, receiptNumber: string) => {
    try {
      const blob = await customerFinanceApi.downloadReceiptPdf(receiptId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${receiptNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toastError('Failed to download receipt PDF.');
    }
  };

  const handleDownloadRevisionPdf = async (revisionId: string, revisionNumber: number) => {
    if (!invoice) return;
    setDownloadingRevPdfId(revisionId);
    try {
      const blob = await invoiceRevisionApi.downloadRevisionPdf(invoice.id, revisionId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoiceNumber}-rev${revisionNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toastError('Failed to download revision PDF.');
    } finally {
      setDownloadingRevPdfId(null);
    }
  };

  const handleDownloadReturnPdf = async (returnId: string, returnNumber: string) => {
    setDownloadingReturnPdfId(returnId);
    try {
      const blob = await customerReturnApi.downloadReturnPdf(returnId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${returnNumber}-credit-note.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toastError('Failed to download return credit note PDF.');
    } finally {
      setDownloadingReturnPdfId(null);
    }
  };

  const handleRefreshAll = () => {
    refetch();
    refetchRevisions();
    refetchReturns();
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <TableSkeleton columns={6} rows={6} />
      </div>
    );
  }

  if (isError || !invoice) {
    return (
      <div className="p-8">
        <ErrorMessage
          error={error}
          title="Sales invoice not found"
          onRetry={() => navigate('/billing')}
        />
      </div>
    );
  }

  const outstandingNum = parseFloat(invoice.outstandingAmount || '0');
  const effectivePayableNum = parseFloat(invoice.effectivePayableAmount || invoice.totalPayableAmount || '0');
  const originalPayableNum = parseFloat(invoice.originalPayableAmount || invoice.totalPayableAmount || '0');
  const totalAllocatedNum = parseFloat(invoice.totalAllocatedAmount || '0');
  const totalReturnedNum = parseFloat(invoice.totalReturnedAmount || '0');
  const revisionDeltaNum = effectivePayableNum - (originalPayableNum - totalReturnedNum);

  // Check if any items remain returnable
  const hasReturnableItems = invoice.lines.some(
    (l) => (l.remainingReturnableQuantity !== undefined ? l.remainingReturnableQuantity : l.quantity - (l.returnedQuantity || 0)) > 0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={invoice.invoiceNumber}
        subtitle={`Posted on ${formatBusinessDate(invoice.invoiceDate)} • Original Due: ${formatBusinessDate(invoice.dueDate)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/billing')}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              All Invoices
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              isLoading={isFetching}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRevisionModalOpen(true)}
              leftIcon={<Edit3 className="w-4 h-4 text-amber-600" />}
              title="Make bill corrections (creates a versioned revision)"
            >
              Edit Bill
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsReturnModalOpen(true)}
              leftIcon={<RotateCcw className="w-4 h-4 text-blue-600" />}
              disabled={!hasReturnableItems}
              title={hasReturnableItems ? 'Record customer goods return' : 'All items already returned'}
            >
              Record Return
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAllocationModalOpen(true)}
              leftIcon={<Layers className="w-4 h-4 text-teal-600" />}
              disabled={outstandingNum <= 0}
            >
              Apply Credit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsReceiptModalOpen(true)}
              leftIcon={<CreditCard className="w-4 h-4 text-teal-600" />}
              disabled={outstandingNum <= 0}
            >
              Record Receipt
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDownloadInvoicePdf}
              isLoading={isDownloadingPdf}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Download PDF ({invoice.displayFormat})
            </Button>
          </div>
        }
      />

      {/* Invoice Overview & Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Effective Payable */}
        <Card className="p-5 border-l-4 border-l-teal-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Effective Payable
            </span>
            {invoice.revisionCount > 0 && (
              <Badge variant="warning" className="text-[10px]">
                Rev #{invoice.revisionCount}
              </Badge>
            )}
          </div>
          <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">
            {formatInr(effectivePayableNum)}
          </span>
          <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-1">
            <span>Original: {formatInr(originalPayableNum)}</span>
            {invoice.revisionCount > 0 && (
              <span className={`font-mono font-medium ${revisionDeltaNum >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                ({revisionDeltaNum >= 0 ? '+' : ''}{formatInr(revisionDeltaNum)})
              </span>
            )}
          </div>
        </Card>

        {/* Returns & Deductions */}
        <Card className={`p-5 border-l-4 ${totalReturnedNum > 0 ? 'border-l-blue-600' : 'border-l-slate-300'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Total Returned
            </span>
            {totalReturnedNum > 0 && (
              <Badge variant="info" className="text-[10px]">
                Credit Applied
              </Badge>
            )}
          </div>
          <span className={`text-2xl font-bold font-mono mt-1 block ${totalReturnedNum > 0 ? 'text-blue-700' : 'text-slate-600'}`}>
            {formatInr(totalReturnedNum)}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">
            {returnsData && returnsData.length > 0 ? `${returnsData.length} return record(s)` : 'No goods returned'}
          </span>
        </Card>

        {/* Total Allocated / Paid */}
        <Card className="p-5 border-l-4 border-l-emerald-600">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Total Allocated / Paid
          </span>
          <span className="text-2xl font-bold font-mono text-emerald-700 mt-1 block">
            {formatInr(totalAllocatedNum)}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">
            {invoice.allocations.length} receipt/advance allocation(s)
          </span>
        </Card>

        {/* Outstanding Balance */}
        <Card className={`p-5 border-l-4 ${outstandingNum > 0 ? 'border-l-rose-600' : 'border-l-emerald-500'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Outstanding Balance
            </span>
            <Badge
              variant={
                invoice.settlementStatus === 'PAID'
                  ? 'success'
                  : invoice.settlementStatus === 'PARTIALLY_PAID'
                  ? 'warning'
                  : 'neutral'
              }
            >
              {invoice.settlementStatus}
            </Badge>
          </div>
          <span className={`text-2xl font-bold font-mono mt-1 block ${outstandingNum > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
            {formatInr(outstandingNum)}
          </span>
          <div className="text-xs mt-1 flex items-center justify-between">
            {outstandingNum === 0 ? (
              <span className="text-emerald-700 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Fully Settled
              </span>
            ) : (
              <span className="text-rose-700 font-medium">Payment pending</span>
            )}
            {invoice.isOverdue && outstandingNum > 0 && (
              <span className="inline-flex items-center gap-1 font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded text-[10px]">
                <Clock className="w-3 h-3" /> Overdue {invoice.daysOverdue}d
              </span>
            )}
          </div>
        </Card>
      </div>

      {/* Customer Snapshot & Delivery Site */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Customer & Delivery Site Details
          </h3>
          <Link
            to={`/customers/${invoice.customerId}`}
            className="text-xs font-semibold text-teal-700 hover:text-teal-800 underline"
          >
            View Customer Profile & Ledger &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="space-y-1.5">
            <span className="text-slate-400 uppercase font-semibold">Billed Customer:</span>
            <div className="text-sm font-bold text-slate-900">{invoice.customerName}</div>
            {invoice.customerPhone && (
              <div className="flex items-center gap-1.5 text-slate-600">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{invoice.customerPhone}</span>
              </div>
            )}
            {invoice.customerGstin && (
              <div className="text-slate-600 font-mono">GSTIN: {invoice.customerGstin}</div>
            )}
            {invoice.customerAddress && (
              <div className="text-slate-500 leading-relaxed">{invoice.customerAddress}</div>
            )}
          </div>

          <div className="space-y-1.5">
            <span className="text-slate-400 uppercase font-semibold">Delivery Site:</span>
            {invoice.siteName ? (
              <>
                <div className="text-sm font-semibold text-slate-900">{invoice.siteName}</div>
                {invoice.siteAddress && (
                  <div className="flex items-start gap-1.5 text-slate-500 leading-relaxed">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{invoice.siteAddress}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-slate-400 italic">No specific site (Direct counter sale)</div>
            )}

            {invoice.notes && (
              <div className="pt-2">
                <span className="text-slate-400 uppercase font-semibold block">Notes:</span>
                <p className="text-slate-600 italic">{invoice.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Strip */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8" aria-label="Invoice Detail Tabs">
          <button
            type="button"
            onClick={() => setActiveTab('lines')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === 'lines'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            Active Items ({invoice.lines.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('revisions')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === 'revisions'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <History className="w-4 h-4" />
            Revision History ({revisionsData?.length ?? invoice.revisionCount ?? 0})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('returns')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === 'returns'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            Returns History ({returnsData?.length ?? 0})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('allocations')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === 'allocations'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Payments & Allocations ({invoice.allocations.length})
          </button>
        </nav>
      </div>

      {/* Tab 1: Active Lines */}
      {activeTab === 'lines' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Itemized Lines ({invoice.lines.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Current active bill items, returned quantities, and effective price breakdowns.
              </p>
            </div>
            <Badge variant={invoice.taxBreakdownAvailable ? 'success' : 'neutral'}>
              {invoice.taxBreakdownAvailable ? 'Tax Breakdown Available' : 'Tax Breakdown Incomplete'}
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>SKU & Description</TableHead>
                  <TableHead>Pricing Method</TableHead>
                  <TableHead className="text-right">Invoiced Qty</TableHead>
                  <TableHead className="text-right">Returned</TableHead>
                  <TableHead className="text-right">Net Qty</TableHead>
                  <TableHead className="text-right">Unit Price (₹)</TableHead>
                  <TableHead className="text-right">Disc %</TableHead>
                  <TableHead className="text-right">GST %</TableHead>
                  <TableHead className="text-right">Line Total (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.lines.map((line, idx) => {
                  const retQty = line.returnedQuantity || 0;
                  const netQty = line.quantity - retQty;
                  return (
                    <TableRow key={line.id} className="hover:bg-slate-50/70">
                      <TableCell className="text-slate-400 font-mono text-center">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-900">{line.productName}</div>
                        <div className="font-mono text-xs text-slate-500">
                          {line.sku} &bull; {line.sizeLabel}
                        </div>
                        {line.isPriceOverridden && (
                          <span className="text-[10px] text-amber-700 italic block mt-0.5">
                            Price Override: {line.overrideReason || 'Authorized'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="neutral">{line.pricingMethod}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-slate-800">
                        {line.quantity} pcs
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {retQty > 0 ? (
                          <span className="text-amber-700 font-semibold">-{retQty} pcs</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-slate-900">
                        {netQty} pcs
                      </TableCell>
                      <TableCell className="text-right font-mono text-slate-700">
                        {formatInr(parseFloat(line.baseUnitPrice))}
                      </TableCell>
                      <TableCell className="text-right font-mono text-slate-700">
                        {parseFloat(line.discountPct) > 0 ? `${line.discountPct}%` : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-slate-700">
                        {line.gstRatePct ? `${line.gstRatePct}%` : <span className="text-slate-400 italic">—</span>}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-slate-900">
                        {formatInr(parseFloat(line.lineTotal))}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Totals Summary Footer */}
          <div className="p-6 bg-slate-50/70 border-t border-slate-200">
            <div className="max-w-xs ml-auto space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Excl Tax):</span>
                <span className="font-mono">{invoice.subtotalExclTax ? formatInr(parseFloat(invoice.subtotalExclTax)) : '—'}</span>
              </div>
              <div className="flex justify-between text-amber-700">
                <span>Total Discount:</span>
                <span className="font-mono">-{formatInr(parseFloat(invoice.totalDiscountAmount))}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total GST:</span>
                <span className="font-mono">{invoice.totalGstAmount ? formatInr(parseFloat(invoice.totalGstAmount)) : '—'}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-medium pt-1 border-t border-slate-200">
                <span>Invoiced Payable:</span>
                <span className="font-mono">{formatInr(parseFloat(invoice.totalPayableAmount))}</span>
              </div>
              {totalReturnedNum > 0 && (
                <div className="flex justify-between text-blue-700 font-medium">
                  <span>Less Goods Returned:</span>
                  <span className="font-mono">-{formatInr(totalReturnedNum)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-900 font-bold text-sm pt-2 border-t border-slate-300">
                <span>Effective Payable Amount:</span>
                <span className="font-mono text-teal-800">{formatInr(effectivePayableNum)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Revision History */}
      {activeTab === 'revisions' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Invoice Revision History
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete audit trail of corrections. Every revision preserves historical data and tracks inventory/ledger adjustments.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRevisionModalOpen(true)}
              leftIcon={<Edit3 className="w-4 h-4 text-amber-600" />}
            >
              New Revision
            </Button>
          </div>

          {isRevisionsLoading ? (
            <TableSkeleton columns={6} rows={3} />
          ) : !revisionsData || revisionsData.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              No revisions have been created for this invoice. The bill remains in its original form.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="px-4 py-2.5">Rev #</th>
                    <th className="px-4 py-2.5">Date & Time</th>
                    <th className="px-4 py-2.5">Correction Reason</th>
                    <th className="px-4 py-2.5 text-right">Previous (₹)</th>
                    <th className="px-4 py-2.5 text-right">New Payable (₹)</th>
                    <th className="px-4 py-2.5 text-right">Delta (₹)</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {revisionsData.map((rev) => {
                    const deltaNum = parseFloat(rev.deltaPayableAmount);
                    return (
                      <tr key={rev.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2.5 font-bold font-mono text-teal-800">
                          Rev #{rev.revisionNumber}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">
                          {formatBusinessDate(rev.createdAt)}
                        </td>
                        <td className="px-4 py-2.5 text-slate-800 max-w-xs truncate" title={rev.reason}>
                          {rev.reason}
                          {parseFloat(rev.releasedAllocationAmount || '0') > 0 && (
                            <span className="text-[10px] text-teal-700 block">
                              Released {formatInr(parseFloat(rev.releasedAllocationAmount))} to customer credit
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-600">
                          {formatInr(parseFloat(rev.previousTotalPayable))}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">
                          {formatInr(parseFloat(rev.newTotalPayable))}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold">
                          <span className={deltaNum >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                            {deltaNum >= 0 ? '+' : ''}{formatInr(deltaNum)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedRevisionForDetail(rev)}
                              className="text-xs px-2 py-1 h-7 text-slate-700 hover:bg-slate-100"
                              leftIcon={<Eye className="w-3.5 h-3.5" />}
                            >
                              Diff
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadRevisionPdf(rev.id, rev.revisionNumber)}
                              isLoading={downloadingRevPdfId === rev.id}
                              className="text-xs px-2 py-1 h-7 text-teal-700 hover:bg-teal-50"
                              leftIcon={<Download className="w-3.5 h-3.5" />}
                            >
                              PDF
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Customer Returns */}
      {activeTab === 'returns' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Customer Returns & Credit Notes
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Returned items restore inventory and reduce effective customer bill obligations without arbitrary age limits.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsReturnModalOpen(true)}
              disabled={!hasReturnableItems}
              leftIcon={<RotateCcw className="w-4 h-4 text-blue-600" />}
            >
              Record Return
            </Button>
          </div>

          {isReturnsLoading ? (
            <TableSkeleton columns={6} rows={3} />
          ) : !returnsData || returnsData.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              <RotateCcw className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              No customer returns recorded for this invoice.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="px-4 py-2.5">Return #</th>
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Valuation Policy</th>
                    <th className="px-4 py-2.5">Reason</th>
                    <th className="px-4 py-2.5 text-right">Items Returned</th>
                    <th className="px-4 py-2.5 text-right">Credit Amount (₹)</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {returnsData.map((ret) => {
                    const totalPieces = ret.lines.reduce((acc, l) => acc + l.returnedQuantity, 0);
                    const valuation = ret.lines[0]?.valuationBasis || '—';
                    return (
                      <tr key={ret.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2.5 font-bold font-mono text-blue-800">
                          {ret.returnNumber}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">
                          {formatBusinessDate(ret.returnDate)}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge variant="neutral" className="text-[10px]">
                            {valuation === 'ORIGINAL_INVOICE_PRICE' ? 'Original Price' : valuation === 'LATEST_REVISED_PRICE' ? 'Latest Revised' : valuation}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-slate-800 max-w-xs truncate" title={ret.reason}>
                          {ret.reason}
                          {parseFloat(ret.releasedAllocationAmount || '0') > 0 && (
                            <span className="text-[10px] text-teal-700 block">
                              Released {formatInr(parseFloat(ret.releasedAllocationAmount))} to advance
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-700">
                          {totalPieces} pcs ({ret.lines.length} lines)
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-blue-800">
                          {formatInr(parseFloat(ret.totalReturnAmount))}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadReturnPdf(ret.id, ret.returnNumber)}
                            isLoading={downloadingReturnPdfId === ret.id}
                            className="text-xs px-2 py-1 h-7 text-blue-700 hover:bg-blue-50"
                            leftIcon={<Download className="w-3.5 h-3.5" />}
                          >
                            Credit Note
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Receipts & Settlement Allocations */}
      {activeTab === 'allocations' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Payment & Settlement History
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Receipt vouchers and advance credit applied directly to this invoice.
              </p>
            </div>
            {outstandingNum > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReceiptModalOpen(true)}
                leftIcon={<CreditCard className="w-4 h-4 text-teal-600" />}
              >
                Record Payment
              </Button>
            )}
          </div>

          {invoice.allocations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              No payments or advance credit have been allocated to this invoice yet.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="px-4 py-2.5">Receipt #</th>
                    <th className="px-4 py-2.5">Allocated On</th>
                    <th className="px-4 py-2.5 text-right">Allocated Amount (₹)</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.allocations.map((alloc) => (
                    <tr key={alloc.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-2.5 font-medium text-slate-900">
                        {alloc.receiptNumber}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {formatBusinessDate(alloc.createdAt)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-teal-700">
                        {formatInr(parseFloat(alloc.allocatedAmount))}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadReceiptPdf(alloc.receiptId, alloc.receiptNumber)}
                          className="text-xs px-2 py-1 h-7 text-teal-700 hover:bg-teal-50"
                          leftIcon={<Download className="w-3.5 h-3.5" />}
                        >
                          Receipt PDF
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Customer Receipt Modal */}
      {isReceiptModalOpen && (
        <CustomerReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          customer={{ id: invoice.customerId, name: invoice.customerName }}
          preselectedInvoiceId={invoice.id}
          onSuccess={handleRefreshAll}
        />
      )}

      {/* Customer Allocation Modal */}
      {isAllocationModalOpen && (
        <CustomerAllocationModal
          isOpen={isAllocationModalOpen}
          onClose={() => setIsAllocationModalOpen(false)}
          customer={{ id: invoice.customerId, name: invoice.customerName }}
          preselectedInvoiceId={invoice.id}
          onSuccess={handleRefreshAll}
        />
      )}

      {/* Invoice Revision Modal */}
      {isRevisionModalOpen && (
        <InvoiceRevisionModal
          isOpen={isRevisionModalOpen}
          onClose={() => setIsRevisionModalOpen(false)}
          invoice={invoice}
          onSuccess={handleRefreshAll}
        />
      )}

      {/* Customer Return Modal */}
      {isReturnModalOpen && (
        <CustomerReturnModal
          isOpen={isReturnModalOpen}
          onClose={() => setIsReturnModalOpen(false)}
          invoice={invoice}
          onSuccess={handleRefreshAll}
        />
      )}

      {/* Invoice Revision Detail (Diff) Modal */}
      {selectedRevisionForDetail && (
        <InvoiceRevisionDetailModal
          isOpen={!!selectedRevisionForDetail}
          onClose={() => setSelectedRevisionForDetail(null)}
          invoiceId={invoice.id}
          revision={selectedRevisionForDetail}
        />
      )}
    </div>
  );
};

export default InvoiceDetailPage;

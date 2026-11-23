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
} from 'lucide-react';
import { invoiceApi, customerFinanceApi } from '../../api/billing.api';
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
import { useToast } from '../../hooks/useToast';
import { formatInr, formatBusinessDate } from '../../utils/formatters';

export const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { error: toastError } = useToast();

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

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

  const outstandingNum = parseFloat(invoice.outstandingAmount);
  const totalPayableNum = parseFloat(invoice.totalPayableAmount);
  const totalAllocatedNum = parseFloat(invoice.totalAllocatedAmount);

  return (
    <div className="space-y-6">
      <PageHeader
        title={invoice.invoiceNumber}
        subtitle={`Posted on ${formatBusinessDate(invoice.invoiceDate)} • Due: ${formatBusinessDate(invoice.dueDate)}`}
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
              onClick={() => refetch()}
              isLoading={isFetching}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Refresh
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5 border-l-4 border-l-teal-600">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Total Payable
          </span>
          <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">
            {formatInr(totalPayableNum)}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">
            Format: <strong>{invoice.displayFormat}</strong>
          </span>
        </Card>

        <Card className="p-5 border-l-4 border-l-emerald-600">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Total Allocated / Paid
          </span>
          <span className="text-2xl font-bold font-mono text-emerald-700 mt-1 block">
            {formatInr(totalAllocatedNum)}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">
            Receipts & credit applied
          </span>
        </Card>

        <Card className={`p-5 border-l-4 ${outstandingNum > 0 ? 'border-l-rose-600' : 'border-l-slate-400'}`}>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Outstanding Balance
          </span>
          <span className={`text-2xl font-bold font-mono mt-1 block ${outstandingNum > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
            {formatInr(outstandingNum)}
          </span>
          <span className="text-xs mt-1 block font-medium">
            {outstandingNum === 0 ? (
              <span className="text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Fully Settled
              </span>
            ) : (
              <span className="text-rose-700">Payment pending</span>
            )}
          </span>
        </Card>

        <Card className="p-5 border-l-4 border-l-amber-500">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Settlement & Due Date
          </span>
          <div className="mt-2 flex items-center gap-2">
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
            {invoice.isOverdue && outstandingNum > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                <Clock className="w-3.5 h-3.5" /> Overdue {invoice.daysOverdue}d
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400 mt-2 block">
            Due on: <strong>{formatBusinessDate(invoice.dueDate)}</strong>
          </span>
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

      {/* Bill Lines Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Line Items ({invoice.lines.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Historical bill lines and prices locked at invoice creation.
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
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price (₹)</TableHead>
                <TableHead className="text-right">Disc %</TableHead>
                <TableHead className="text-right">GST %</TableHead>
                <TableHead className="text-right">Taxable (₹)</TableHead>
                <TableHead className="text-right">GST (₹)</TableHead>
                <TableHead className="text-right">Line Total (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.lines.map((line, idx) => (
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
                  <TableCell className="text-right font-mono text-slate-700">
                    {formatInr(parseFloat(line.baseUnitPrice))}
                  </TableCell>
                  <TableCell className="text-right font-mono text-slate-700">
                    {parseFloat(line.discountPct) > 0 ? `${line.discountPct}%` : '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-slate-700">
                    {line.gstRatePct ? `${line.gstRatePct}%` : <span className="text-slate-400 italic">—</span>}
                  </TableCell>
                  <TableCell className="text-right font-mono text-slate-700">
                    {line.taxableAmount ? formatInr(parseFloat(line.taxableAmount)) : '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-slate-700">
                    {line.taxAmount ? formatInr(parseFloat(line.taxAmount)) : '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-slate-900">
                    {formatInr(parseFloat(line.lineTotal))}
                  </TableCell>
                </TableRow>
              ))}
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
            <div className="flex justify-between text-slate-900 font-bold text-sm pt-2 border-t border-slate-200">
              <span>Total Payable Amount:</span>
              <span className="font-mono text-teal-800">{formatInr(totalPayableNum)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Receipts & Settlement Allocations Sub-table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Payment & Settlement History
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Receipt vouchers and advance credit applied to this invoice.
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
          <div className="p-6 text-center text-xs text-slate-500">
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

      {/* Customer Receipt Modal */}
      {isReceiptModalOpen && (
        <CustomerReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          customer={{ id: invoice.customerId, name: invoice.customerName }}
          preselectedInvoiceId={invoice.id}
          onSuccess={() => refetch()}
        />
      )}

      {/* Customer Allocation Modal */}
      {isAllocationModalOpen && (
        <CustomerAllocationModal
          isOpen={isAllocationModalOpen}
          onClose={() => setIsAllocationModalOpen(false)}
          customer={{ id: invoice.customerId, name: invoice.customerName }}
          preselectedInvoiceId={invoice.id}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
};

export default InvoiceDetailPage;

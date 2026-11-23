import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Truck,
  ArrowLeft,
  RotateCcw,
  CreditCard,
  Download,
  RefreshCw,
  Building2,
} from 'lucide-react';
import { purchaseApi } from '../../api/purchase.api';
import { queryKeys } from '../../api/queryKeys';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { PurchaseReturnModal } from '../../components/purchases/PurchaseReturnModal';
import { formatInr, formatBusinessDate, formatDateTime } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';

export const PurchaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { error: toastError } = useToast();

  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const {
    data: purchase,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.purchases.detail(id || ''),
    queryFn: ({ signal }) => purchaseApi.getPurchaseById(id || '', signal),
    enabled: !!id,
  });

  // Fetch returns for this purchase
  const { data: returnsData } = useQuery({
    queryKey: queryKeys.purchases.returns(id || ''),
    queryFn: ({ signal }) => purchaseApi.getReturnsForPurchase(id || '', 0, 50, signal),
    enabled: !!id,
  });

  const handleDownloadPdf = async () => {
    if (!purchase) return;
    setIsDownloadingPdf(true);
    try {
      const blob = await purchaseApi.downloadPurchasePdf(purchase.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${purchase.purchaseNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toastError('Failed to download purchase PDF document.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-500">
        <Truck className="w-8 h-8 animate-pulse text-teal-600 mx-auto mb-2" />
        <p className="text-sm font-medium">Loading purchase invoice details...</p>
      </div>
    );
  }

  if (isError || !purchase) {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/purchases')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Purchases
        </Button>
        <ErrorMessage
          error={(error as Error)?.message || 'Purchase invoice not found.'}
        />
      </div>
    );
  }

  const isSettled = parseFloat(purchase.outstandingBalance) === 0;
  const hasRemainingReturns = purchase.lines.some((l) => l.remainingQuantity > 0);
  const returns = returnsData?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${purchase.purchaseNumber}`}
        subtitle={`Vendor Bill: ${purchase.supplierInvoiceNumber || 'None'} • Date: ${formatBusinessDate(
          purchase.purchaseDate
        )} • Supplier: ${purchase.supplierName}`}
        badge={
          <Badge variant={purchase.status === 'POSTED' ? 'success' : 'danger'}>
            {purchase.status}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              leftIcon={
                isDownloadingPdf ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )
              }
            >
              Print / PDF
            </Button>

            {purchase.status === 'POSTED' && hasRemainingReturns && (
              <Button
                variant="outline"
                size="md"
                onClick={() => setIsReturnModalOpen(true)}
                leftIcon={<RotateCcw className="w-4 h-4" />}
              >
                Record Return
              </Button>
            )}

            <Button
              variant="primary"
              size="md"
              onClick={() => navigate(`/suppliers/${purchase.supplierId}?tab=payments`)}
              leftIcon={<CreditCard className="w-4 h-4" />}
            >
              Supplier Account
            </Button>
          </div>
        }
      />

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Payable */}
        <Card className="p-4 border-slate-200">
          <div className="text-xs text-slate-500 font-medium mb-1">Total Payable Amount</div>
          <div className="text-2xl font-bold text-slate-900">
            {formatInr(purchase.totalPayableAmount)}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Subtotal: {formatInr(purchase.subtotalExclTax)} • GST: {formatInr(purchase.totalGstAmount)}
          </div>
        </Card>

        {/* Total Allocated */}
        <Card className="p-4 border-slate-200">
          <div className="text-xs text-slate-500 font-medium mb-1">Allocated / Paid</div>
          <div className="text-2xl font-bold text-emerald-700">
            {formatInr(purchase.totalAllocatedAmount)}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Discounts: {formatInr(purchase.totalDiscountAmount)}
          </div>
        </Card>

        {/* Outstanding Balance */}
        <Card className="p-4 border-slate-200">
          <div className="text-xs text-slate-500 font-medium mb-1">Outstanding Balance</div>
          <div
            className={`text-2xl font-bold ${
              isSettled ? 'text-slate-600' : 'text-red-700'
            }`}
          >
            {formatInr(purchase.outstandingBalance)}
          </div>
          <div className="mt-2">
            <Badge variant={isSettled ? 'success' : 'danger'}>
              {isSettled ? 'Fully Settled' : 'Payment Due'}
            </Badge>
          </div>
        </Card>

        {/* Audit Version */}
        <Card className="p-4 border-slate-200">
          <div className="text-xs text-slate-500 font-medium mb-1">Document Snapshot</div>
          <div className="text-sm font-semibold text-slate-800">
            Version: <span className="font-mono text-teal-700">v{purchase.version}</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Created: {formatDateTime(purchase.createdAt)}
          </div>
        </Card>
      </div>

      {/* SUPPLIER DETAILS CARD */}
      <Card className="p-5 border-slate-200 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-teal-700" />
            Supplier Details
          </h3>
          <Link
            to={`/suppliers/${purchase.supplierId}`}
            className="text-xs text-teal-700 hover:text-teal-900 font-medium hover:underline"
          >
            View Full Supplier Profile →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Supplier Name</p>
            <p className="font-medium text-slate-900 mt-0.5">{purchase.supplierName}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Contact / Phone</p>
            <p className="font-medium text-slate-900 mt-0.5">{purchase.supplierContact || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">GSTIN</p>
            <p className="font-mono text-slate-900 mt-0.5">{purchase.supplierGstin || 'Unregistered'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Vendor Bill Reference</p>
            <p className="font-mono text-slate-900 mt-0.5">{purchase.supplierInvoiceNumber || '—'}</p>
          </div>
        </div>

        {purchase.notes && (
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-600">
            <span className="font-semibold text-slate-700">Notes: </span>
            {purchase.notes}
          </div>
        )}
      </Card>

      {/* PURCHASE LINES TABLE */}
      <Card className="border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">
            Inward Lines ({purchase.lines.length})
          </h3>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Product / Variant SKU</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Returned</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead>Price Basis</TableHead>
              <TableHead className="text-right">Entered Rate</TableHead>
              <TableHead className="text-right">Disc %</TableHead>
              <TableHead className="text-right">GST %</TableHead>
              <TableHead className="text-right">Gross Rate</TableHead>
              <TableHead className="text-right">Line Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchase.lines.map((l) => (
              <TableRow key={l.id} className="text-xs hover:bg-slate-50/50">
                <TableCell className="text-slate-400 font-mono">{l.lineIndex}</TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    <span className="font-mono font-semibold bg-slate-100 px-1 py-0.5 rounded text-slate-900">
                      {l.sku}
                    </span>
                    <span className="ml-1.5 font-medium text-slate-800">
                      {l.productName} ({l.sizeLabel})
                    </span>
                    {l.updateProductCost && (
                      <span className="ml-2 text-[10px] text-teal-800 bg-teal-50 px-1 py-0.5 rounded border border-teal-200">
                        Updated Master Cost
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right font-bold text-slate-900">{l.quantity} pcs</TableCell>
                <TableCell className="text-right text-slate-500">{l.returnedQuantity} pcs</TableCell>
                <TableCell className="text-right font-medium text-slate-900">{l.remainingQuantity} pcs</TableCell>
                <TableCell className="text-slate-600 font-medium">{l.priceBasis}</TableCell>
                <TableCell className="text-right font-mono">{formatInr(l.enteredUnitPrice)}</TableCell>
                <TableCell className="text-right">{l.discountPct}%</TableCell>
                <TableCell className="text-right">{l.gstRatePct ? `${l.gstRatePct}%` : '—'}</TableCell>
                <TableCell className="text-right font-mono text-slate-700">
                  {formatInr(l.grossUnitCost)}
                </TableCell>
                <TableCell className="text-right font-bold text-slate-900">
                  {formatInr(l.lineTotal)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* PURCHASE RETURNS SUB-TABLE */}
      {returns.length > 0 && (
        <Card className="border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-purple-700" />
              Purchase Returns / Debit Notes ({returns.length})
            </h3>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Return #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Total Return Value</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returns.map((ret) => (
                <TableRow key={ret.id} className="text-xs hover:bg-slate-50/50">
                  <TableCell className="font-mono font-bold text-purple-700">
                    {ret.returnNumber}
                  </TableCell>
                  <TableCell>{formatBusinessDate(ret.returnDate)}</TableCell>
                  <TableCell className="text-slate-600 max-w-xs truncate" title={ret.reason}>
                    {ret.reason}
                  </TableCell>
                  <TableCell className="text-right font-bold text-slate-900">
                    {formatInr(ret.totalReturnAmount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        const blob = await purchaseApi.downloadPurchaseReturnPdf(ret.id);
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${ret.returnNumber}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                      }}
                      className="text-xs text-slate-600 hover:text-slate-900"
                    >
                      Debit Note PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* RETURN MODAL */}
      <PurchaseReturnModal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        purchase={purchase}
        onSuccess={() => {
          refetch();
        }}
      />
    </div>
  );
};

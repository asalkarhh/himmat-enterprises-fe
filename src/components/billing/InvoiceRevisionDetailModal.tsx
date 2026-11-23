import React, { useState } from 'react';
import { Download, Clock } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { invoiceRevisionApi } from '../../api/billing.api';
import { InvoiceRevisionResponseDto } from '../../types/billing.types';
import { formatInr, formatBusinessDate } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';

export interface InvoiceRevisionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string | number;
  revision: InvoiceRevisionResponseDto | null;
}

export const InvoiceRevisionDetailModal: React.FC<InvoiceRevisionDetailModalProps> = ({
  isOpen,
  onClose,
  invoiceId,
  revision,
}) => {
  const { error: toastError } = useToast();
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  if (!revision) return null;

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const blob = await invoiceRevisionApi.downloadRevisionPdf(invoiceId, revision.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${revision.invoiceNumber}_Rev_${revision.revisionNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toastError('Failed to download invoice revision statement PDF.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const deltaPayableNum = parseFloat(revision.deltaPayableAmount);
  const releasedAllocNum = parseFloat(revision.releasedAllocationAmount);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Revision #${revision.revisionNumber} — ${revision.invoiceNumber}`}
      size="xl"
    >
      <div className="space-y-6">
        {/* Revision Metadata Banner */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="font-mono">
                Revision #{revision.revisionNumber}
              </Badge>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatBusinessDate(revision.createdAt)}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              isLoading={isDownloadingPdf}
              leftIcon={<Download className="w-4 h-4 text-teal-600" />}
            >
              Download Revision PDF
            </Button>
          </div>

          <div className="text-xs space-y-1">
            <span className="font-semibold text-slate-700">Audit Reason:</span>
            <p className="text-slate-800 bg-white p-2 rounded border border-slate-200">
              {revision.reason}
            </p>
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-2">
            <div>
              <span className="text-slate-500 block">Previous Total:</span>
              <span className="font-mono font-bold text-slate-800">
                {formatInr(revision.previousTotalPayable)}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block">New Total Payable:</span>
              <span className="font-mono font-bold text-teal-700">
                {formatInr(revision.newTotalPayable)}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block">Delta Payable:</span>
              <span
                className={`font-mono font-bold ${
                  deltaPayableNum < 0
                    ? 'text-emerald-700'
                    : deltaPayableNum > 0
                    ? 'text-rose-700'
                    : 'text-slate-600'
                }`}
              >
                {deltaPayableNum > 0 ? `+${formatInr(deltaPayableNum)}` : formatInr(deltaPayableNum)}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block">Released Allocation:</span>
              <span className="font-mono font-bold text-slate-900">
                {releasedAllocNum > 0 ? formatInr(releasedAllocNum) : '₹0.00'}
              </span>
            </div>
          </div>
        </div>

        {/* Lines Diff Breakdown */}
        <div>
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
            Itemized Line Modifications
          </h4>

          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2">Change</th>
                  <th className="px-3 py-2">Product / Variant</th>
                  <th className="px-3 py-2 text-center">Quantity Diff</th>
                  <th className="px-3 py-2 text-right">Unit Price</th>
                  <th className="px-3 py-2 text-right">Line Total Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {revision.lines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2">
                      <Badge
                        variant={
                          line.changeType === 'ADDED'
                            ? 'success'
                            : line.changeType === 'REMOVED'
                            ? 'danger'
                            : line.changeType === 'MODIFIED'
                            ? 'warning'
                            : 'neutral'
                        }
                        className="text-[10px]"
                      >
                        {line.changeType}
                      </Badge>
                    </td>

                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900">{line.productName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {line.sku} ({line.sizeLabel})
                      </div>
                      {line.overrideReason && (
                        <div className="text-[10px] text-amber-700 italic mt-0.5">
                          Override: {line.overrideReason}
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-2 text-center font-mono">
                      {line.previousQuantity} &rarr; {line.newQuantity}
                      {line.deltaQuantity !== 0 && (
                        <span
                          className={`ml-1 text-[11px] font-bold ${
                            line.deltaQuantity > 0 ? 'text-amber-700' : 'text-emerald-700'
                          }`}
                        >
                          ({line.deltaQuantity > 0 ? `+${line.deltaQuantity}` : line.deltaQuantity})
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-2 text-right font-mono text-slate-700">
                      {line.previousUnitNetPrice === line.newUnitNetPrice ? (
                        formatInr(line.newUnitNetPrice)
                      ) : (
                        <span>
                          <span className="line-through text-slate-400 mr-1">
                            {formatInr(line.previousUnitNetPrice)}
                          </span>
                          {formatInr(line.newUnitNetPrice)}
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-2 text-right font-mono font-semibold">
                      {formatInr(line.newLineTotal)}
                      {parseFloat(line.deltaLineTotal) !== 0 && (
                        <span
                          className={`block text-[10px] ${
                            parseFloat(line.deltaLineTotal) > 0 ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {parseFloat(line.deltaLineTotal) > 0
                            ? `+${formatInr(parseFloat(line.deltaLineTotal))}`
                            : formatInr(parseFloat(line.deltaLineTotal))}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-end pt-3 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default InvoiceRevisionDetailModal;

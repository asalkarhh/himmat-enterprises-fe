import React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  TrendingUp,
  ShoppingBag,
  Boxes,
  DollarSign,
  ShieldCheck,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { SalesReportView } from '../../components/reports/SalesReportView';
import { PurchaseReportView } from '../../components/reports/PurchaseReportView';
import { InventoryReportView } from '../../components/reports/InventoryReportView';
import { CashMovementReportView } from '../../components/reports/CashMovementReportView';
import { ProfitReportView } from '../../components/reports/ProfitReportView';
import { useAuth } from '../../hooks/useAuth';

type ReportTab = 'sales' | 'purchases' | 'inventory' | 'cash-movements' | 'profit';

export const ReportsHubPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isOwner, hasPermission } = useAuth();
  const isAuthorizedForProfit = isOwner || hasPermission('REPORT:PROFIT');

  const tabParam = searchParams.get('tab') as ReportTab;
  const activeTab: ReportTab =
    tabParam && ['sales', 'purchases', 'inventory', 'cash-movements', 'profit'].includes(tabParam)
      ? tabParam
      : 'sales';

  const handleTabChange = (tab: ReportTab) => {
    // Preserve other search params if any, but replace tab
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tab);
    setSearchParams(newParams);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Reports & Analytics"
        subtitle="Operational reports, tax breakdown, stock valuation, and verified financial audit metrics."
      />

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-2 sm:space-x-4 overflow-x-auto pb-1" aria-label="Tabs">
          <button
            onClick={() => handleTabChange('sales')}
            className={`flex items-center gap-2 whitespace-nowrap py-3 px-3.5 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'sales'
                ? 'border-teal-600 text-teal-700 bg-teal-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>Sales Activity</span>
          </button>

          <button
            onClick={() => handleTabChange('purchases')}
            className={`flex items-center gap-2 whitespace-nowrap py-3 px-3.5 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'purchases'
                ? 'border-teal-600 text-teal-700 bg-teal-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Purchases & Inward</span>
          </button>

          <button
            onClick={() => handleTabChange('inventory')}
            className={`flex items-center gap-2 whitespace-nowrap py-3 px-3.5 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'inventory'
                ? 'border-teal-600 text-teal-700 bg-teal-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Boxes className="h-4 w-4" />
            <span>Inventory & Valuations</span>
          </button>

          <button
            onClick={() => handleTabChange('cash-movements')}
            className={`flex items-center gap-2 whitespace-nowrap py-3 px-3.5 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'cash-movements'
                ? 'border-teal-600 text-teal-700 bg-teal-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <DollarSign className="h-4 w-4" />
            <span>Cash Movements</span>
          </button>

          {isAuthorizedForProfit && (
            <button
              onClick={() => handleTabChange('profit')}
              className={`flex items-center gap-2 whitespace-nowrap py-3 px-3.5 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'profit'
                  ? 'border-teal-600 text-teal-700 bg-teal-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <ShieldCheck className="h-4 w-4 text-teal-700" />
              <span>Owner Profit & Margins</span>
            </button>
          )}
        </nav>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'sales' && <SalesReportView />}
        {activeTab === 'purchases' && <PurchaseReportView />}
        {activeTab === 'inventory' && <InventoryReportView />}
        {activeTab === 'cash-movements' && <CashMovementReportView />}
        {activeTab === 'profit' && <ProfitReportView />}
      </div>
    </div>
  );
};

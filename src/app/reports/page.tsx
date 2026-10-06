'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Printer,
  Download,
  Calendar,
  Users,
  Clock,
  IndianRupee,
  Layers,
} from 'lucide-react';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<
    'customer-balance' | 'daily-transactions' | 'making-charges' | 'outstanding'
  >('customer-balance');

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReport = () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    params.append('type', reportType);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    fetch(`/api/reports?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setReportData(data))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, dateFrom, dateTo]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-amber-700" />
            Jewellery Workshop Reports
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Balances, daily audit, making charges, and pending work statements
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition"
        >
          <Printer className="w-4 h-4" />
          <span>Print Report</span>
        </button>
      </div>

      {/* Report Tabs (Section 16) */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-2 sm:grid-cols-4 gap-2 no-print">
        <button
          onClick={() => setReportType('customer-balance')}
          className={`py-2 px-3 text-xs font-bold rounded-xl transition text-center ${
            reportType === 'customer-balance'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Customer Balances
        </button>

        <button
          onClick={() => setReportType('outstanding')}
          className={`py-2 px-3 text-xs font-bold rounded-xl transition text-center ${
            reportType === 'outstanding'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Outstanding Work (&gt;0g)
        </button>

        <button
          onClick={() => setReportType('daily-transactions')}
          className={`py-2 px-3 text-xs font-bold rounded-xl transition text-center ${
            reportType === 'daily-transactions'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Daily Transactions
        </button>

        <button
          onClick={() => setReportType('making-charges')}
          className={`py-2 px-3 text-xs font-bold rounded-xl transition text-center ${
            reportType === 'making-charges'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Making Charges Billed
        </button>
      </div>

      {/* Date Range Filter for Daily / Making Reports */}
      {(reportType === 'daily-transactions' || reportType === 'making-charges') && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3 no-print text-xs">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="font-bold text-slate-700">Filter Range:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
          />
          <span>to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
          />
        </div>
      )}

      {/* Report Table Card */}
      <div className="print-page bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-black text-slate-900 uppercase tracking-wider">
              {reportType === 'customer-balance'
                ? 'Customer Karat Balance Report'
                : reportType === 'outstanding'
                ? 'Outstanding Gold Work Report (Balance > 0g)'
                : reportType === 'daily-transactions'
                ? 'Daily Transaction Journal'
                : 'Making Charges & Payment Status Report'}
            </h2>
            <p className="text-xs text-slate-500">
              Penta Chool Works • Generated {new Date().toLocaleDateString('en-IN')}
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400">
            {reportData?.rows?.length || 0} Records
          </span>
        </div>

        {/* 1 & 2. Customer Balance / Outstanding Report */}
        {(reportType === 'customer-balance' || reportType === 'outstanding') && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Karat</th>
                  <th className="py-2.5 px-3 text-right">Total IN (g)</th>
                  <th className="py-2.5 px-3 text-right">Total OUT (g)</th>
                  <th className="py-2.5 px-3 text-right">Settled (g)</th>
                  <th className="py-2.5 px-4 text-right font-black text-slate-800">
                    Current Balance (g)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Generating report...
                    </td>
                  </tr>
                ) : reportData?.rows?.length > 0 ? (
                  reportData.rows.map((r: any, idx: number) => {
                    const bal = parseFloat(r.currentBalance);
                    return (
                      <tr key={r.customerId && r.karatId ? `${r.customerId}-${r.karatId}-${idx}` : `balance-row-${idx}`} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {r.customerName}
                          {r.shopName && (
                            <span className="block text-[10px] text-slate-400 font-normal">
                              {r.shopName}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono">{r.phone}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-700">{r.karatName}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                          {r.totalIn}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-blue-700">
                          {r.totalOut}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-amber-800">
                          {r.totalSettlement}
                        </td>
                        <td
                          className={`py-2.5 px-4 text-right font-mono font-black text-sm ${
                            bal > 0 ? 'text-amber-950 font-bold' : 'text-slate-700'
                          }`}
                        >
                          {r.currentBalance} g
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
              {/* Bottom Totals (Section 16) */}
              {reportData?.totals && (
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-slate-300 font-black text-xs text-slate-900">
                    <td colSpan={3} className="py-3 px-3 uppercase tracking-wider">
                      Grand Totals ({reportData.totals.rowCount} accounts)
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-800">
                      {reportData.totals.totalIn} g
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-blue-800">
                      {reportData.totals.totalOut} g
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-amber-900">
                      {reportData.totals.totalSettlement} g
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-sm text-slate-950">
                      {reportData.totals.currentBalance} g
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* 3. Daily Transaction Report */}
        {reportType === 'daily-transactions' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Karat</th>
                  <th className="py-2.5 px-3 text-right">IN (g)</th>
                  <th className="py-2.5 px-3 text-right">OUT (g)</th>
                  <th className="py-2.5 px-3 text-right">Settlement (g)</th>
                  <th className="py-2.5 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Loading daily transactions...
                    </td>
                  </tr>
                ) : reportData?.rows?.length > 0 ? (
                  reportData.rows.map((r: any, idx: number) => (
                    <tr key={r.id ? `${r.id}-${idx}` : `daily-row-${idx}`} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                        {new Date(r.date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{r.customerName}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-700">{r.karatName}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                        {r.inWeight !== '0.000' ? r.inWeight : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-blue-700">
                        {r.outWeight !== '0.000' ? r.outWeight : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-800">
                        {r.settleWeight !== '0.000' ? r.settleWeight : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">{r.notes || '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No transactions recorded.
                    </td>
                  </tr>
                )}
              </tbody>
              {reportData?.totals && (
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-slate-300 font-black text-xs text-slate-900">
                    <td colSpan={3} className="py-3 px-3 uppercase tracking-wider">
                      Journal Totals
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-800">
                      {reportData.totals.totalIn} g
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-blue-800">
                      {reportData.totals.totalOut} g
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-amber-900">
                      {reportData.totals.totalSettlement} g
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* 4. Making Charges Report */}
        {reportType === 'making-charges' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Settlement #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Karat</th>
                  <th className="py-2.5 px-3 text-right">Chargeable Wt</th>
                  <th className="py-2.5 px-3 text-right">Rate</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-right">Paid</th>
                  <th className="py-2.5 px-3 text-right">Pending</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      Loading making charges report...
                    </td>
                  </tr>
                ) : reportData?.rows?.length > 0 ? (
                  reportData.rows.map((r: any, idx: number) => (
                    <tr key={r.id ? `${r.id}-${idx}` : `making-row-${idx}`} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                        {r.settlementNumber}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono whitespace-nowrap">
                        {new Date(r.settlementDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{r.customerName}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-700">{r.karatName}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{r.chargeableWeight}g</td>
                      <td className="py-2.5 px-3 text-right font-mono">₹{r.rate}/g</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{r.makingAmount}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                        ₹{r.paid}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono font-bold ${
                          parseFloat(r.pending) > 0 ? 'text-red-600' : 'text-slate-700'
                        }`}
                      >
                        ₹{r.pending}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.paymentStatus === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.paymentStatus === 'PARTIAL'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {r.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      No making records found.
                    </td>
                  </tr>
                )}
              </tbody>
              {reportData?.totals && (
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-slate-300 font-black text-xs text-slate-900">
                    <td colSpan={4} className="py-3 px-3 uppercase tracking-wider">
                      Making Bill Totals
                    </td>
                    <td className="py-3 px-3 text-right font-mono">
                      {reportData.totals.totalChargeableWeight} g
                    </td>
                    <td></td>
                    <td className="py-3 px-3 text-right font-mono">
                      ₹{reportData.totals.totalMakingAmount}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-800">
                      ₹{reportData.totals.totalPaid}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-red-700">
                      ₹{reportData.totals.totalPending}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

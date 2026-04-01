"use client";

import type { Invoice } from "@/lib/app-data-types";
import { 
  getInvoiceStatusColor, 
  getInvoiceStatusLabel, 
  getInvoiceTypeLabel, 
  getOverdueLevelLabel,
  formatCurrency 
} from "@/lib/app-utils";
import { Receipt, Calendar, User, Tag, AlertTriangle, CheckCircle2, Clock, Send } from "lucide-react";

interface Props {
  invoices: Invoice[];
}

export default function InvoiceStatusTable({ invoices }: Props) {
  return (
    <div className="bg-navy-900 border border-border rounded-2xl overflow-hidden animate-fade-in shadow-xl">
      <div className="px-6 py-4 border-b border-border bg-navy-800/30 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Receipt size={20} className="text-gold-400" />
            Invoice Tracking Hub
          </h2>
          <p className="text-sm text-foreground-muted mt-0.5">
            ติดตามสถานะการชำระเงินของลูกค้าทุกประเภท (ค่าบริการ & งบโฆษณา)
          </p>
        </div>
        <div className="flex bg-navy-950 p-1 rounded-xl border border-border/50">
          <div className="px-3 py-1 flex items-center gap-1.5 text-[10px] font-bold text-red-400 border-r border-border/50">
            <AlertTriangle size={12} />
            OVERDUE: {invoices.filter(i => i.status === 'overdue').length}
          </div>
          <div className="px-3 py-1 flex items-center gap-1.5 text-[10px] font-bold text-blue-400">
            <Send size={12} />
            PENDING: {invoices.filter(i => i.status === 'sent').length}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-navy-950/50 text-foreground-muted border-b border-border uppercase tracking-widest text-[10px] font-bold">
              <th className="px-6 py-4">Invoice #</th>
              <th className="px-6 py-4">Client Name</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4 text-right">Amount</th>
              <th className="px-6 py-4">Due Date</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4">Escalation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-navy-800/40 transition-colors group">
                <td className="px-6 py-4">
                  <p className="font-mono text-xs font-bold text-foreground group-hover:text-gold-400 transition-colors">
                    {invoice.invoiceNumber}
                  </p>
                  <p className="text-[10px] text-foreground-muted mt-0.5">Issue: {new Date(invoice.issueDate).toLocaleDateString("th-TH")}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-navy-800 flex items-center justify-center text-xs border border-border/50">
                      🏥
                    </div>
                    <span className="font-medium text-foreground">{invoice.clientName}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-navy-800 text-foreground-muted border border-border/50">
                      {getInvoiceTypeLabel(invoice.type)}
                    </span>
                  </div>
                  <p className="text-[10px] text-foreground-muted mt-1 italic truncate max-w-[150px]">{invoice.notes}</p>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="font-bold text-foreground font-mono">
                    {formatCurrency(invoice.amount)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className={`flex items-center gap-1.5 text-xs ${invoice.status === 'overdue' ? 'text-red-400 font-bold' : 'text-foreground-muted'}`}>
                    <Calendar size={12} />
                    {new Date(invoice.dueDate).toLocaleDateString("th-TH")}
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${getInvoiceStatusColor(invoice.status)}`}>
                    {invoice.status === 'paid' && <CheckCircle2 size={10} />}
                    {invoice.status === 'overdue' && <AlertTriangle size={10} />}
                    {invoice.status === 'sent' && <Clock size={10} />}
                    {getInvoiceStatusLabel(invoice.status).toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {invoice.status === 'overdue' ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-red-500 font-bold animate-pulse">
                        {getOverdueLevelLabel(invoice.overdueEscalation)}
                      </span>
                      <div className="w-full h-1 bg-navy-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-red-500" 
                          style={{ 
                            width: invoice.overdueEscalation === 'day30' ? '100%' : 
                                   invoice.overdueEscalation === 'day14' ? '75%' : 
                                   invoice.overdueEscalation === 'day7' ? '50%' : '25%' 
                          }} 
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-[10px] text-foreground-muted italic">— ปกติ</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="px-6 py-3 bg-navy-950/30 border-t border-border flex justify-between items-center text-[11px] text-foreground-muted italic">
        <p>* ระบบจะขยับระดับ Escalation อัตโนมัติทุก 3:00 น.</p>
        <div className="flex items-center gap-4 uppercase tracking-widest font-bold">
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> ชำระแล้ว: {formatCurrency(invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0))}</span>
          <span className="flex items-center gap-1 text-red-400"><div className="w-2 h-2 rounded-full bg-red-500" /> ค้างชำระ: {formatCurrency(invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0))}</span>
        </div>
      </div>
    </div>
  );
}

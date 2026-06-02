import React, { useMemo } from 'react';
import type { AdsMetric } from "@/lib/app-data-types";
import { MessageCircle, Users, Eye, Target } from "lucide-react";

interface GlobalAdItem {
  adName: string; thumbnailUrl: string; mediaType: string;
  spend: number; impressions: number; clicks: number; inbox: number;
  leads: number; cpi: number; cpl: number; ctr: number;
}

interface ExportReportTemplateProps {
  pageId: string;
  pageName: string;
  since: string;
  until: string;
  metrics: AdsMetric[];
}

// Helpers
const thb = (val: number) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
const num = (val: number) => new Intl.NumberFormat("en-US").format(val);
const pct = (val: number) => `${val.toFixed(1)}%`;

// Colors map for inline styles to avoid Tailwind v4 oklab() crashes in html2canvas
const colors = {
  bgBase: '#0d1520',
  bgCard: '#111d2e',
  bgCardAlt: 'rgba(17, 29, 46, 0.8)',
  textMain: '#ffffff',
  textMuted: 'rgba(255,255,255,0.5)',
  textDim: 'rgba(255,255,255,0.3)',
  borderMain: 'rgba(255,255,255,0.1)',
  borderDim: 'rgba(255,255,255,0.05)',
  gold: '#e8b84b',
  rose: '#fb7185',
  blue: '#60a5fa',
  cyan: '#22d3ee',
  purple: '#c084fc'
};

export default function ExportReportTemplate({ pageId, pageName, since, until, metrics }: ExportReportTemplateProps) {
  // Aggregate KPIs
  const kpis = useMemo(() => {
    const spend = metrics.reduce((a, c) => a + c.spend, 0);
    const impressions = metrics.reduce((a, c) => a + c.impressions, 0);
    const inbox = metrics.reduce((a, c) => a + c.inbox, 0);
    const leads = metrics.reduce((a, c) => a + c.leads, 0);
    return {
      spend, impressions, inbox, leads,
      cpi: inbox > 0 ? spend / inbox : 0,
      cpl: leads > 0 ? spend / leads : 0,
      convRate: inbox > 0 ? (leads / inbox) * 100 : 0
    };
  }, [metrics]);

  // Aggregate Top Services
  const services = useMemo(() => {
    const map = new Map<string, GlobalAdItem>();
    metrics.forEach(m => {
      const name = m.campaign || m.creative || 'Unknown';
      if (!map.has(name)) {
        map.set(name, {
          adName: name, thumbnailUrl: '', mediaType: '',
          spend: 0, impressions: 0, clicks: 0, inbox: 0, leads: 0, cpi: 0, cpl: 0, ctr: 0
        });
      }
      const s = map.get(name)!;
      s.spend += m.spend;
      s.impressions += m.impressions;
      s.clicks += m.clicks;
      s.inbox += m.inbox;
      s.leads += m.leads;
    });
    return Array.from(map.values()).map(s => {
      s.cpi = s.inbox > 0 ? s.spend / s.inbox : 0;
      s.cpl = s.leads > 0 ? s.spend / s.leads : 0;
      s.ctr = s.impressions > 0 ? (s.clicks / s.impressions) * 100 : 0;
      return s;
    }).sort((a,b) => b.spend - a.spend);
  }, [metrics]);

  return (
    <div className="flex flex-col gap-10">
      
      {/* ── PAGE 1: Dashboard Summary ── */}
      <div id="export-page-1" className="w-[794px] min-h-[1123px] p-10 flex flex-col font-sans relative" style={{ backgroundColor: colors.bgBase, color: colors.textMain }}>
        {/* Header */}
        <div className="flex items-center justify-between pb-6 mb-8" style={{ borderBottom: `1px solid ${colors.borderMain}` }}>
          <div>
            <h1 className="text-3xl font-black tracking-tight mb-2" style={{ color: colors.textMain }}>{pageName}</h1>
            <p className="text-sm font-bold uppercase tracking-widest" style={{ color: colors.gold }}>Dashboard Overview</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase mb-1" style={{ color: colors.textMuted }}>Date Range</p>
            <p className="text-sm font-semibold" style={{ color: colors.textMain }}>{since} <span className="mx-1" style={{ color: colors.textDim }}>to</span> {until}</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-2xl flex flex-col items-center justify-center text-center" style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.borderDim}` }}>
            <p className="text-[10px] font-bold uppercase mb-2" style={{ color: colors.textMuted }}>Total Spend</p>
            <p className="text-2xl font-black" style={{ color: colors.rose }}>{thb(kpis.spend)}</p>
          </div>
          <div className="p-4 rounded-2xl flex flex-col items-center justify-center text-center" style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.borderDim}` }}>
            <p className="text-[10px] font-bold uppercase mb-2" style={{ color: colors.textMuted }}>Total Inbox</p>
            <p className="text-2xl font-black" style={{ color: colors.blue }}>{num(kpis.inbox)}</p>
          </div>
          <div className="p-4 rounded-2xl flex flex-col items-center justify-center text-center" style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.borderDim}` }}>
            <p className="text-[10px] font-bold uppercase mb-2" style={{ color: colors.textMuted }}>Avg CPI</p>
            <p className="text-2xl font-black" style={{ color: colors.cyan }}>{thb(kpis.cpi)}</p>
          </div>
          <div className="p-4 rounded-2xl flex flex-col items-center justify-center text-center" style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.borderDim}` }}>
            <p className="text-[10px] font-bold uppercase mb-2" style={{ color: colors.textMuted }}>Leads / CPL</p>
            <p className="text-2xl font-black" style={{ color: colors.purple }}>{num(kpis.leads)} <span className="text-sm font-medium" style={{ color: colors.textMuted }}>/ {thb(kpis.cpl)}</span></p>
          </div>
        </div>

        {/* You could add Top 5 table here later, but for now we leave it empty to fill Page 1 with dashboard data */}
        <div className="flex-1" />

        {/* Footer Page 1 */}
        <div className="mt-8 pt-6 flex justify-between items-center opacity-60 absolute bottom-10 left-10 right-10" style={{ borderTop: `1px solid ${colors.borderMain}` }}>
          <p className="text-[10px] font-medium" style={{ color: colors.textMuted }}>Generated by MarktechOS</p>
          <p className="text-[10px] font-medium" style={{ color: colors.textMuted }}>{new Date().toLocaleString('th-TH')} • Page 1</p>
        </div>
      </div>

      {/* ── PAGE 2: Content Performance ── */}
      <div id="export-page-2" className="w-[794px] min-h-[1123px] p-10 flex flex-col font-sans relative" style={{ backgroundColor: colors.bgBase, color: colors.textMain }}>
        {/* Header (Minimal) */}
        <div className="flex items-center justify-between pb-6 mb-6" style={{ borderBottom: `1px solid ${colors.borderMain}` }}>
          <div>
            <h2 className="text-xl font-black tracking-tight" style={{ color: colors.textMain }}>Content Performance</h2>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold" style={{ color: colors.textMain }}>{since} <span className="mx-1" style={{ color: colors.textDim }}>to</span> {until}</p>
          </div>
        </div>

        {/* Services Table */}
        <div className="rounded-2xl overflow-hidden flex-1" style={{ backgroundColor: colors.bgCardAlt, border: `1px solid ${colors.borderMain}` }}>
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: 'rgba(13, 21, 32, 0.4)' }}>
              <tr>
                <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.textMuted, borderBottom: `1px solid ${colors.borderMain}` }}>Content Name</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.textMuted, borderBottom: `1px solid ${colors.borderMain}` }}>Spend</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.textMuted, borderBottom: `1px solid ${colors.borderMain}` }}>Impressions</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.textMuted, borderBottom: `1px solid ${colors.borderMain}` }}>Inbox</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.textMuted, borderBottom: `1px solid ${colors.borderMain}` }}>CPI</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.textMuted, borderBottom: `1px solid ${colors.borderMain}` }}>Leads</th>
              </tr>
            </thead>
            <tbody>
              {services.map((svc, i) => (
                <tr key={svc.adName}>
                  <td className="px-5 py-4 text-[13px] font-semibold" style={{ color: colors.textMain, borderBottom: `1px solid ${colors.borderDim}` }}>{svc.adName}</td>
                  <td className="px-4 py-4 text-right font-bold" style={{ color: colors.rose, borderBottom: `1px solid ${colors.borderDim}` }}>{thb(svc.spend)}</td>
                  <td className="px-4 py-4 text-right font-medium" style={{ color: 'rgba(255,255,255,0.7)', borderBottom: `1px solid ${colors.borderDim}` }}>{num(svc.impressions)}</td>
                  <td className="px-4 py-4 text-right font-bold" style={{ color: colors.blue, borderBottom: `1px solid ${colors.borderDim}` }}>{num(svc.inbox)}</td>
                  <td className="px-4 py-4 text-right font-medium" style={{ color: colors.cyan, borderBottom: `1px solid ${colors.borderDim}` }}>{thb(svc.cpi)}</td>
                  <td className="px-4 py-4 text-right font-bold" style={{ color: colors.purple, borderBottom: `1px solid ${colors.borderDim}` }}>{num(svc.leads)}</td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>No data available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Page 2 */}
        <div className="mt-8 pt-6 flex justify-between items-center opacity-60 absolute bottom-10 left-10 right-10" style={{ borderTop: `1px solid ${colors.borderMain}` }}>
          <p className="text-[10px] font-medium" style={{ color: colors.textMuted }}>Generated by MarktechOS</p>
          <p className="text-[10px] font-medium" style={{ color: colors.textMuted }}>{new Date().toLocaleString('th-TH')} • Page 2</p>
        </div>
      </div>

    </div>
  );
}

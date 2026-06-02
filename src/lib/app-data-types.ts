// ── Ad Report Types ────────────────────────────────────────────────────────
export interface AdsMetric {
  id: string;
  clinic: string;       // Ad account name (fallback)
  pageName: string;     // Facebook Page name (real)
  pageId: string;       // Facebook Page ID
  adAccountId: string;  // Facebook Ad Account ID
  campaign: string;
  spend: number;
  inbox: number;
  cpi: number;
  leads: number;
  cpl: number;
  roas: number;
  impressions: number;
  clicks: number;
  ctr: number;
  creative: string;
  status: "active" | "paused" | "ended";
}

// ── Formatting Utilities ───────────────────────────────────────────────────
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("th-TH").format(value);
}

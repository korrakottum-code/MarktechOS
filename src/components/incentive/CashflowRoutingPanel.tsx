import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { AdBudgetWallet, CashflowEntry, AppData } from "@/lib/app-data-types";
import { 
  formatCurrency,
  getCashflowCategoryLabel,
  getWalletStatusColor,
  getWalletStatusLabel,
} from "@/lib/app-utils";

interface Props {
  wallets?: AdBudgetWallet[];
  entries?: CashflowEntry[];
  patchSection: <K extends keyof AppData>(section: K, value: AppData[K]) => Promise<any>;
}

export default function CashflowRoutingPanel({
  wallets,
  entries,
  patchSection,
}: Props) {
  const safeWallets = wallets ?? [];
  const safeEntries = entries ?? [];

  const [topupModal, setTopupModal] = useState<{
    open: boolean;
    wallet?: AdBudgetWallet;
    amount: string;
    type: "service" | "ad";
  }>({ open: false, amount: "", type: "ad" });

  function handleTopup() {
    if (!topupModal.wallet || !topupModal.amount) return;

    const amount = parseInt(topupModal.amount);
    const wallet = topupModal.wallet;

    // 1. Update Wallets
    const updatedWallets = safeWallets.map((w) => {
      if (w.id === wallet.id) {
        if (topupModal.type === "service") {
          return { ...w, serviceFeeCollected: w.serviceFeeCollected + amount };
        } else {
          const newBalance = w.adWalletBalance + amount;
          return { 
            ...w, 
            adWalletBalance: newBalance,
            remainingAdBudget: newBalance - w.usedAdSpend,
            status: (newBalance - w.usedAdSpend) > 6000 ? "active" : w.status 
          } as AdBudgetWallet;
        }
      }
      return w;
    });

    // 2. Add Cashflow Entry
    const newEntry: CashflowEntry = {
      id: `cash-${Date.now()}`,
      date: new Date().toISOString(),
      type: "income",
      category: topupModal.type === "service" ? "service-fee" : "ad-topup",
      label: `${topupModal.type === "service" ? "ค่าบริการ" : "เติมงบแอด"}: ${wallet.clinic}`,
      amount,
      reference: `Ref: ${wallet.id.slice(-4)}`
    };

    patchSection("adBudgetWallets", updatedWallets);
    patchSection("cashflowEntries", [newEntry, ...safeEntries]);

    setTopupModal({ open: false, amount: "", type: "ad" });
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 relative">
      <div className="xl:col-span-3 bg-navy-900 border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              💳 Ad Spend & Cashflow Routing
            </h2>
            <p className="text-sm text-foreground-muted mt-1">
              แยกกระเป๋า ค่าบริการ และ ค่าแอด พร้อมแจ้งเตือนคลินิกที่งบใกล้หมด
            </p>
          </div>
        </div>

        <div className="divide-y divide-border/40 text-left">
          {safeWallets.map((wallet) => {
            const utilization =
              wallet.adWalletBalance > 0
                ? Math.round((wallet.usedAdSpend / wallet.adWalletBalance) * 100)
                : 0;

            return (
              <div key={wallet.id} className="p-4 md:p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{wallet.clinic}</p>
                    <p className="text-xs text-foreground-muted mt-0.5">
                      รอบวางบิล: {new Date(wallet.billingDueDate).toLocaleDateString("th-TH")}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`text-[11px] px-2 py-1 rounded-lg border ${getWalletStatusColor(
                        wallet.status
                      )}`}
                    >
                      {getWalletStatusLabel(wallet.status)}
                    </span>
                    <button 
                      onClick={() => setTopupModal({ open: true, wallet, amount: "", type: "ad" })}
                      className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all flex items-center gap-1 text-[10px]"
                    >
                      <Plus size={12} /> บันทึกเงินเข้า
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="bg-navy-800 rounded-xl p-3">
                    <p className="text-foreground-muted">ค่าบริการรับเข้า</p>
                    <p className="text-foreground font-semibold mt-1">
                      {formatCurrency(wallet.serviceFeeCollected)}
                    </p>
                  </div>
                  <div className="bg-navy-800 rounded-xl p-3">
                    <p className="text-foreground-muted">กระเป๋าแอดทั้งหมด</p>
                    <p className="text-blue-400 font-semibold mt-1">
                      {formatCurrency(wallet.adWalletBalance)}
                    </p>
                  </div>
                  <div className="bg-navy-800 rounded-xl p-3">
                    <p className="text-foreground-muted">คงเหลือ</p>
                    <p
                      className={`font-semibold mt-1 ${
                        wallet.remainingAdBudget > 12000
                          ? "text-emerald-400"
                          : wallet.remainingAdBudget > 6000
                          ? "text-amber-400"
                          : "text-red-400"
                      }`}
                    >
                      {formatCurrency(wallet.remainingAdBudget)}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-foreground-muted mb-1">
                    <span>ใช้ไป {formatCurrency(wallet.usedAdSpend)}</span>
                    <span>{utilization}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-navy-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        utilization >= 90
                          ? "bg-red-400"
                          : utilization >= 75
                          ? "bg-amber-400"
                          : "bg-emerald-400"
                      }`}
                      style={{ width: `${Math.min(utilization, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="xl:col-span-2 bg-navy-900 border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">Ledger ล่าสุด</h3>
          <p className="text-xs text-foreground-muted mt-1">รายการเงินเข้า-ออก ล่าสุด</p>
        </div>
        <div className="max-h-[32rem] overflow-y-auto divide-y divide-border/30">
          {safeEntries.map((entry) => (
            <div key={entry.id} className="px-5 py-3.5 flex items-center justify-between text-left">
              <div className="flex items-start justify-between gap-3 w-full">
                <div>
                  <p className="text-sm text-foreground">{entry.label}</p>
                  <p className="text-[11px] text-foreground-muted mt-1">
                    {new Date(entry.date).toLocaleDateString("th-TH")} · {getCashflowCategoryLabel(entry.category)}
                  </p>
                </div>
                <p
                  className={`text-sm font-semibold ${
                    entry.type === "income" ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {entry.type === "income" ? "+" : "-"}
                  {formatCurrency(entry.amount)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Topup Modal */}
      {topupModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-navy-900 border border-border w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">บันทึกยอดเงินเข้า</h3>
              <button onClick={() => setTopupModal({ open: false, amount: "", type: "ad" })} className="text-foreground-muted hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs text-foreground-muted block mb-1.5 ml-1">คลินิก</label>
                <div className="text-foreground font-semibold px-4 py-2 bg-navy-800 rounded-xl border border-border/50">
                  {topupModal.wallet?.clinic}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setTopupModal(f => ({ ...f, type: "ad" }))}
                  className={`py-2 px-3 rounded-xl border text-xs transition-all ${
                    topupModal.type === "ad" ? "bg-blue-500/20 border-blue-500/50 text-blue-400" : "bg-navy-800 border-border text-foreground-muted"
                  }`}
                >
                  เติมงบแอด
                </button>
                <button 
                  onClick={() => setTopupModal(f => ({ ...f, type: "service" }))}
                  className={`py-2 px-3 rounded-xl border text-xs transition-all ${
                    topupModal.type === "service" ? "bg-gold-500/20 border-gold-500/50 text-gold-400" : "bg-navy-800 border-border text-foreground-muted"
                  }`}
                >
                  ค่าบริการ
                </button>
              </div>

              <div>
                <label className="text-xs text-foreground-muted block mb-1.5 ml-1">จำนวนเงิน (THB)</label>
                <input 
                  type="number"
                  placeholder="0.00"
                  value={topupModal.amount}
                  onChange={(e) => setTopupModal(f => ({ ...f, amount: e.target.value }))}
                  className="w-full bg-navy-950 border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold text-lg"
                />
              </div>

              <div className="pt-2">
                <button 
                  onClick={handleTopup}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:shadow-lg hover:shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                >
                  ยืนยันบันทึกข้อมูล
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

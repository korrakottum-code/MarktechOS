"use client";

import { useState } from "react";
import type { Lead, Admin } from "@/lib/app-data-types";
import {
  getChannelIcon,
  getStatusLabel,
  getStatusColor,
  timeAgo,
  formatCurrency,
} from "@/lib/app-utils";
import { Search, Filter, Plus } from "lucide-react";

interface Props {
  leads: Lead[];
  admins: Admin[];
  onCreateLead?: () => void;
  onEditLead?: (lead: Lead) => void;
}

export default function LeadQueue({ leads, admins, onCreateLead, onEditLead }: Props) {
  const [statusFilter, setStatusFilter] = useState<Lead["status"] | "all">(
    "all"
  );
  const [search, setSearch] = useState("");

  const filtered = leads
    .filter((l) => statusFilter === "all" || l.status === statusFilter)
    .filter(
      (l) =>
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.clinic.toLowerCase().includes(search.toLowerCase()) ||
        l.procedure.toLowerCase().includes(search.toLowerCase())
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const getAdminName = (id: string) =>
    admins.find((a) => a.id === id)?.name || "—";

  const statusOptions: { value: Lead["status"] | "all"; label: string }[] = [
    { value: "all", label: "ทั้งหมด" },
    { value: "new", label: "ใหม่" },
    { value: "contacted", label: "ติดต่อแล้ว" },
    { value: "negotiating", label: "เจรจา" },
    { value: "closed", label: "ปิดการขาย" },
    { value: "lost", label: "สูญเสีย" },
  ];

  return (
    <div className="bg-navy-900 border border-border rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                📋 Lead Queue
              </h2>
              <p className="text-sm text-foreground-muted">
                {filtered.length} รายการ
              </p>
            </div>
            {onCreateLead && (
              <button
                onClick={onCreateLead}
                className="flex items-center gap-1.5 px-3 py-2 bg-gold-500 text-navy-950 rounded-xl text-sm font-medium hover:bg-gold-400 transition-colors"
              >
                <Plus size={16} />
                สร้าง Lead
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted"
              />
              <input
                type="text"
                placeholder="ค้นหา..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-navy-800 border border-border rounded-lg pl-9 pr-3 py-1.5 text-sm text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-gold-500/50 w-40"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-navy-800 rounded-lg p-0.5">
              <Filter size={14} className="text-foreground-muted mx-2" />
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                    statusFilter === opt.value
                      ? "bg-gold-500/20 text-gold-400"
                      : "text-foreground-muted hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-foreground-muted border-b border-border">
              <th className="px-6 py-3 font-medium">ช่องทาง</th>
              <th className="px-6 py-3 font-medium">ลูกค้า</th>
              <th className="px-6 py-3 font-medium">คลินิก</th>
              <th className="px-6 py-3 font-medium">หัตถการ</th>
              <th className="px-6 py-3 font-medium">แอดมิน</th>
              <th className="px-6 py-3 font-medium text-center">สถานะ</th>
              <th className="px-6 py-3 font-medium text-right">มูลค่า</th>
              <th className="px-6 py-3 font-medium text-right">เวลา</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => onEditLead?.(lead)}
                className="border-b border-border/30 hover:bg-navy-800/50 transition-colors cursor-pointer"
              >
                <td className="px-6 py-3 text-lg">
                  {getChannelIcon(lead.channel)}
                </td>
                <td className="px-6 py-3">
                  <p className="font-medium text-foreground">{lead.name}</p>
                  <p className="text-[11px] text-foreground-muted">
                    {lead.phone}
                  </p>
                </td>
                <td className="px-6 py-3 text-foreground">{lead.clinic}</td>
                <td className="px-6 py-3 text-foreground-muted">
                  {lead.procedure}
                </td>
                <td className="px-6 py-3 text-foreground">
                  {getAdminName(lead.assignedTo)}
                </td>
                <td className="px-6 py-3 text-center">
                  <span
                    className={`text-xs px-2 py-1 rounded-lg ${getStatusColor(
                      lead.status
                    )}`}
                  >
                    {getStatusLabel(lead.status)}
                  </span>
                </td>
                <td className="px-6 py-3 text-right font-medium text-foreground">
                  {formatCurrency(lead.value)}
                </td>
                <td className="px-6 py-3 text-right text-foreground-muted text-xs">
                  {timeAgo(lead.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  Users, Plus, Pencil, Trash2, Shield, X, Check,
  Search, AlertCircle, Loader2, Eye, EyeOff, ChevronDown
} from "lucide-react";
import { useAuthSession } from "@/lib/use-auth-session";
import { isClientRole } from "@/lib/auth/permissions";

interface UserItem {
  id: string;
  email: string;
  role: string;
  allowedPages: string[];
  displayName: string;
  createdAt: string;
  lastSignIn: string | null;
}

interface PageOption {
  pageId: string;
  pageName: string;
}

const ROLE_OPTIONS = [
  { value: "ceo", label: "CEO", color: "text-amber-400 bg-amber-500/15 border-amber-500/25" },
  { value: "admin", label: "Admin", color: "text-purple-400 bg-purple-500/15 border-purple-500/25" },
  { value: "am", label: "AM", color: "text-blue-400 bg-blue-500/15 border-blue-500/25" },
  { value: "finance", label: "Finance", color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/25" },
  { value: "content", label: "Content", color: "text-pink-400 bg-pink-500/15 border-pink-500/25" },
  { value: "ads", label: "Ads", color: "text-cyan-400 bg-cyan-500/15 border-cyan-500/25" },
  { value: "client", label: "ลูกค้า", color: "text-gold-400 bg-gold-500/15 border-gold-500/25" },
];

function getRoleBadge(role: string) {
  const opt = ROLE_OPTIONS.find(r => r.value === role);
  return opt
    ? <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-bold ${opt.color}`}><Shield size={10} />{opt.label}</span>
    : <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/20 font-bold">{role}</span>;
}

function AdminContent() {
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuthSession();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [allPages, setAllPages] = useState<PageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Modal state
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formRole, setFormRole] = useState("client");
  const [formDisplayName, setFormDisplayName] = useState("");
  const [formAllowedPages, setFormAllowedPages] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pageSearchQuery, setPageSearchQuery] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
      if (res.status === 403) {
        router.replace("/");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUsers(data.users || []);
      setAllPages(data.allPages || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!authLoading) {
      if (!authUser || isClientRole(authUser.role)) {
        router.replace("/");
        return;
      }
      loadUsers();
    }
  }, [authLoading, authUser, loadUsers, router]);

  function openCreateModal() {
    setModal("create");
    setEditingUser(null);
    setFormEmail("");
    setFormPassword("");
    setFormRole("client");
    setFormDisplayName("");
    setFormAllowedPages([]);
    setFormError(null);
    setPageSearchQuery("");
  }

  function openEditModal(user: UserItem) {
    setModal("edit");
    setEditingUser(user);
    setFormEmail(user.email);
    setFormPassword("");
    setFormRole(user.role);
    setFormDisplayName(user.displayName === user.email ? "" : user.displayName);
    setFormAllowedPages([...user.allowedPages]);
    setFormError(null);
    setPageSearchQuery("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      if (modal === "create") {
        if (!formEmail || !formPassword) {
          setFormError("กรุณากรอก Email และ Password");
          return;
        }
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formEmail,
            password: formPassword,
            role: formRole,
            allowedPages: formRole === "client" ? formAllowedPages : [],
            displayName: formDisplayName || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create user");
        setSuccessMsg(`สร้างผู้ใช้ ${formEmail} สำเร็จ`);
      } else if (modal === "edit" && editingUser) {
        const res = await fetch("/api/admin/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: editingUser.id,
            role: formRole,
            allowedPages: formRole === "client" ? formAllowedPages : [],
            displayName: formDisplayName || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update user");
        setSuccessMsg(`อัปเดตผู้ใช้ ${editingUser.email} สำเร็จ`);
      }

      setModal(null);
      loadUsers();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(userId: string, email: string) {
    if (!confirm(`ยืนยันลบผู้ใช้ ${email}?`)) return;
    setDeleting(userId);
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete user");
      setSuccessMsg(`ลบผู้ใช้ ${email} สำเร็จ`);
      loadUsers();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  }

  function togglePage(pageId: string) {
    setFormAllowedPages(prev =>
      prev.includes(pageId) ? prev.filter(p => p !== pageId) : [...prev, pageId]
    );
  }

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPageOptions = allPages.filter(p =>
    p.pageName.toLowerCase().includes(pageSearchQuery.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 border-2 border-gold-500/20 rounded-full" />
          <div className="absolute inset-0 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-sm text-foreground-muted animate-pulse">กำลังโหลด...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 px-6 py-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
          <AlertCircle size={20} className="text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-500/20 to-gold-600/10 flex items-center justify-center border border-gold-500/20">
              <Users size={20} className="text-gold-400" />
            </div>
            จัดการผู้ใช้งาน
          </h1>
          <p className="text-sm text-foreground-muted mt-1">กำหนดสิทธิ์การเข้าถึง Page สำหรับแต่ละผู้ใช้</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-gold-400 to-gold-600 text-navy-950 rounded-xl text-sm font-bold hover:from-gold-300 hover:to-gold-500 transition-all shadow-lg shadow-gold-500/20 active:scale-[0.97]"
        >
          <Plus size={16} />
          เพิ่มผู้ใช้ใหม่
        </button>
      </div>

      {/* Success Message */}
      {successMsg && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium animate-fade-in shadow-lg">
          <Check size={16} />
          {successMsg}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted" />
        <input
          type="text" placeholder="ค้นหาผู้ใช้..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full bg-navy-900 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-gold-500/50 transition-all"
        />
      </div>

      {/* Users Table */}
      <div className="bg-navy-900/50 border border-border rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-[11px] font-bold text-foreground-muted uppercase tracking-wider">ผู้ใช้</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-foreground-muted uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-foreground-muted uppercase tracking-wider">สิทธิ์เข้าถึง Pages</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-foreground-muted uppercase tracking-wider">Login ล่าสุด</th>
                <th className="text-right px-4 py-3 text-[11px] font-bold text-foreground-muted uppercase tracking-wider">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-navy-800/50 transition-colors group">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground">{u.displayName}</p>
                      <p className="text-xs text-foreground-muted">{u.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">{getRoleBadge(u.role)}</td>
                  <td className="px-4 py-3">
                    {u.role === "client" && u.allowedPages.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {u.allowedPages.map(pid => {
                          const page = allPages.find(p => p.pageId === pid);
                          return (
                            <span key={pid} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium" title={pid}>
                              {page?.pageName || pid}
                            </span>
                          );
                        })}
                      </div>
                    ) : u.role === "client" ? (
                      <span className="text-xs text-amber-400/80">⚠️ ยังไม่กำหนด</span>
                    ) : (
                      <span className="text-xs text-foreground-muted">ทั้งหมด</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-foreground-muted">
                    {u.lastSignIn
                      ? new Date(u.lastSignIn).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditModal(u)}
                        className="p-1.5 rounded-lg hover:bg-gold-500/15 text-foreground-muted hover:text-gold-400 transition-colors"
                        title="แก้ไข"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(u.id, u.email)}
                        disabled={deleting === u.id || u.email === authUser?.username}
                        className="p-1.5 rounded-lg hover:bg-red-500/15 text-foreground-muted hover:text-red-400 transition-colors disabled:opacity-30"
                        title={u.email === authUser?.username ? "ลบตัวเองไม่ได้" : "ลบ"}
                      >
                        {deleting === u.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-foreground-muted text-sm">
                    ไม่พบผู้ใช้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setModal(null)}>
          <div
            className="bg-navy-900 border border-border rounded-3xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">
                {modal === "create" ? "เพิ่มผู้ใช้ใหม่" : `แก้ไข ${editingUser?.email}`}
              </h2>
              <button onClick={() => setModal(null)} className="p-1 rounded-lg hover:bg-navy-800 text-foreground-muted">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
              {formError && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  <AlertCircle size={14} />
                  {formError}
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
                  อีเมล {modal === "create" && <span className="text-red-400">*</span>}
                </label>
                <input
                  type="email" value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  disabled={modal === "edit"}
                  placeholder="user@example.com"
                  className="w-full bg-navy-950/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted/30 focus:outline-none focus:border-gold-500/50 transition-all disabled:opacity-50"
                />
              </div>

              {/* Password */}
              {modal === "create" && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
                    รหัสผ่าน <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formPassword}
                      onChange={e => setFormPassword(e.target.value)}
                      placeholder="อย่างน้อย 6 ตัวอักษร"
                      className="w-full bg-navy-950/50 border border-border rounded-xl px-4 py-3 pr-10 text-sm text-foreground placeholder:text-foreground-muted/30 focus:outline-none focus:border-gold-500/50 transition-all"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Display Name */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
                  ชื่อแสดง (ไม่บังคับ)
                </label>
                <input
                  type="text" value={formDisplayName}
                  onChange={e => setFormDisplayName(e.target.value)}
                  placeholder="ชื่อที่จะแสดงในระบบ"
                  className="w-full bg-navy-950/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted/30 focus:outline-none focus:border-gold-500/50 transition-all"
                />
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
                  Role
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {ROLE_OPTIONS.map(opt => (
                    <button
                      key={opt.value} type="button"
                      onClick={() => setFormRole(opt.value)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                        formRole === opt.value
                          ? opt.color
                          : "text-foreground-muted border-border hover:border-foreground-muted/50 bg-navy-950/50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Allowed Pages (only for client role) */}
              {formRole === "client" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
                      Pages ที่อนุญาต
                    </label>
                    <span className="text-[10px] text-gold-400 font-medium">
                      เลือกแล้ว {formAllowedPages.length} เพจ
                    </span>
                  </div>

                  {/* Page search */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-2.5 text-foreground-muted" />
                    <input
                      type="text" placeholder="ค้นหาเพจ..."
                      value={pageSearchQuery} onChange={e => setPageSearchQuery(e.target.value)}
                      className="w-full bg-navy-950/50 border border-border rounded-lg pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-foreground-muted/30 focus:outline-none focus:border-gold-500/50"
                    />
                  </div>

                  {/* Select all / deselect */}
                  <div className="flex gap-2">
                    <button type="button"
                      onClick={() => setFormAllowedPages(filteredPageOptions.map(p => p.pageId))}
                      className="text-[10px] text-gold-400 hover:text-gold-300 font-medium">
                      เลือกทั้งหมด
                    </button>
                    <span className="text-[9px] text-white/10">|</span>
                    <button type="button"
                      onClick={() => setFormAllowedPages([])}
                      className="text-[10px] text-gold-400 hover:text-gold-300 font-medium">
                      ยกเลิกทั้งหมด
                    </button>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-xl p-2 bg-navy-950/30">
                    {filteredPageOptions.map(page => {
                      const selected = formAllowedPages.includes(page.pageId);
                      return (
                        <button
                          key={page.pageId} type="button"
                          onClick={() => togglePage(page.pageId)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all ${
                            selected
                              ? "bg-gold-500/10 text-foreground border border-gold-500/20"
                              : "text-foreground-muted hover:bg-navy-800 border border-transparent"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            selected ? "bg-gold-500 border-gold-500" : "border-border"
                          }`}>
                            {selected && <Check size={10} className="text-navy-950" />}
                          </div>
                          <span className="truncate text-left">{page.pageName}</span>
                        </button>
                      );
                    })}
                    {filteredPageOptions.length === 0 && (
                      <p className="text-center py-4 text-xs text-foreground-muted">ไม่พบเพจ</p>
                    )}
                  </div>

                  {formAllowedPages.length === 0 && (
                    <p className="text-[11px] text-amber-400/80 flex items-center gap-1.5">
                      <AlertCircle size={12} />
                      ⚠️ ยังไม่เลือกเพจ — ลูกค้าจะไม่เห็นข้อมูลใดๆ
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-foreground-muted border border-border hover:bg-navy-800 transition-colors">
                  ยกเลิก
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-gold-400 to-gold-600 text-navy-950 rounded-xl text-sm font-bold hover:from-gold-300 hover:to-gold-500 transition-all shadow-lg shadow-gold-500/20 disabled:opacity-60">
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : modal === "create" ? <Plus size={16} /> : <Check size={16} />}
                  {modal === "create" ? "สร้างผู้ใช้" : "บันทึก"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-foreground-muted">Loading...</div>
      </div>
    }>
      <AdminContent />
    </Suspense>
  );
}

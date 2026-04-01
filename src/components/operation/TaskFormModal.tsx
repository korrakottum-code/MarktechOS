"use client";

import { useState } from "react";
import { X, Trash2 } from "lucide-react";
import type { OperationTask, TaskStatus, TaskPriority, ContentType } from "@/lib/app-data-types";
import { 
  statusColumns,
  getContentTypeLabel
} from "@/lib/app-utils";

interface Props {
  task?: OperationTask;
  onSave: (task: OperationTask) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
  initialStatus?: TaskStatus;
}

const priorities: { value: TaskPriority; label: string }[] = [
  { value: "urgent", label: "🔴 ด่วนมาก" },
  { value: "high", label: "🟠 สำคัญ" },
  { value: "medium", label: "🔵 ปกติ" },
  { value: "low", label: "⚪ ต่ำ" },
];

const contentTypes: ContentType[] = ["caption", "graphic", "video", "ad-copy", "photo"];

const clinics = [
  "BeautyX Clinic",
  "Glow Up Clinic",
  "SkinLab Thailand",
  "Dermis Premium",
  "FaceCraft Clinic",
];

export default function TaskFormModal({ task, onSave, onDelete, onClose, initialStatus }: Props) {
  const isEdit = !!task;
  const [form, setForm] = useState({
    title: task?.title ?? "",
    clinic: task?.clinic ?? clinics[0],
    type: task?.type ?? ("graphic" as ContentType),
    status: task?.status ?? initialStatus ?? ("todo" as TaskStatus),
    priority: task?.priority ?? ("medium" as TaskPriority),
    assignee: task?.assignee ?? "",
    dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    description: task?.description ?? "",
    tags: task?.tags ? task.tags.join(", ") : "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result: OperationTask = {
      id: task?.id ?? `task-${Date.now()}`,
      createdAt: task?.createdAt ?? new Date().toISOString(),
      assigneeAvatar: task?.assigneeAvatar ?? (form.assignee ? form.assignee[0] : "?"),
      ...form,
      dueDate: new Date(form.dueDate).toISOString(),
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    onSave(result);
  }

  const inputClass =
    "w-full bg-navy-800 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-gold-500/50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-navy-900 border border-border rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {isEdit ? "แก้ไขงาน" : "สร้างงานใหม่"}
          </h2>
          <div className="flex items-center gap-2">
            {isEdit && onDelete && (
              <button
                onClick={() => {
                  if (confirm("ยืนยันการลบงานนี้?")) {
                    onDelete(task.id);
                  }
                }}
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                title="ลบงาน"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-navy-800 transition-colors"
            >
              <X size={18} className="text-foreground-muted" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">หัวข้องาน *</label>
            <input
              required
              className={inputClass}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="เช่น ออกแบบ Banner Promotion"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">คลินิก</label>
              <select
                className={inputClass}
                value={form.clinic}
                onChange={(e) => setForm({ ...form, clinic: e.target.value })}
              >
                {clinics.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">ประเภทงาน</label>
              <select
                className={inputClass}
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as ContentType })}
              >
                {contentTypes.map((t) => (
                  <option key={t} value={t}>{getContentTypeLabel(t)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">สถานะ</label>
              <select
                className={inputClass}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}
              >
                {statusColumns.map((col) => (
                  <option key={col.key} value={col.key}>{col.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">ความสำคัญ</label>
              <select
                className={inputClass}
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
              >
                {priorities.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">ผู้รับผิดชอบ</label>
              <input
                className={inputClass}
                value={form.assignee}
                onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                placeholder="ชื่อพนักงาน"
              />
            </div>
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">Deadline</label>
              <input
                type="date"
                className={inputClass}
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-foreground-muted mb-1 block">รายละเอียด</label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="รายละเอียดเพิ่มเติม..."
            />
          </div>

          <div>
            <label className="text-xs text-foreground-muted mb-1 block">Tags (แยกด้วยคอมม่า)</label>
            <input
              className={inputClass}
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="ads, design, video"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-foreground-muted hover:text-foreground transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-gold-500 text-navy-950 rounded-xl text-sm font-medium hover:bg-gold-400 transition-colors shadow-lg shadow-gold-500/20"
            >
              {isEdit ? "บันทึก" : "สร้างงาน"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

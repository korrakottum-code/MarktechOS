import { useState } from "react";
import { Edit2, Save, X } from "lucide-react";
import type { AttendanceAdjustment, AppData } from "@/lib/app-data-types";
import { formatCurrency } from "@/lib/app-utils";

interface Props {
  rows?: AttendanceAdjustment[];
  patchSection?: <K extends keyof AppData>(section: K, value: AppData[K]) => Promise<any>;
}

export default function AttendanceDeductionsTable({
  rows,
  patchSection,
}: Props) {
  const safeRows = rows ?? [];
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<AttendanceAdjustment>>({});

  const sorted = [...safeRows].sort((a, b) => a.name.localeCompare(b.name, "th"));

  const totalLateDeduction = sorted.reduce((sum, row) => sum + row.lateDeduction, 0);
  const totalAbsentDeduction = sorted.reduce(
    (sum, row) => sum + row.absentDeduction,
    0
  );
  const totalAllowance = sorted.reduce((sum, row) => sum + row.allowance, 0);
  const totalNet = sorted.reduce((sum, row) => sum + row.netAdjustment, 0);

  function startEdit(row: AttendanceAdjustment) {
    setEditingRowId(row.id);
    setEditValues({ ...row });
  }

  async function handleSave() {
    if (!editingRowId || !patchSection) return;

    const updatedRows = safeRows.map((row) => {
      if (row.id === editingRowId) {
        const v = { ...row, ...editValues };
        // Rules: Late -100, Absent -500, OT +150/hr
        const lateDeduction = v.lateDays * 100;
        const absentDeduction = v.absentDays * 500;
        const allowance = v.overtimeHours * 150; 
        const netAdjustment = allowance - lateDeduction - absentDeduction;

        return {
          ...v,
          lateDeduction,
          absentDeduction,
          allowance,
          netAdjustment
        } as AttendanceAdjustment;
      }
      return row;
    });

    await patchSection("attendanceAdjustments", updatedRows);
    setEditingRowId(null);
  }

  return (
    <div className="bg-navy-900 border border-border rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            ⏱️ Time Attendance & Deductions
          </h2>
          <p className="text-sm text-foreground-muted mt-1">
            คำนวณหักสาย/ขาดงาน พร้อมค่า OT และค่าเบี้ยขยันอัตโนมัติ
          </p>
        </div>
      </div>

      <div className="overflow-x-auto text-left">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-foreground-muted border-b border-border font-medium">
              <th className="px-6 py-4">ชื่อ</th>
              <th className="px-6 py-4 text-center">สาย (วัน)</th>
              <th className="px-6 py-4 text-center">ขาด (วัน)</th>
              <th className="px-6 py-4 text-center">ลา (วัน)</th>
              <th className="px-6 py-4 text-center">OT (ชม.)</th>
              <th className="px-6 py-4 text-right">หักสาย</th>
              <th className="px-6 py-4 text-right">หักขาด</th>
              <th className="px-6 py-4 text-right">เบี้ย/OT</th>
              <th className="px-6 py-4 text-right">สุทธิ</th>
              <th className="px-6 py-4 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => {
              const isEditing = editingRowId === row.id;
              return (
                <tr
                  key={row.id}
                  className={`border-b border-border/30 hover:bg-navy-800/40 transition-colors ${
                    isEditing ? "bg-blue-500/5 shadow-inner" : ""
                  }`}
                >
                  <td className="px-6 py-3 text-foreground font-medium">{row.name}</td>
                  
                  {/* Late Days */}
                  <td className="px-6 py-3 text-center">
                    {isEditing ? (
                      <input 
                        type="number"
                        className="w-14 bg-navy-950 border border-border rounded px-2 py-1 text-center text-amber-400"
                        value={editValues.lateDays}
                        onChange={e => setEditValues(v => ({ ...v, lateDays: parseInt(e.target.value) || 0 }))}
                      />
                    ) : (
                      <span className="text-amber-400">{row.lateDays}</span>
                    )}
                  </td>

                  {/* Absent Days */}
                  <td className="px-6 py-3 text-center">
                    {isEditing ? (
                      <input 
                        type="number"
                        className="w-14 bg-navy-950 border border-border rounded px-2 py-1 text-center text-red-500"
                        value={editValues.absentDays}
                        onChange={e => setEditValues(v => ({ ...v, absentDays: parseInt(e.target.value) || 0 }))}
                      />
                    ) : (
                      <span className="text-red-400">{row.absentDays}</span>
                    )}
                  </td>

                  {/* Leave Days */}
                  <td className="px-6 py-3 text-center">
                    {isEditing ? (
                      <input 
                        type="number"
                        className="w-14 bg-navy-950 border border-border rounded px-2 py-1 text-center text-slate-400"
                        value={editValues.leaveDays}
                        onChange={e => setEditValues(v => ({ ...v, leaveDays: parseInt(e.target.value) || 0 }))}
                      />
                    ) : (
                      <span className="text-foreground-muted">{row.leaveDays}</span>
                    )}
                  </td>

                  {/* OT Hours */}
                  <td className="px-6 py-3 text-center">
                    {isEditing ? (
                      <input 
                        type="number"
                        className="w-14 bg-navy-950 border border-border rounded px-2 py-1 text-center text-emerald-400"
                        value={editValues.overtimeHours}
                        onChange={e => setEditValues(v => ({ ...v, overtimeHours: parseInt(e.target.value) || 0 }))}
                      />
                    ) : (
                      <span className="text-emerald-400">{row.overtimeHours}</span>
                    )}
                  </td>

                  <td className="px-6 py-3 text-right text-red-400 font-mono">
                    -{formatCurrency(isEditing ? (editValues.lateDays || 0) * 100 : row.lateDeduction)}
                  </td>
                  <td className="px-6 py-3 text-right text-red-400 font-mono">
                    -{formatCurrency(isEditing ? (editValues.absentDays || 0) * 500 : row.absentDeduction)}
                  </td>
                  <td className="px-6 py-3 text-right text-emerald-400 font-mono">
                    +{formatCurrency(isEditing ? (editValues.overtimeHours || 0) * 150 : row.allowance)}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span
                      className={`font-bold font-mono ${
                        row.netAdjustment >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {row.netAdjustment >= 0 ? "+" : ""}
                      {formatCurrency(row.netAdjustment)}
                    </span>
                  </td>
                  
                  <td className="px-6 py-3 text-center">
                    {isEditing ? (
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={handleSave}
                          className="p-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                          title="บันทึก"
                        >
                          <Save size={14} />
                        </button>
                        <button 
                          onClick={() => setEditingRowId(null)}
                          className="p-1.5 rounded-lg bg-navy-800 text-foreground-muted hover:text-foreground transition-colors"
                          title="ยกเลิก"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => startEdit(row)}
                        className="p-2 rounded-lg bg-navy-800 text-foreground-muted hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                        title="แก้ไขข้อมูล"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-navy-950/50">
              <td className="px-6 py-5 font-bold text-foreground" colSpan={5}>
                สรุปยอดรวมทีมงานทั้งหมด
              </td>
              <td className="px-6 py-5 text-right font-bold text-red-400">
                -{formatCurrency(totalLateDeduction)}
              </td>
              <td className="px-6 py-5 text-right font-bold text-red-400">
                -{formatCurrency(totalAbsentDeduction)}
              </td>
              <td className="px-6 py-5 text-right font-bold text-emerald-400">
                +{formatCurrency(totalAllowance)}
              </td>
              <td className="px-6 py-4 text-right">
                <div className="inline-block px-4 py-2 bg-navy-800 rounded-xl border border-border/50">
                  <span className={`text-xl font-black ${totalNet >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {totalNet >= 0 ? "+" : ""}
                    {formatCurrency(totalNet)}
                  </span>
                </div>
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}


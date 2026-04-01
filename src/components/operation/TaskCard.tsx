"use client";

import type { OperationTask } from "@/lib/app-data-types";
import {
  getPriorityColor,
  getPriorityLabel,
  getContentTypeIcon,
  getContentTypeLabel,
} from "@/lib/app-utils";

interface Props {
  task: OperationTask;
}

const REFERENCE_TIME = new Date("2026-03-30T00:00:00.000Z").getTime();

export default function TaskCard({ task }: Props) {
  const isOverdue =
    task.status !== "done" && new Date(task.dueDate).getTime() < REFERENCE_TIME;
  const daysLeft = Math.ceil(
    (new Date(task.dueDate).getTime() - REFERENCE_TIME) / 86400000
  );

  return (
    <div
      className={`bg-navy-800 border rounded-xl p-3.5 cursor-pointer hover:border-gold-500/40 transition-all duration-200 hover:shadow-lg hover:shadow-gold-500/5 group ${
        isOverdue ? "border-red-500/40" : "border-border"
      }`}
    >
      {/* Top Row: Type + Priority */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-foreground-muted flex items-center gap-1">
          {getContentTypeIcon(task.type)} {getContentTypeLabel(task.type)}
        </span>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded border ${getPriorityColor(
            task.priority
          )}`}
        >
          {getPriorityLabel(task.priority)}
        </span>
      </div>

      {/* Title */}
      <h4 className="text-sm font-medium text-foreground leading-snug mb-2 group-hover:text-gold-400 transition-colors">
        {task.title}
      </h4>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-3">
        {task.tags.map((tag) => (
          <span
            key={tag}
            className="text-[10px] px-1.5 py-0.5 rounded bg-navy-700 text-foreground-muted"
          >
            #{tag}
          </span>
        ))}
      </div>

      {/* Bottom Row: Assignee + Due Date */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-full bg-navy-600 flex items-center justify-center text-[10px] font-medium text-foreground">
            {task.assigneeAvatar}
          </div>
          <span className="text-xs text-foreground-muted">{task.assignee}</span>
        </div>
        <span
          className={`text-[11px] ${
            isOverdue
              ? "text-red-400 font-medium"
              : daysLeft <= 2
              ? "text-amber-400"
              : "text-foreground-muted"
          }`}
        >
          {isOverdue
            ? `⏰ เลย ${Math.abs(daysLeft)} วัน`
            : daysLeft === 0
            ? "📅 วันนี้"
            : `📅 อีก ${daysLeft} วัน`}
        </span>
      </div>
    </div>
  );
}

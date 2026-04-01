"use client";

import { useCallback } from "react";

import type { AppData } from "@/lib/app-data-types";
import type { AppDataResponse } from "@/lib/use-app-data";

export function useAppDataMutation(
  setPayload: React.Dispatch<React.SetStateAction<AppDataResponse | null>>
) {
  const patchSection = useCallback(
    async <K extends keyof AppData>(section: K, value: AppData[K]) => {
      const res = await fetch("/api/app-data", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, value }),
      });
      if (!res.ok) throw new Error("บันทึกข้อมูลไม่สำเร็จ");
      const updated = (await res.json()) as AppDataResponse;
      setPayload(updated);
      return updated;
    },
    [setPayload]
  );

  const multiPatch = useCallback(
    async (patches: Partial<AppData>) => {
      const res = await fetch("/api/app-data", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patches }),
      });
      if (!res.ok) throw new Error("บันทึกข้อมูลไม่สำเร็จ");
      const updated = (await res.json()) as AppDataResponse;
      setPayload(updated);
      return updated;
    },
    [setPayload]
  );

  return { patchSection, multiPatch };
}

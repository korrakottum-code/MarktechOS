// Reads one conversation's messages and works out chat "episodes" and whether
// each one closed (booked a queue). Pure functions — no I/O — so the rules can
// be tested on their own. Rules follow the korrakottum-ads skill §3C:
// closes are read from message text only, never from tags.

export interface ChatLine {
  who: "A" | "C";       // A = page/admin, C = customer
  at: number;           // epoch ms
  text: string;
  photo: boolean;
}

export interface EpisodeState {
  startedAt: number;
  adId: string;
  adTitle: string;
  isNew: boolean;
  closed: boolean;
  closedAt: number | null;
  queues: number;
  phoneGiven: boolean;
  lastActivityAt: number;
  /** true when this episode is new or changed in this pass. */
  dirty?: boolean;
}

export interface AnalyzeInput {
  lines: ChatLine[];                       // oldest first
  adClicks: { adId: string; at: number }[];
  adTitles: Map<string, string>;
  convCreatedAt: number;
  existing: EpisodeState[];                // from DB, any order
  /** Messages at or before this time were already counted in an earlier pass. */
  processedUntil: number;
  /** Ignore anything before this (start of tracked history). */
  floor: number;
  /** All messages from this time on are in `lines` (-Infinity if the whole conversation is). */
  historyStart: number;
}

const DAY = 86400000;
const NEW_EPISODE_GAP = 7 * DAY;     // customer back after a week = a new chat
const CLICK_MERGE = DAY;             // a click within a day of an episode start belongs to it

const PHONE_RE = /(?:\+66|0)[1-9](?:[\s-]?\d){7,8}(?!\d)/;
// An admin "booking summary" line: the customer's phone plus a price, a date or
// time, or booking words. Teams write it differently (NV: "... 990.- (19/11/69)
// เวลา 15:30 ลค.ใหม่", Class: "นัดหมายของคุณท่าน ... Pico 📍สาขา").
const SUMMARY_PRICE_RE = /(฿|บาท|\d\s*\.-|จอง\s*\d|มัดจำ\s*\d|ลค\.?\s*(ใหม่|เก่า)|นัดหมาย|นัด|สาขา|เวลา|\d{1,2}\s*[/.]\s*\d{1,2}\s*[/.]\s*\d{2,4}|\d{1,2}[:.]\d{2}\s*(น|น\.|นาฬิกา))/;
const CANCEL_RE = /ยกเลิก/;
const PAID_TEXT_RE = /(โอนแล้ว|โอนเรียบร้อย|โอนให้แล้ว|สลิป|ส่งการชำระเงิน|transfer completed|sent a ฿|sent you ฿)/i;
const PAY_ASK_RE = /(บัญชี|โอน|มัดจำ)/;
const PAY_CONFIRM_RE = /(ได้รับ|ยืนยัน|เรียบร้อย|ลงคิว)/;
const BOOK_CONFIRM_RE = /(ลงคิว|ลงนัด|จองคิวให้|ยืนยันคิว|ลงระบบ|ลงข้อมูล|บันทึกนัด|นัดหมายของ)/;

export function hasPhone(text: string): boolean {
  return PHONE_RE.test(text);
}

interface CloseEvent { at: number; summaryKey?: string }

/** Close events found in lines (indices ≥ fromIdx are the new ones). */
export function findCloses(lines: ChatLine[], fromIdx: number): { closes: CloseEvent[]; phones: number[] } {
  const closes: CloseEvent[] = [];
  const phones: number[] = [];
  for (let i = fromIdx; i < lines.length; i++) {
    const l = lines[i];
    if (l.who === "A" && hasPhone(l.text) && SUMMARY_PRICE_RE.test(l.text) && !CANCEL_RE.test(l.text)) {
      closes.push({ at: l.at, summaryKey: l.text.replace(/\s+/g, "") });
      continue;
    }
    if (l.who !== "C") continue;
    if (hasPhone(l.text)) {
      phones.push(l.at);
      for (let j = i + 1; j < Math.min(lines.length, i + 9); j++) {
        if (lines[j].who === "A" && BOOK_CONFIRM_RE.test(lines[j].text) && !CANCEL_RE.test(lines[j].text)) { closes.push({ at: lines[j].at }); break; }
      }
    }
    if (PAID_TEXT_RE.test(l.text)) { closes.push({ at: l.at }); continue; }
    if (l.photo) {
      let asked = false;
      for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
        if (lines[j].who === "A" && PAY_ASK_RE.test(lines[j].text)) { asked = true; break; }
      }
      if (!asked) continue;
      for (let j = i + 1; j < Math.min(lines.length, i + 7); j++) {
        if (lines[j].who === "A" && PAY_CONFIRM_RE.test(lines[j].text)) { closes.push({ at: lines[j].at }); break; }
      }
    }
  }
  return { closes, phones };
}

export function analyzeConversation(input: AnalyzeInput): EpisodeState[] {
  const eps = input.existing.map(e => ({ ...e })).sort((a, b) => a.startedAt - b.startedAt);
  const isNewAt = (t: number) => input.convCreatedAt >= t - DAY;

  const latestBefore = (t: number) => {
    let found: EpisodeState | undefined;
    for (const e of eps) if (e.startedAt <= t) found = e; else break;
    return found;
  };
  const open = (t: number, adId: string) => {
    const e: EpisodeState = {
      startedAt: t, adId, adTitle: adId ? input.adTitles.get(adId) ?? "" : "", isNew: isNewAt(t),
      closed: false, closedAt: null, queues: 0, phoneGiven: false, lastActivityAt: t, dirty: true,
    };
    eps.push(e);
    eps.sort((a, b) => a.startedAt - b.startedAt);
    return e;
  };

  // 1) Ad clicks start episodes.
  for (const c of [...input.adClicks].sort((a, b) => a.at - b.at)) {
    if (c.at < input.floor) continue;
    const prev = latestBefore(c.at + 60_000);
    if (prev && c.at - prev.startedAt < CLICK_MERGE) {
      if (!prev.adId) { prev.adId = c.adId; prev.adTitle = input.adTitles.get(c.adId) ?? ""; prev.dirty = true; }
      continue;
    }
    // Skip clicks already represented by a stored episode slightly after them.
    if (eps.some(e => Math.abs(e.startedAt - c.at) < CLICK_MERGE && e.adId === c.adId)) continue;
    open(c.at, c.adId);
  }

  // 2) New customer messages: activity, and episodes for organic/returning chats.
  // A customer message opens a new episode only when we can see ≥7 days of
  // silence before it (or the conversation itself starts there) — otherwise it
  // may be the middle of a chat that began before the messages we fetched.
  const fromIdx = input.lines.findIndex(l => l.at > input.processedUntil);
  if (fromIdx < 0) return eps.filter(e => e.dirty);
  let lastSeen = -Infinity;
  for (let i = 0; i < input.lines.length; i++) {
    const l = input.lines[i];
    if (i >= fromIdx && l.at >= input.floor) {
      const cur = latestBefore(l.at + 60_000);
      const lastAct = Math.max(cur?.lastActivityAt ?? -Infinity, lastSeen);
      if (l.who === "C") {
        const gapKnown = Number.isFinite(lastAct)
          ? l.at - lastAct > NEW_EPISODE_GAP
          : input.convCreatedAt >= l.at - DAY || l.at - input.historyStart > NEW_EPISODE_GAP;
        if (gapKnown) {
          // The customer often types first and the ad click is logged a bit
          // later: pull that new ad episode back to this message instead.
          const soon = eps.find(e => e.dirty && !e.closed && e.adId && e.startedAt > l.at && e.startedAt - l.at < CLICK_MERGE
            && !(e as { id?: string }).id);
          if (soon) { soon.startedAt = l.at; soon.isNew = isNewAt(l.at); eps.sort((a, b) => a.startedAt - b.startedAt); }
          else open(l.at, "");
          lastSeen = l.at;
          continue;
        }
      }
      if (cur && l.at > cur.lastActivityAt) { cur.lastActivityAt = l.at; cur.dirty = true; }
    }
    lastSeen = l.at;
  }

  // 3) Closes and phone numbers go to the latest episode that started before them.
  // Scan a few lines before the new ones so a phone → "ลงคิว" pair split across
  // passes is still seen; only events after processedUntil are counted.
  const found = findCloses(input.lines, Math.max(0, fromIdx - 8));
  const closes = found.closes.filter(c => c.at > input.processedUntil && c.at >= input.floor);
  const phones = found.phones.filter(t => t > input.processedUntil && t >= input.floor);
  for (const t of phones) {
    const e = latestBefore(t + 60_000);
    if (e && !e.phoneGiven) { e.phoneGiven = true; e.dirty = true; }
  }
  const summaryKeys = new Map<EpisodeState, Set<string>>();
  for (const c of closes) {
    const e = latestBefore(c.at + 60_000);
    if (!e) continue;
    if (!e.closed || (e.closedAt !== null && c.at < e.closedAt)) { e.closed = true; e.closedAt = c.at; e.dirty = true; }
    if (c.summaryKey) {
      let s = summaryKeys.get(e);
      if (!s) { s = new Set(); summaryKeys.set(e, s); }
      if (!s.has(c.summaryKey)) { s.add(c.summaryKey); e.queues += 1; e.dirty = true; }
    }
  }
  return eps.filter(e => e.dirty);
}

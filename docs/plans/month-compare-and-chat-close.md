# Month comparison + chat close rate (from the korrakottum-ads skill)

Goal: the dashboard does what the skill does by hand: compare a date range to the
same days last month, per page / service / price, through the funnel
chat → lead → queue, explain why results moved, and suggest ad changes.

## Phase 1: month comparison from data we already have

**Data:** `AdsContentDaily` (ad level: spend, inbox, leads, pageId, adName) and
`PageNameCache`. Every ad already has a pageId, so no per-account guessing is needed.

**Date ranges:** the user picks `since..until`. The previous range is the same day
numbers in the previous month, clamped to that month's length (Nov 1–20 → Oct 1–20,
Mar 1–31 → Feb 1–28/29).

**Name grouping** (`src/lib/ad-name.ts`):
- price key = the full ad name (trimmed, lowercased)
- service = the name with the trailing price digits removed (`botox990` → `botox`)
- names with `+` → "Combo"; names like `all`, `set`, or a promo date (`11.11`, `9.9`) → "Bundle promo"
- price = trailing number of 3+ digits, if any (`hifu990` → 990)

**API** `GET /api/compare?since&until&pages=`:
- auth: `getPageAccessForCurrentUser`, results limited to allowed pages
- returns `ranges`, `overview`, `byPage`, `byService`, `byPrice` (ads with ≥10 chats in
  either period), `decomposition`, `flags`, and `chatCoverage` (Phase 2)
- each row has `cur` and `prev`: spend, inbox, leads, days, plus closes/queues/episodes
  when chat data exists

**Chat-level decomposition** (the same idea as section 4.5 of the skill, measured at the chat step):
- expected chats = Σ over price keys (current spend ÷ previous ฿/chat for that key;
  fall back to the service, then the page average)
- mix effect = (current spend ÷ previous overall ฿/chat) − expected
- efficiency effect = actual − expected

**Flags (rules):**
- ad ฿/chat > 1.5× its page average with spend ≥ 5% of the page
- ad name without a price taking ≥ 20% of a page's spend
- price keys that were cheap per chat last month whose spend fell ≥ 30% this month
- pages with chat → lead < 5% while leads exist elsewhere (lead tracking may be off)
- once Phase 2 data exists: same rules on ฿/close and close %

**UI** `/compare` (in the sidebar, hidden for client role): range picker, KPI cards
(prev → cur with ✅/🔻), tables for page funnel / service / price, a decomposition
card, and a flag list. Each page row shows its chat source (Pancake / not counted).

## Phase 2: queues and close % from Pancake chats

**Findings (probe on 2026-11-20):**
- the token reaches 80 Pancake pages; it expires 2026-12-12 (user JWT)
- `GET pages/{pid}/conversations?type=INBOX&current_count=N` returns 60 per page,
  newest `updated_at` first
- `GET pages/{pid}/conversations/{cid}/messages?customer_id=&current_count=N` returns
  ~25 messages per call, newest first; it includes `ad_clicks`
  `{customerId: [{ad_id, inserted_at}]}` (full click history) and `activities[].ads_context_data.ad_title`
- admin messages: `from.id == pageId`, with `from.admin_name`
- a busy page has ~60 updated conversations/day, so about 40 pages × 60 ≈ 2.4k
  conversations/day, which fits an hourly cron

**Storage (no names, phones, or message text):**
- `ChatEpisode`: one row per "chat" (an ad click, or a customer coming back after
  ≥7 days of silence). Fields: id = sha256(conversationId)|startedAt, pageId, convHash,
  adId, adTitle, startedAt, date (Bangkok), hour, isNew, closed, closedAt, queues,
  phoneGiven, leadPending, lastActivityAt
- `ChatSyncState` per page: cursor (last conversation `updated_at` processed),
  lastRunAt, lastError, counters

**Close rules** (section 3C of the skill), applied to messages in time order:
- summary line: admin text with a phone number and (`฿|บาท|\d.-|จอง\d|ลค.ใหม่/เก่า`).
  Each distinct summary line = 1 queue
- payment: customer text `โอนแล้ว|สลิป|ส่งการชำระเงิน|Transfer completed|sent a ฿`, or a
  customer photo within 4 lines after admin mentions `บัญชี|โอน|มัดจำ` followed by an admin confirm
- phone + confirm: customer sends a phone number and an admin says
  `ลงคิว|ลงนัด|จองคิวให้|ยืนยันคิว` within the next 8 lines
- phone given but no close → lead pending
- tags are never used

**Episodes:**
- each ad click starts an episode, unless the previous episode started < 24h ago
  (then the click's ad fills a missing adId)
- a customer message after ≥7 days with no activity starts a "no ad" episode
- a close is credited to the latest episode that started before it
- isNew = the conversation was created at most 1 day before the episode began

**Cron** `/api/cron/sync-chats` (hourly, 270s budget):
- pages = Pancake facebook pages ∩ pages with ad spend in the last 60 days
- oldest `lastRunAt` first; for each page, list conversations updated since the cursor,
  then process them oldest first and save the cursor after each one so a timeout loses nothing
- per conversation, fetch messages back to cursor − 1 day (at most 12 calls); episodes
  before that come from DB rows plus `ad_clicks`
- the first run starts the cursor at 2026-10-01 so Oct vs Nov can be compared

**API/UI additions:** closes, queues, close %, ฿/close, ฿/queue, closes within 1h,
median time to close, new vs returning, no-ad chats, and pending leads per page / service /
price. The decomposition is redone at the close level (the skill's formula). Pages without
Pancake show "not counted".

## Limits to show on the page
- "Closed" is read from chat text; it is not matched to clinic sales records
- Meta "lead" is a lead event, not a queue; some pages don't track leads
- some chats have no ad id; many ad names have no price (~16% of spend has one)
- the Pancake token expires 2026-12-12 and needs replacing

## Addendum (2026-11-24): service mapping and campaign types

- **Service lookup order** (`src/lib/ad-name.ts`): manual mapping (`AdServiceMap`, set on
  /compare) → ad name → campaign name → ad copy from Meta (`AdCreativeText`, fetched by the
  chat-sync cron for ads whose names don't resolve). Synonyms map to one service (ขน/diode/
  กำจัดขน → เลเซอร์กำจัดขน). Anything still unknown goes to a single "ไม่ระบุบริการ" group.
- **By price** = service + price when a price is known (from name, mapping, or ad copy).
- **Campaign types:** job-ad campaigns and Awareness/Engagement campaigns with < 1 chat per
  ฿1,000 are left out of every number (the page lists them). Some "AW" campaigns are message
  campaigns, so the name alone is not enough. Lead campaigns count as normal chats, but
  suggestions judge them by ฿/lead because they optimize for leads.
- **Chat metrics** only include pages whose chat sync has caught up; pages still backfilling
  show "Pancake (กำลังดึง)".

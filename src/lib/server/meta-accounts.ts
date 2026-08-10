// Lightweight ad-account listing, shared by the admin sync picker.
// Deliberately separate from the sync route's own account discovery so this
// stays a cheap read (no insights/creative fetching) even if that route changes.

const API_VERSION = "v20.0";
const BASE = `https://graph.facebook.com/${API_VERSION}`;

export interface AdAccountInfo {
  accountId: string;
  name: string;
}

interface MetaAdAccountsResponse {
  data?: { account_id: string; name?: string; account_status?: number }[];
  paging?: { next?: string };
  error?: { message?: string };
}

export function getMetaTokens(): string[] {
  const tokens: string[] = [];
  const t1 = process.env.META_SYSTEM_USER_TOKEN;
  if (t1) tokens.push(t1);
  const t2 = process.env.META_SYSTEM_USER_TOKEN_2;
  if (t2) tokens.push(t2);
  const t3 = process.env.META_SYSTEM_USER_TOKEN_3;
  if (t3) tokens.push(t3);
  return tokens;
}

export async function listAdAccounts(tokens: string[]): Promise<AdAccountInfo[]> {
  const map = new Map<string, AdAccountInfo>();
  await Promise.all(tokens.map(async (token) => {
    let nextUrl: string | null =
      `${BASE}/me/adaccounts?fields=name,account_id,account_status&limit=100&access_token=${token}`;
    while (nextUrl) {
      const res: Response = await fetch(nextUrl, { cache: "no-store", signal: AbortSignal.timeout(30_000) });
      const json: MetaAdAccountsResponse = await res.json();
      if (json.error) throw new Error(json.error.message ?? "Meta API error");
      for (const acc of json.data ?? []) {
        if (acc.account_status === 2) continue; // disabled
        if (!map.has(acc.account_id)) {
          map.set(acc.account_id, { accountId: acc.account_id, name: acc.name ?? acc.account_id });
        }
      }
      nextUrl = json.paging?.next ?? null;
    }
  }));
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

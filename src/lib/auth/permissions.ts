export type UserRole = "ceo" | "admin" | "finance" | "am" | "content" | "ads" | "client";

const protectedRoots = [
  "/",
  "/admin",
  "/admin-crm",
  "/operation",
  "/client-hr",
  "/incentive",
  "/ai-brain",
  "/ticketing",
  "/timeline",
  "/notifications",
  "/platform-ops",
] as const;

const restrictedRoutes: Array<{ prefix: string; roles: UserRole[] }> = [
  { prefix: "/admin", roles: ["ceo", "admin"] },
  { prefix: "/platform-ops", roles: ["ceo", "admin"] },
  { prefix: "/incentive", roles: ["ceo", "admin", "finance"] },
  { prefix: "/admin-crm", roles: ["ceo", "admin", "am"] },
  // Client users can only access the main dashboard ("/")
  { prefix: "/operation", roles: ["ceo", "admin", "finance", "am", "content", "ads"] },
  { prefix: "/client-hr", roles: ["ceo", "admin", "finance", "am", "content", "ads"] },
  { prefix: "/ai-brain", roles: ["ceo", "admin", "finance", "am", "content", "ads"] },
  { prefix: "/ticketing", roles: ["ceo", "admin", "finance", "am", "content", "ads"] },
  { prefix: "/timeline", roles: ["ceo", "admin", "finance", "am", "content", "ads"] },
  { prefix: "/notifications", roles: ["ceo", "admin", "finance", "am", "content", "ads"] },
];

/** Check if a role is the client (customer) role */
export function isClientRole(role: UserRole): boolean {
  return role === "client";
}

export function parseUserRole(role: string | undefined): UserRole | null {
  if (!role) return null;

  const normalized = role.trim().toLowerCase();
  if (
    normalized === "ceo" ||
    normalized === "admin" ||
    normalized === "finance" ||
    normalized === "am" ||
    normalized === "content" ||
    normalized === "ads" ||
    normalized === "client"
  ) {
    return normalized;
  }

  return null;
}

export function isProtectedPath(pathname: string): boolean {
  if (pathname === "/") return true;

  return protectedRoots.some(
    (root) => root !== "/" && (pathname === root || pathname.startsWith(`${root}/`))
  );
}

export function canAccessPath(pathname: string, role: UserRole): boolean {
  const routeRule = restrictedRoutes.find(
    (rule) => pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)
  );

  if (!routeRule) return true;

  return routeRule.roles.includes(role);
}

export function getDefaultPathForRole(role: UserRole): string {
  if (role === "finance") return "/incentive";
  if (role === "admin" || role === "am") return "/admin-crm";
  return "/";
}

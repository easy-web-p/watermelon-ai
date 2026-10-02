export type UserRole =
  | "guest"
  | "user"
  | "researcher"
  | "support"
  | "admin"
  | "super_admin";

export interface RouteRule {
  pattern: RegExp;
  authenticated: boolean;
  roles?: UserRole[];
}

export const PERMISSIONS = {
  CHAT_CREATE: "chat:create",
  CHAT_READ_OWN: "chat:read:own",
  CHAT_UPDATE_OWN: "chat:update:own",
  CHAT_DELETE_OWN: "chat:delete:own",

  FILE_UPLOAD: "file:upload",
  AUDIO_TRANSCRIBE: "audio:transcribe",
  KNOCK_ANALYZE: "knock:analyze",

  KNOWLEDGE_READ_OWN: "knowledge:read:own",
  KNOWLEDGE_WRITE_OWN: "knowledge:write:own",

  FEEDBACK_CREATE: "feedback:create",
  FEEDBACK_REVIEW: "feedback:review",

  DATASET_REVIEW: "dataset:review",
  DATASET_APPROVE: "dataset:approve",

  USER_MANAGE: "user:manage",
  ROLE_MANAGE: "role:manage",
  MODEL_MANAGE: "model:manage",
  AUDIT_READ: "audit:read",
  ADMIN_STATS_READ: "admin:stats:read",
  SECURITY_SETTINGS: "security:manage",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS] | "*";

export const ROLE_PERMISSIONS: Record<UserRole, readonly string[]> = {
  guest: ["feedback:create"],

  user: [
    "chat:create",
    "chat:read:own",
    "chat:update:own",
    "chat:delete:own",
    "file:upload",
    "audio:transcribe",
    "knock:analyze",
    "knowledge:read:own",
    "knowledge:write:own",
    "feedback:create",
  ],

  researcher: [
    "chat:create",
    "chat:read:own",
    "chat:update:own",
    "chat:delete:own",
    "file:upload",
    "audio:transcribe",
    "knock:analyze",
    "knowledge:read:own",
    "knowledge:write:own",
    "feedback:create",
    "dataset:review",
    "dataset:approve",
    "admin:stats:read",
  ],

  support: [
    "chat:create",
    "chat:read:own",
    "file:upload",
    "audio:transcribe",
    "knock:analyze",
    "feedback:create",
    "feedback:review",
    "admin:stats:read",
  ],

  admin: [
    "feedback:review",
    "dataset:review",
    "dataset:approve",
    "user:manage",
    "model:manage",
    "audit:read",
    "admin:stats:read",
  ],

  super_admin: ["*"],
} as const;

export const routeRules: RouteRule[] = [
  {
    pattern: /^\/chat(?:\/.*)?$/,
    authenticated: true,
    roles: ["user", "researcher", "support", "admin", "super_admin"],
  },
  {
    pattern: /^\/prompts(?:\/.*)?$/,
    authenticated: true,
    roles: ["user", "researcher", "support", "admin", "super_admin"],
  },
  {
    pattern: /^\/folders(?:\/.*)?$/,
    authenticated: true,
    roles: ["user", "researcher", "support", "admin", "super_admin"],
  },
  {
    pattern: /^\/knowledge(?:\/.*)?$/,
    authenticated: true,
    roles: ["user", "researcher", "support", "admin", "super_admin"],
  },
  {
    pattern: /^\/settings(?:\/.*)?$/,
    authenticated: true,
    roles: ["user", "researcher", "support", "admin", "super_admin"],
  },
  {
    pattern: /^\/lab(?:\/.*)?$/,
    authenticated: true,
    roles: ["user", "researcher", "support", "admin", "super_admin"],
  },
  {
    pattern: /^\/research(?:\/.*)?$/,
    authenticated: true,
    roles: ["researcher", "admin", "super_admin"],
  },
  {
    pattern: /^\/support\/tickets(?:\/.*)?$/,
    authenticated: true,
    roles: ["support", "admin", "super_admin"],
  },
  {
    pattern: /^\/admin(?:\/.*)?$/,
    authenticated: true,
    roles: ["admin", "super_admin"],
  },
  {
    pattern: /^\/admin\/roles(?:\/.*)?$/,
    authenticated: true,
    roles: ["super_admin"],
  },
];

export function hasPermission(role: UserRole, permission: string): boolean {
  const allowed = ROLE_PERMISSIONS[role] || [];
  if (allowed.includes("*")) return true;
  return allowed.includes(permission);
}

export function canAccessRoute(
  role: UserRole,
  path: string,
  isAuthenticated: boolean
): { allowed: boolean; reason?: "unauthenticated" | "forbidden" } {
  // Public routes always allowed
  if (
    path === "/" ||
    path === "" ||
    path === "/login" ||
    path === "/help" ||
    path === "/simulator" ||
    path === "/varieties" ||
    path === "/disease"
  ) {
    return { allowed: true };
  }

  const matchingRule = routeRules.find((rule) => rule.pattern.test(path));

  if (!matchingRule) {
    return { allowed: true };
  }

  if (matchingRule.authenticated && !isAuthenticated) {
    return { allowed: false, reason: "unauthenticated" };
  }

  if (matchingRule.roles && !matchingRule.roles.includes(role)) {
    return { allowed: false, reason: "forbidden" };
  }

  return { allowed: true };
}

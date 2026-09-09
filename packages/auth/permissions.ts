import { createAccessControl } from 'better-auth/plugins/access';
import {
  defaultStatements as organizationStatements,
  adminAc as organizationAdminAc,
  ownerAc as organizationOwnerAc,
} from 'better-auth/plugins/organization/access';
import {
  defaultStatements as adminStatements,
  adminAc as adminAdminAc,

} from "better-auth/plugins/admin/access";

export const resourceActions = {
  post: ['create', 'share', 'update', 'delete'],
} as const;

export const statement = {
  ...organizationStatements,
  ...adminStatements,
  ...resourceActions,
} as const;

export type Resource = keyof typeof statement;
export type Action = (typeof statement)[Resource][number];
export type Permission = `${Resource}::${Action}`;

/** Every permission in the canonical "model::action" form, e.g. "year::read". */
export const permissionRefs: Permission[] = (
  Object.keys(statement) as Resource[]
).flatMap((resource) =>
  statement[resource].map((action) => `${resource}::${action}` as Permission),
);

// ── Access controller ───────────────────────────────────────────────

export const ac = createAccessControl(statement);

// ── Built-in roles ──────────────────────────────────────────────────
// Only `owner` and `admin`. `owner` is immutable: every organization must
// keep exactly one owner (Better Auth enforces the last-owner rule).
// Every additional role is created per-organization at runtime.

export const owner = ac.newRole({
  ...organizationOwnerAc.statements,
  ...adminAdminAc.statements,
  ...resourceActions,
});

export const admin = ac.newRole({
  ...organizationAdminAc.statements,
  ...adminAdminAc.statements,
  ...resourceActions,
});

/** Built-in roles with their permission maps, for UI display. */
export const builtInRoles = {
  owner: { name: 'owner', permission: owner.statements },
  admin: { name: 'admin', permission: admin.statements },
} as const;

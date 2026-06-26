/** Geography module session context (demo — replace with auth when backend is wired). */
export const GEOGRAPHY_CURRENT_USER = "Admin";

/** Roles allowed to manually add/edit postal records outside bulk upload. */
export const POSTAL_MASTER_ADMIN_ROLES = new Set(["Admin", "Super Admin"]);

export function isPostalMasterSuperAdmin(userRole = GEOGRAPHY_CURRENT_USER): boolean {
  return POSTAL_MASTER_ADMIN_ROLES.has(userRole);
}

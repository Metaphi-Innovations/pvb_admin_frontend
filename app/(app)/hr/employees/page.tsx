"use client";

import EmployeesPageClient from "./EmployeesPageClient";

/**
 * Direct client page (not lazy) so the directory always mounts with the HR shell.
 * Avoids blank main pane when dynamic chunks fail after a corrupted .next cache.
 */
export default function EmployeesPage() {
  return <EmployeesPageClient />;
}

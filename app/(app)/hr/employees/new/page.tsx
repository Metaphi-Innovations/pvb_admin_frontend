"use client";

import EmployeesPageClient from "../EmployeesPageClient";

/**
 * Direct `/hr/employees/new` keeps the Employee Directory shell visible
 * and opens the same Add Employee overlay used from the directory.
 */
export default function NewEmployeePage() {
  return <EmployeesPageClient openCreateOnMount />;
}

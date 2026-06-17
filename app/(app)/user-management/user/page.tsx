import { redirect } from "next/navigation";

/** Legacy route — canonical user module is /user-management/employee */
export default function LegacyUserListingPage() {
  redirect("/user-management/employee");
}

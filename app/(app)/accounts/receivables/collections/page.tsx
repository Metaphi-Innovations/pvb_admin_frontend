import { redirect } from "next/navigation";

export default function CollectionTrackingRedirectPage() {
  redirect("/accounts/receivables/outstanding?view=collection");
}

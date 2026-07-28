import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";
import { Gstr1SectionPage } from "../Gstr1SectionPage";

const Page = lazyAccountsPage(() =>
  Promise.resolve({ default: () => <Gstr1SectionPage sectionId="export-sez" /> }),
);

export default function ExportSezInvoicesPage() {
  return <Page />;
}

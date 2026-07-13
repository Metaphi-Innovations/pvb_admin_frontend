import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";
import { Gstr1SectionPage } from "../Gstr1SectionPage";

const Page = lazyAccountsPage(() =>
  Promise.resolve({ default: () => <Gstr1SectionPage sectionId="b2c-small" /> }),
);

export default function B2cSmallInvoicesPage() {
  return <Page />;
}

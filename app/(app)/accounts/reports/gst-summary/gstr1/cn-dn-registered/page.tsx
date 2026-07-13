import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";
import { Gstr1SectionPage } from "../Gstr1SectionPage";

const Page = lazyAccountsPage(() =>
  Promise.resolve({ default: () => <Gstr1SectionPage sectionId="cn-dn-registered" /> }),
);

export default function CnDnRegisteredPage() {
  return <Page />;
}

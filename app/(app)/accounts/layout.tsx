import AccountsLayoutClient from "./AccountsLayoutClient";

/** Accounts module is client-heavy (localStorage, COA tree) — skip static prerender. */
export const dynamic = "force-dynamic";

export default function AccountsLayout({ children }: { children: React.ReactNode }) {
  return <AccountsLayoutClient>{children}</AccountsLayoutClient>;
}

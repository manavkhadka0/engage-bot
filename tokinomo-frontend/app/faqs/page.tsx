import {
  TerminalFooter,
  TerminalNav,
} from "@/components/marketing/terminal-chrome";

export const metadata = { title: "FAQs" };

const faqs = [
  {
    q: "Who can create a brand workspace?",
    a: "Only PLATFORM_OWNER and PLATFORM_OPERATOR. They create the tenant and the first BRAND_ADMIN from /admin/tenants.",
  },
  {
    q: "What do brand roles mean?",
    a: "BRAND_ADMIN invites users and manages locations/products. BRAND_STAFF uploads and pushes audio. BRAND_VIEWER reads devices and analytics only.",
  },
  {
    q: "Can one brand see another brand’s devices?",
    a: "No. Tenant isolation is enforced in the API and with Postgres RLS. Cross-tenant reads fail closed.",
  },
  {
    q: "How does live status work?",
    a: "Devices publish MQTT status; the API mirrors presence and pushes device.status events over Socket.IO to the dashboard.",
  },
  {
    q: "What happens if I don’t renew the platform?",
    a: "The unit can fall back to a single local clip with no remote updates or analytics — the platform is what keeps campaigns live.",
  },
  {
    q: "Where do I sign in?",
    a: "Use /login. Platform roles route to /admin; brand members route to /app/[tenantSlug].",
  },
];

export default function FaqsPage() {
  return (
    <>
      <TerminalNav />
      <main className="page-gutter flex-1 py-14 md:py-20">
        <p className="text-[var(--text-sm)] text-[var(--color-muted)]">
          faqs --ask
        </p>
        <h1 className="mt-3 text-[length:var(--text-display-s)]">FAQs</h1>
        <div className="mt-10 max-w-[65ch] space-y-0">
          {faqs.map((item) => (
            <details
              key={item.q}
              className="group border-b border-[var(--color-rule)] py-4"
            >
              <summary className="cursor-pointer list-none text-[var(--color-ink)] marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="text-[var(--color-accent)]">?</span> {item.q}
              </summary>
              <p className="mt-3 text-[var(--color-ink-2)]">{item.a}</p>
            </details>
          ))}
        </div>
      </main>
      <TerminalFooter />
    </>
  );
}

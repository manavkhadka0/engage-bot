import {
  TerminalFooter,
  TerminalNav,
} from "@/components/marketing/terminal-chrome";

export const metadata = { title: "Features" };

const features = [
  {
    title: "Live fleet status",
    body: "Online/offline dots update over WebSocket. Colour plus label — never colour alone.",
  },
  {
    title: "Tenant isolation",
    body: "Every query is scoped by organization. Platform roles can impersonate with x-tenant-id; brands cannot cross the fence.",
  },
  {
    title: "Audio push with ack",
    body: "Upload a WAV clip to MinIO, assign devices, push OTA. Watch queued → sent → acked/failed per unit.",
  },
  {
    title: "Subscriptions",
    body: "6-month trial with hardware, then Basic 500 / Growth 800 / Brand 1,200 NPR per device. Feature gates match the paid plan.",
  },
  {
    title: "Dwell & plays",
    body: "Today’s detections, plays, and dwell averages for the active tenant — built for marketing reviews (Growth+).",
  },
  {
    title: "Fake device lab",
    body: "No hardware yet? Provision → assign → Simulate loop from /admin/devices to exercise the full dashboard.",
  },
];

export default function FeaturesPage() {
  return (
    <>
      <TerminalNav />
      <main className="page-gutter flex-1 py-14 md:py-20">
        <p className="text-[var(--text-sm)] text-[var(--color-muted)]">
          features --list
        </p>
        <h1 className="mt-3 text-[length:var(--text-display-s)]">Features</h1>
        <p className="mt-3 max-w-[50ch] text-[var(--color-ink-2)]">
          What the console does when devices are on the shelf.
        </p>
        <dl className="mt-12 divide-y divide-[var(--color-rule)] border-y border-[var(--color-rule)]">
          {features.map((f) => (
            <div
              key={f.title}
              className="grid gap-2 py-5 md:grid-cols-[minmax(0,14rem)_1fr] md:gap-8"
            >
              <dt className="text-[var(--color-accent)]">{f.title}</dt>
              <dd className="text-[var(--color-ink-2)]">{f.body}</dd>
            </div>
          ))}
        </dl>
      </main>
      <TerminalFooter />
    </>
  );
}

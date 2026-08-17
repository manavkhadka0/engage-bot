const GROUPS: Array<{
  title: string;
  items: Array<[string, string]>;
}> = [
  {
    title: "Devices and fleet",
    items: [
      [
        "Device registry",
        "Every unit is a record scoped to one brand, tied to a store and the product it sits with.",
      ],
      [
        "Live status",
        "Online and offline transitions arrive over a socket, so the fleet view changes without a refresh.",
      ],
      [
        "Provisioning",
        "Baliyo assigns a factory serial to a brand, a location and a product; the unit reports in from there.",
      ],
      [
        "Uptime",
        "Recorded per device, alongside the offline transitions that produced it.",
      ],
    ],
  },
  {
    title: "Audio",
    items: [
      ["Clip library", "Each brand uploads and keeps its own audio."],
      [
        "Over-the-air push",
        "Assign a clip to any set of devices and send it; no store visit and no SD card.",
      ],
      [
        "Per-device acknowledgement",
        "Queued, sent, acknowledged or failed, tracked for each unit rather than for the batch.",
      ],
    ],
  },
  {
    title: "Measurement",
    items: [
      [
        "Presence detection",
        "A 24 GHz millimetre-wave sensor registers a shopper who stops, including one standing perfectly still. There is no camera and no microphone in the enclosure.",
      ],
      ["Dwell time", "How long the stop lasted, per detection."],
      ["Audio plays", "Every trigger logged with the device that fired it."],
      [
        "Analytics",
        "Fleet KPIs, dwell distribution, plays over time and a per-store breakdown.",
      ],
    ],
  },
  {
    title: "Tenancy and access",
    items: [
      [
        "Tenant isolation",
        "Scope is derived from the session on the server, never from anything the browser sends.",
      ],
      [
        "Roles",
        "Brand admin, staff and viewer; platform owner and operator on the Baliyo side.",
      ],
      ["User invitation", "Brands invite and manage their own people."],
      [
        "Operator assist",
        "A platform operator can open a brand workspace to help or train, and the console shows that state explicitly instead of browsing silently.",
      ],
    ],
  },
  {
    title: "Commercial",
    items: [
      [
        "Tiers",
        "Basic, Growth and Brand, differing in how many clips a device carries and whether event theming is included.",
      ],
      ["Tenant lifecycle", "Create, suspend, and change a brand's tier."],
      ["Billing", "Subscription state visible to both sides."],
    ],
  },
  {
    title: "Hardware context",
    items: [
      [
        "Battery with mains charging",
        "A unit survives a power cut and does not need a free shelf outlet.",
      ],
      [
        "Wi-Fi, no SIM",
        "The store supplies the network. Per-unit cellular was rejected as too expensive at fleet scale.",
      ],
      [
        "ESP32-S3 firmware over MQTT",
        "Telemetry up, audio and configuration down, on the same channel.",
      ],
    ],
  },
];

const NOT_BUILT: Array<[string, string]> = [
  [
    "Global fleet map",
    "Planned. Device locations are recorded, but there is no map view.",
  ],
  [
    "Monthly PDF report",
    "Planned. Analytics are live in the console; there is no export.",
  ],
  [
    "Nepali and English localisation",
    "On the backlog. The console ships in English.",
  ],
  [
    "White-label theming per brand",
    "Under consideration, tied to the top tier. Not committed.",
  ],
  [
    "Role-gated console UI",
    "Roles are defined and carried in the session, but only user management is gated by them today.",
  ],
];

export function CapabilityIndex() {
  return (
    <section aria-labelledby="index-heading">
      <h2
        id="index-heading"
        className="text-[length:var(--text-display-s)] font-semibold tracking-tight text-[var(--color-ink)]"
      >
        Everything, in one list.
      </h2>
      <p className="mt-4 max-w-[56ch] text-[length:var(--text-lg)] text-[var(--color-ink-2)]">
        The sandbox shows five things. This is the rest, written plainly for
        whoever has to forward it to a colleague.
      </p>

      <div className="mt-12 space-y-12">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <h3 className="font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-accent)] uppercase">
              {group.title}
            </h3>
            <dl className="mt-4 border-t border-[var(--color-rule)]">
              {group.items.map(([name, description]) => (
                <div
                  key={name}
                  className="grid gap-1 border-b border-[var(--color-rule)] py-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:gap-8"
                >
                  <dt className="font-medium text-[var(--color-ink)]">
                    {name}
                  </dt>
                  <dd className="max-w-[62ch] text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
                    {description}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      <div className="mt-16 rounded-[var(--radius-card)] border border-dashed border-[var(--color-rule-2)] p-6 md:p-8">
        <h3 className="text-[length:var(--text-xl)] font-semibold text-[var(--color-ink)]">
          Not built yet
        </h3>
        <p className="mt-3 max-w-[62ch] text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          Listed because a platform this young is easier to trust when it shows
          its edges. None of these has a delivery date, and none of them is
          included in a tier today.
        </p>
        <dl className="mt-6 border-t border-[var(--color-rule)]">
          {NOT_BUILT.map(([name, note]) => (
            <div
              key={name}
              className="grid gap-1 border-b border-[var(--color-rule)] py-4 last:border-0 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:gap-8"
            >
              <dt className="font-medium text-[var(--color-muted)]">{name}</dt>
              <dd className="max-w-[62ch] text-[length:var(--text-sm)] text-[var(--color-muted)]">
                {note}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

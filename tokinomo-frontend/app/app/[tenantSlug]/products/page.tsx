"use client";

import { use } from "react";
import { useProducts } from "@/hooks/use-api";
import { useTenantContext } from "@/hooks/use-tenant";
import { EmptyState, Panel } from "@/components/ui/panel";

export default function BrandProductsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = use(params);
  const { tenantId } = useTenantContext(tenantSlug);
  const products = useProducts(tenantId);
  const list = products.data ?? [];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[var(--text-sm)] text-[var(--color-muted)]">
          {tenantSlug} --products
        </p>
        <h1 className="mt-1 text-[length:var(--text-2xl)]">Products</h1>
      </div>

      <Panel title="SKUs">
        {products.isLoading ? (
          <p className="text-[var(--color-muted)]">Loading…</p>
        ) : list.length === 0 ? (
          <EmptyState
            title="No products yet"
            body="Add SKUs so devices can be mapped to what they advertise."
          />
        ) : (
          <ul className="divide-y divide-[var(--color-rule)]">
            {list.map((p) => (
              <li
                key={p.id}
                className="flex justify-between gap-3 py-3 text-[var(--text-sm)]"
              >
                <span>{p.name}</span>
                <span className="text-[var(--color-muted)]">
                  {p.sku ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

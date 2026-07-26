import { BrandShell } from "@/components/shells/brand-shell";

export default async function BrandLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  return <BrandShell tenantSlug={tenantSlug}>{children}</BrandShell>;
}

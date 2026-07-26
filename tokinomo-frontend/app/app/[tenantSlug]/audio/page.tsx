"use client";

import { use, useMemo, useState } from "react";
import {
  useAudio,
  useDevices,
  usePushAudio,
  useUploadAudio,
} from "@/hooks/use-api";
import { useTenantContext } from "@/hooks/use-tenant";
import { EmptyState, Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

export default function BrandAudioPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = use(params);
  const { tenantId } = useTenantContext(tenantSlug);
  const audio = useAudio(tenantId);
  const devices = useDevices(tenantId);
  const upload = useUploadAudio(tenantId);
  const push = usePushAudio(tenantId);

  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [selectedClip, setSelectedClip] = useState("");
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastPush, setLastPush] = useState<
    Array<{ commandId: string; status?: string }> | null
  >(null);

  const clips = audio.data ?? [];
  const deviceList = devices.data ?? [];
  const allSelected = useMemo(
    () =>
      deviceList.length > 0 && selectedDevices.length === deviceList.length,
    [deviceList.length, selectedDevices.length],
  );

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!file) {
      setError("Choose a WAV file (PCM mono 16 kHz, ≤512 KB).");
      return;
    }
    try {
      const clip = await upload.mutateAsync({
        file,
        name: name || undefined,
      });
      setName("");
      setFile(null);
      setSelectedClip(clip.id);
      setMessage(`Uploaded “${clip.name}” · sha256 ${clip.checksum?.slice(0, 12)}…`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  async function onPush(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLastPush(null);
    if (!selectedClip || selectedDevices.length === 0) {
      setError("Pick a clip and at least one device.");
      return;
    }
    try {
      const res = (await push.mutateAsync({
        audioId: selectedClip,
        deviceIds: selectedDevices,
      })) as {
        commands?: Array<{ id: string; status: string }>;
        published?: Array<{ commandId: string }>;
      };
      setLastPush(
        (res.commands ?? []).map((c) => ({
          commandId: c.id,
          status: c.status,
        })),
      );
      setMessage(
        `Push sent to ${selectedDevices.length} device(s) — fake ack arrives in ~400ms.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Push failed");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[var(--text-sm)] text-[var(--color-muted)]">
          {tenantSlug} --audio
        </p>
        <h1 className="mt-1 text-[length:var(--text-2xl)]">Audio library</h1>
        <p className="mt-2 text-[var(--text-sm)] text-[var(--color-muted)]">
          Upload WAV → push OTA. BASIC tier = 1 clip; GROWTH/BRAND = unlimited.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="upload wav">
          <form onSubmit={onUpload} className="space-y-3">
            <div>
              <Label htmlFor="clip">Clip name</Label>
              <Input
                id="clip"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dashain promo v2"
              />
            </div>
            <div>
              <Label htmlFor="file">WAV file</Label>
              <Input
                id="file"
                type="file"
                accept=".wav,audio/wav"
                required
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <Button type="submit" disabled={upload.isPending}>
              {upload.isPending ? "Uploading…" : "Upload →"}
            </Button>
          </form>
        </Panel>

        <Panel title="push to devices">
          <form onSubmit={onPush} className="space-y-3">
            <div>
              <Label htmlFor="sel-clip">Clip</Label>
              <select
                id="sel-clip"
                className="h-9 w-full border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 font-mono text-[var(--text-sm)]"
                value={selectedClip}
                onChange={(e) => setSelectedClip(e.target.value)}
              >
                <option value="">Select clip</option>
                {clips.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (v{c.version})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <Label className="mb-0">Devices</Label>
                <button
                  type="button"
                  className="text-[var(--text-xs)] text-[var(--color-accent)] underline"
                  onClick={() =>
                    setSelectedDevices(
                      allSelected ? [] : deviceList.map((d) => d.id),
                    )
                  }
                >
                  {allSelected ? "clear" : "select all"}
                </button>
              </div>
              <ul className="max-h-40 space-y-1 overflow-y-auto border border-[var(--color-rule)] p-2">
                {deviceList.map((d) => (
                  <li key={d.id}>
                    <label className="flex cursor-pointer items-center gap-2 text-[var(--text-sm)]">
                      <input
                        type="checkbox"
                        checked={selectedDevices.includes(d.id)}
                        onChange={(e) => {
                          setSelectedDevices((prev) =>
                            e.target.checked
                              ? [...prev, d.id]
                              : prev.filter((id) => id !== d.id),
                          );
                        }}
                      />
                      {d.serial}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
            <Button type="submit" disabled={push.isPending}>
              {push.isPending ? "Queuing…" : "Push →"}
            </Button>
          </form>
        </Panel>
      </div>

      {message ? (
        <p className="text-[var(--color-accent)]">{message}</p>
      ) : null}
      {error ? <p className="text-[var(--color-danger)]">{error}</p> : null}

      {lastPush ? (
        <Panel title="command ack">
          <ul className="space-y-1 font-mono text-[var(--text-xs)]">
            {lastPush.map((c) => (
              <li key={c.commandId}>
                {c.commandId.slice(0, 10)}… · {c.status ?? "QUEUED"} → watch for
                ACKED
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel title={`${clips.length} clips`}>
        {audio.isLoading ? (
          <p className="text-[var(--color-muted)]">Loading…</p>
        ) : clips.length === 0 ? (
          <EmptyState
            title="Library empty"
            body="Upload a WAV, select devices, then Push."
          />
        ) : (
          <ul className="divide-y divide-[var(--color-rule)]">
            {clips.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap justify-between gap-2 py-3 text-[var(--text-sm)]"
              >
                <span>{c.name}</span>
                <span className="text-[var(--color-muted)]">
                  v{c.version}
                  {c.checksum ? ` · ${c.checksum.slice(0, 8)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

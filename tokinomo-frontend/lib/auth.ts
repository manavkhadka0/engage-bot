"use client";

import { createAuthClient } from "better-auth/react";
import {
  adminClient,
  organizationClient,
} from "better-auth/client/plugins";
import { env } from "@/lib/env";

export const authClient = createAuthClient({
  // Same-origin via Next rewrite → backend /api/auth/*
  baseURL: env.NEXT_PUBLIC_APP_URL,
  plugins: [organizationClient(), adminClient()],
});

export const {
  signIn,
  signOut,
  useSession,
  useActiveOrganization,
  useListOrganizations,
} = authClient;

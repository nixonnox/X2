"use client";

import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@x2/api";

export const trpc = createTRPCReact<AppRouter>();

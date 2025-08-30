import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { z } from "zod";

async function triggerRevalidate(username: string) {
  try {
    const base = process.env.WORKER_REVALIDATE_URL || "http://localhost:8787/_revalidate";
    const secret = process.env.REVALIDATE_SECRET || "change-me";
    const url = `${base}?username=${encodeURIComponent(username)}&secret=${encodeURIComponent(secret)}`;
    await fetch(url, { method: "GET" });
  } catch (e) {
    console.warn("revalidate failed:", e);
  }
}

// Reuse a strict schema so app can't write junk
const LinkSchema = z.object({
  label: z.string().min(1).max(80),
  url: z.string().url(),
  order: z.number().int().nonnegative().default(0),
});

const BodySchema = z.object({
  // In real app this comes from session; for MVP we allow an explicit username or default to testuser
  username: z
    .string()
    .regex(/^[a-z0-9_]{3,20}$/i)
    .optional()
    .default("testuser"),
  displayName: z.string().min(1).max(80),
  bio: z.string().max(280).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  links: z.array(LinkSchema).max(100).default([]),
});

type Resp =
  | { ok: true; profileId: string }
  | { ok: false; error: string; issues?: z.ZodIssue[] };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Resp>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  let parsed;
  try {
    parsed = BodySchema.parse(req.body);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ ok: false, error: "invalid_body", issues: err.issues });
    }
    return res.status(400).json({ ok: false, error: "invalid_body" });
  }

  const { username, displayName, bio, avatarUrl, links } = parsed;

  try {
    // Ensure the user exists (stubbed email for MVP)
    const user = await prisma.user.upsert({
      where: { username },
      update: {},
      create: {
        username,
        email: `${username}@example.com`,
      },
    });

    // Ensure a page exists and update its basic fields
    const page = await prisma.page.upsert({
      where: { userId: user.id },
      update: {
        displayName,
        bio: bio ?? null,
        avatarUrl: avatarUrl ?? null,
      },
      create: {
        userId: user.id,
        displayName,
        bio: bio ?? null,
        avatarUrl: avatarUrl ?? null,
      },
    });

    await prisma.$transaction([
      prisma.link.deleteMany({ where: { pageId: page.id } }),
      prisma.link.createMany({
        data: links.map((l, idx) => ({
          pageId: page.id,
          label: l.label,
          url: l.url,
          order: Number.isInteger(l.order) ? l.order : idx,
        })),
      }),
    ]);

    // Fire-and-forget: purge the edge cache for this username
    triggerRevalidate(username);

    return res.status(200).json({ ok: true, profileId: page.id });
  } catch (err) {
    console.error("/api/page/upsert error", err);
    return res.status(500).json({ ok: false, error: "server_error" });
  }
}
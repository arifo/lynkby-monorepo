import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";

type LinkDTO = { label: string; url: string; order: number };
type ProfileDTO = {
  username: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  links: LinkDTO[];
};

type Resp =
  | { ok: true; profile: ProfileDTO }
  | { ok: false; error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Resp>
) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  // For now: allow ?username=... with default "testuser"
  const username = String(req.query.username || "testuser").toLowerCase();

  try {
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        page: {
          include: { links: { orderBy: { order: "asc" } } },
        },
      },
    });

    if (!user || !user.page) {
      return res.status(404).json({ ok: false, error: "not_found" });
    }

    const profile: ProfileDTO = {
      username: user.username,
      displayName: user.page.displayName,
      bio: user.page.bio,
      avatarUrl: user.page.avatarUrl,
      links: user.page.links.map((l) => ({
        label: l.label,
        url: l.url,
        order: l.order,
      })),
    };

    return res.status(200).json({ ok: true, profile });
  } catch (err) {
    console.error("/api/page/get error", err);
    return res.status(500).json({ ok: false, error: "server_error" });
  }
}
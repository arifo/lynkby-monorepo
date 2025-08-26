
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const RESERVED = new Set([
  "www","app","api","admin","static","cdn","help","support","mail","blog","docs","status","dev","staging","assets"
]);

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/i;

type Resp = { available: boolean; reason?: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<Resp>) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ available: false, reason: "method_not_allowed" });
  }

  const username = String(req.query.username || "").trim().toLowerCase();
  if (!username) {
    return res.status(400).json({ available: false, reason: "missing_username" });
  }

  if (!USERNAME_REGEX.test(username)) {
    return res.status(200).json({ available: false, reason: "invalid_format" });
  }

  if (RESERVED.has(username)) {
    return res.status(200).json({ available: false, reason: "reserved" });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { username } });
    return res.status(200).json({ available: !Boolean(existing) });
  } catch (err) {
    console.error("/api/username/check error", err);
    return res.status(500).json({ available: false, reason: "server_error" });
  }
}
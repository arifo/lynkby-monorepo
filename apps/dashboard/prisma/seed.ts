import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // idempotent seed: upsert a user + their page + links
  const user = await prisma.user.upsert({
    where: { email: "test@lynkby.com" },
    update: {},
    create: {
      email: "test@lynkby.com",
      username: "testuser",
      page: {
        create: {
          displayName: "Test User",
          bio: "This is a placeholder Lynkby page. Ultra-fast, TikTok-friendly.",
          avatarUrl: "https://placehold.co/128x128/png",
          links: {
            create: [
              { label: "My TikTok", url: "https://www.tiktok.com/@" , order: 1 },
              { label: "Shop", url: "https://example.com/shop", order: 2 },
              { label: "YouTube", url: "https://youtube.com", order: 3 }
            ]
          }
        }
      }
    }
  });

  console.log("Seeded user:", user.username);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
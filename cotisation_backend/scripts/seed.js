import prisma from "../src/config/prisma.js";
import { hashPassword } from "../src/utils/hash.js";

async function main() {
  const email = "admin@cotisations.com";
  const phone = "77000000";

  const exists = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { phone }],
    },
  });

  if (exists) {
    console.log("ℹ️ Admin existe déjà :", exists.email);
    return;
  }

  const passwordHash = await hashPassword("Admin@123");

  const admin = await prisma.user.create({
    data: {
      fullName: "Super Admin",
      email,
      phone,
      country: "Djibouti",
      city: "Djibouti",
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  console.log("✅ Admin créé avec succès");
  console.log("📧 Email :", email);
  console.log("🔑 Mot de passe :", "Admin@123");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

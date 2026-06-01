import prisma from "../src/config/prisma.js";
import { hashPassword } from "../src/utils/hash.js";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable d'environnement manquante pour le seed : ${name}`);
  }
  return value;
}

const users = [
  {
    fullName: "Administrateur",
    email: requiredEnv("SEED_ADMIN_EMAIL"),
    phone: process.env.SEED_ADMIN_PHONE || "77000000",
    role: "ADMIN",
    password: requiredEnv("SEED_ADMIN_PASSWORD"),
  },
  {
    fullName: "Gestionnaire de Depense",
    email: requiredEnv("SEED_EXPENSE_MANAGER_EMAIL"),
    phone: process.env.SEED_EXPENSE_MANAGER_PHONE || "77111111",
    role: "GESTIONNAIRE_DEPENSE",
    password: requiredEnv("SEED_EXPENSE_MANAGER_PASSWORD"),
  },
  {
    fullName: "Super Admin",
    email: requiredEnv("SEED_SUPER_ADMIN_EMAIL"),
    phone: process.env.SEED_SUPER_ADMIN_PHONE || "77222222",
    role: "SUPER_ADMIN",
    password: requiredEnv("SEED_SUPER_ADMIN_PASSWORD"),
  },
  {
    fullName: "Tresorerie",
    email: requiredEnv("SEED_TREASURY_EMAIL"),
    phone: process.env.SEED_TREASURY_PHONE || "77333333",
    role: "EQUIPE_TRESORERIE",
    password: requiredEnv("SEED_TREASURY_PASSWORD"),
  },
];

async function main() {
  for (const user of users) {
    const exists = await prisma.user.findFirst({
      where: {
        OR: [{ email: user.email }, { phone: user.phone }],
      },
    });

    if (exists) {
      if (user.role === "SUPER_ADMIN") {
        await prisma.user.update({
          where: { id: exists.id },
          data: {
            fullName: user.fullName,
            email: user.email,
            role: "SUPER_ADMIN",
            status: "ACTIVE",
          },
        });
        console.log(`Super Admin verifie : ${user.email}`);
      } else {
        console.log(`Utilisateur existe deja : ${user.email}`);
      }
      continue;
    }

    const passwordHash = await hashPassword(user.password);

    await prisma.user.create({
      data: {
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        country: "Djibouti",
        city: "Djibouti",
        passwordHash,
        role: user.role,
        status: "ACTIVE",
      },
    });

    console.log(`Cree : ${user.email} | ${user.role}`);
  }
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

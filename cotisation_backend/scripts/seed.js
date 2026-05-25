import prisma from "../src/config/prisma.js";
import { hashPassword } from "../src/utils/hash.js";

const users = [
  {
    fullName: "Administrateur",
    email: "adaweo1@yahoo.fr",
    phone: "77000000",
    role: "ADMIN",
    password: "Admin@123",
  },
  {
    fullName: "Gestionnaire de Dépense",
    email: "adaweo2@yahoo.fr",
    phone: "77111111",
    role: "GESTIONNAIRE_DEPENSE",
    password: "Gestion@123",
  },
  {
    fullName: "Ougass",
    email: "adaweo3@yahoo.fr",
    phone: "77222222",
    role: "SUPER_ADMIN",
    password: "Super@123",
  },
  {
    fullName: "Trésorerie",
    email: "adaweo4@yahoo.fr",
    phone: "77333333",
    role: "EQUIPE_TRESORERIE",
    password: "Tresor@123",
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
        console.log(`ℹ️ Super Admin vérifié : ${user.email}`);
      } else {
        console.log(`ℹ️ Utilisateur existe déjà : ${user.email}`);
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

    console.log(`✅ Créé : ${user.email} | ${user.role}`);
    console.log(`🔑 Mot de passe : ${user.password}`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
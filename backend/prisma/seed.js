import bcrypt from "bcrypt";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const defaultPassword = await bcrypt.hash("Pass@123", 12);

  const flatA101 = await prisma.flat.upsert({
    where: { block_flatNumber: { block: "A", flatNumber: "101" } },
    update: {},
    create: { block: "A", flatNumber: "101" },
  });

  await prisma.user.upsert({
    where: { email: "admin@society.local" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@society.local",
      passwordHash: defaultPassword,
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: "guard@society.local" },
    update: {},
    create: {
      name: "Gate Guard",
      email: "guard@society.local",
      passwordHash: defaultPassword,
      role: Role.SECURITY,
    },
  });

  const memberUser = await prisma.user.upsert({
    where: { email: "member@society.local" },
    update: { flatId: flatA101.id },
    create: {
      name: "Flat Member",
      email: "member@society.local",
      passwordHash: defaultPassword,
      role: Role.MEMBER,
      flatId: flatA101.id,
    },
  });

  await prisma.member.upsert({
    where: { userId: memberUser.id },
    update: { flatId: flatA101.id, isOwner: true },
    create: {
      userId: memberUser.id,
      flatId: flatA101.id,
      isOwner: true,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { RoomStatus, TenantStatus } from "../src/lib/constants";

const prisma = new PrismaClient();

async function main() {
  const ownerPasswordHash = await bcrypt.hash("owner123", 10);
  const owner = await prisma.owner.upsert({
    where: { email: "pemilik@kos.test" },
    update: {},
    create: {
      name: "Pak Hartono",
      email: "pemilik@kos.test",
      passwordHash: ownerPasswordHash,
    },
  });

  const property = await prisma.property.upsert({
    where: { id: "property-demo" },
    update: {},
    create: {
      id: "property-demo",
      ownerId: owner.id,
      name: "Kos Melati Asri",
      address: "Jl. Melati No. 12, Yogyakarta",
    },
  });

  const roomData = [
    { number: "101", monthlyRent: 850_000 },
    { number: "102", monthlyRent: 850_000 },
    { number: "103", monthlyRent: 950_000 },
  ];

  const rooms = [];
  for (const data of roomData) {
    const room = await prisma.room.upsert({
      where: { propertyId_number: { propertyId: property.id, number: data.number } },
      update: {},
      create: { propertyId: property.id, number: data.number, monthlyRent: data.monthlyRent },
    });
    rooms.push(room);
  }

  const tenantPasswordHash = await bcrypt.hash("tenant123", 10);
  const tenant = await prisma.tenant.upsert({
    where: { email: "penghuni@kos.test" },
    update: {},
    create: {
      roomId: rooms[0].id,
      name: "Siti Rahma",
      email: "penghuni@kos.test",
      passwordHash: tenantPasswordHash,
      phone: "081234567890",
      status: TenantStatus.ACTIVE,
    },
  });

  await prisma.room.update({
    where: { id: rooms[0].id },
    data: { status: RoomStatus.OCCUPIED },
  });

  console.log("Seed selesai:");
  console.log(`- Kos: ${property.name}`);
  console.log(`- Kamar: ${rooms.map((r) => r.number).join(", ")}`);
  console.log("- Login pemilik: pemilik@kos.test / owner123");
  console.log(`- Login penghuni: penghuni@kos.test / tenant123 (kamar ${rooms[0].number})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

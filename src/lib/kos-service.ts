import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { InvoiceStatus, RoomStatus, TenantStatus } from "@/lib/constants";

export class KosError extends Error {}

export async function getOwnerProperties(ownerId: string) {
  return prisma.property.findMany({
    where: { ownerId },
    orderBy: { createdAt: "asc" },
  });
}

export async function getOwnerRooms(ownerId: string) {
  return prisma.room.findMany({
    where: { property: { ownerId } },
    orderBy: [{ propertyId: "asc" }, { number: "asc" }],
    include: {
      property: true,
      tenants: {
        where: { status: TenantStatus.ACTIVE },
        select: { id: true, name: true, email: true, phone: true },
      },
    },
  });
}

async function assertPropertyOwnedBy(ownerId: string, propertyId: string) {
  const property = await prisma.property.findFirst({ where: { id: propertyId, ownerId } });
  if (!property) throw new KosError("Properti tidak ditemukan");
  return property;
}

async function assertRoomOwnedBy(ownerId: string, roomId: string) {
  const room = await prisma.room.findFirst({
    where: { id: roomId, property: { ownerId } },
  });
  if (!room) throw new KosError("Kamar tidak ditemukan");
  return room;
}

export async function createRoom(
  ownerId: string,
  params: { propertyId: string; number: string; monthlyRent: number },
) {
  await assertPropertyOwnedBy(ownerId, params.propertyId);

  const existing = await prisma.room.findFirst({
    where: { propertyId: params.propertyId, number: params.number },
  });
  if (existing) throw new KosError("Nomor kamar sudah ada di properti ini");

  return prisma.room.create({
    data: {
      propertyId: params.propertyId,
      number: params.number,
      monthlyRent: params.monthlyRent,
    },
  });
}

export async function getOwnerTenants(ownerId: string) {
  return prisma.tenant.findMany({
    where: { room: { property: { ownerId } } },
    orderBy: { createdAt: "desc" },
    include: { room: { include: { property: true } } },
  });
}

export async function createTenant(
  ownerId: string,
  params: {
    roomId: string;
    name: string;
    email: string;
    password: string;
    phone: string;
  },
) {
  const room = await assertRoomOwnedBy(ownerId, params.roomId);
  if (room.status === RoomStatus.OCCUPIED) {
    throw new KosError("Kamar ini sudah terisi penghuni lain");
  }

  const existingEmail = await prisma.tenant.findUnique({ where: { email: params.email } });
  if (existingEmail) throw new KosError("Email penghuni sudah terdaftar");

  const passwordHash = await bcrypt.hash(params.password, 10);

  const tenant = await prisma.$transaction(async (tx) => {
    const created = await tx.tenant.create({
      data: {
        roomId: room.id,
        name: params.name,
        email: params.email,
        passwordHash,
        phone: params.phone,
        status: TenantStatus.ACTIVE,
      },
    });
    await tx.room.update({ where: { id: room.id }, data: { status: RoomStatus.OCCUPIED } });
    return created;
  });

  return tenant;
}

export async function checkoutTenant(ownerId: string, tenantId: string) {
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, room: { property: { ownerId } } },
  });
  if (!tenant) throw new KosError("Penghuni tidak ditemukan");
  if (tenant.status === TenantStatus.INACTIVE) {
    throw new KosError("Penghuni ini sudah tidak aktif");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.tenant.update({
      where: { id: tenantId },
      data: { status: TenantStatus.INACTIVE, endDate: new Date(), roomId: null },
    });
    if (tenant.roomId) {
      await tx.room.update({ where: { id: tenant.roomId }, data: { status: RoomStatus.VACANT } });
    }
    return updated;
  });
}

export async function getOwnerInvoices(ownerId: string) {
  return prisma.invoice.findMany({
    where: { tenant: { room: { property: { ownerId } } } },
    orderBy: [{ period: "desc" }, { createdAt: "desc" }],
    include: { tenant: { include: { room: true } } },
  });
}

export async function markInvoicePaid(ownerId: string, invoiceId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenant: { room: { property: { ownerId } } } },
  });
  if (!invoice) throw new KosError("Tagihan tidak ditemukan");
  if (invoice.status === InvoiceStatus.PAID) {
    throw new KosError("Tagihan ini sudah lunas");
  }

  return prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: InvoiceStatus.PAID, paidAt: new Date() },
  });
}

export async function getOwnerSummary(ownerId: string) {
  const rooms = await prisma.room.findMany({ where: { property: { ownerId } } });
  const occupied = rooms.filter((r) => r.status === RoomStatus.OCCUPIED).length;

  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const invoices = await prisma.invoice.findMany({
    where: { period, tenant: { room: { property: { ownerId } } } },
  });

  const revenue = invoices
    .filter((invoice) => invoice.status === "PAID")
    .reduce((sum, invoice) => sum + invoice.amount, 0);
  const outstanding = invoices.filter((invoice) => invoice.status === "UNPAID").length;

  return {
    period,
    totalRooms: rooms.length,
    occupiedRooms: occupied,
    vacantRooms: rooms.length - occupied,
    revenueThisPeriod: revenue,
    outstandingInvoices: outstanding,
  };
}

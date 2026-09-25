import { prisma } from "@/lib/prisma";
import { InvoiceStatus, PaymentStatus } from "@/lib/constants";
import { getSnapClient, verifyMidtransSignature } from "@/lib/midtrans";

export class PaymentError extends Error {}

export async function createPaymentForInvoice(tenantId: string, invoiceId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId },
    include: { tenant: true },
  });

  if (!invoice) throw new PaymentError("Tagihan tidak ditemukan");
  if (invoice.status !== InvoiceStatus.UNPAID) {
    throw new PaymentError("Tagihan ini sudah tidak berstatus belum bayar");
  }

  const orderId = `INV-${invoice.id}-${Date.now()}`;
  const [firstName, ...rest] = invoice.tenant.name.split(" ");

  const snap = getSnapClient();
  const transaction = await snap.createTransaction({
    transaction_details: { order_id: orderId, gross_amount: invoice.amount },
    customer_details: {
      first_name: firstName || invoice.tenant.name,
      last_name: rest.join(" ") || undefined,
      email: invoice.tenant.email,
      phone: invoice.tenant.phone,
    },
  });

  await prisma.payment.create({
    data: {
      invoiceId: invoice.id,
      orderId,
      amount: invoice.amount,
      status: PaymentStatus.PENDING,
      snapToken: transaction.token,
    },
  });

  return { token: transaction.token, orderId };
}

type MidtransNotificationPayload = {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  fraud_status?: string;
};

const SETTLED_STATUSES = new Set(["settlement", "capture"]);
const STATUS_MAP: Record<string, string> = {
  pending: PaymentStatus.PENDING,
  settlement: PaymentStatus.SETTLEMENT,
  capture: PaymentStatus.SETTLEMENT,
  expire: PaymentStatus.EXPIRE,
  cancel: PaymentStatus.CANCEL,
  deny: PaymentStatus.DENY,
};

export async function handleMidtransNotification(payload: MidtransNotificationPayload) {
  const validSignature = verifyMidtransSignature({
    orderId: payload.order_id,
    statusCode: payload.status_code,
    grossAmount: payload.gross_amount,
    signatureKey: payload.signature_key,
  });

  if (!validSignature) {
    throw new PaymentError("Signature notifikasi tidak valid");
  }

  const payment = await prisma.payment.findUnique({ where: { orderId: payload.order_id } });
  if (!payment) throw new PaymentError("Transaksi tidak ditemukan");

  const isSettled =
    SETTLED_STATUSES.has(payload.transaction_status) &&
    (payload.fraud_status === undefined || payload.fraud_status === "accept");

  const newStatus = isSettled
    ? PaymentStatus.SETTLEMENT
    : (STATUS_MAP[payload.transaction_status] ?? PaymentStatus.PENDING);

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: newStatus, rawNotification: JSON.stringify(payload) },
  });

  if (isSettled) {
    await prisma.invoice.update({
      where: { id: payment.invoiceId },
      data: { status: InvoiceStatus.PAID, paidAt: new Date() },
    });
  } else if (payload.transaction_status === "expire") {
    await prisma.invoice.update({
      where: { id: payment.invoiceId },
      data: { status: InvoiceStatus.EXPIRED },
    });
  }

  return { ok: true };
}

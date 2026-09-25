import crypto from "node:crypto";
import { Snap } from "midtrans-client";

let cachedClient: Snap | undefined;

/** Mode default sandbox (MIDTRANS_IS_PRODUCTION=false di .env.example). */
export function getSnapClient(): Snap {
  if (!cachedClient) {
    cachedClient = new Snap({
      isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
      serverKey: process.env.MIDTRANS_SERVER_KEY || "",
      clientKey: process.env.MIDTRANS_CLIENT_KEY || "",
    });
  }
  return cachedClient;
}

/** Verifikasi signature notifikasi webhook Midtrans sesuai dokumentasi resmi. */
export function verifyMidtransSignature(params: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  signatureKey: string;
}): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
  const expected = crypto
    .createHash("sha512")
    .update(params.orderId + params.statusCode + params.grossAmount + serverKey)
    .digest("hex");
  return expected === params.signatureKey;
}

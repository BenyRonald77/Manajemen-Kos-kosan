export const RoomStatus = {
  VACANT: "VACANT",
  OCCUPIED: "OCCUPIED",
} as const;
export type RoomStatus = (typeof RoomStatus)[keyof typeof RoomStatus];

export const TenantStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;
export type TenantStatus = (typeof TenantStatus)[keyof typeof TenantStatus];

export const InvoiceStatus = {
  UNPAID: "UNPAID",
  PAID: "PAID",
  EXPIRED: "EXPIRED",
} as const;
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export const PaymentStatus = {
  PENDING: "PENDING",
  SETTLEMENT: "SETTLEMENT",
  EXPIRE: "EXPIRE",
  CANCEL: "CANCEL",
  DENY: "DENY",
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const SessionRole = {
  OWNER: "OWNER",
  TENANT: "TENANT",
} as const;
export type SessionRole = (typeof SessionRole)[keyof typeof SessionRole];

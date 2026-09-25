declare module "midtrans-client" {
  export interface SnapTransactionParameter {
    transaction_details: { order_id: string; gross_amount: number };
    customer_details?: {
      first_name?: string;
      last_name?: string;
      email?: string;
      phone?: string;
    };
    credit_card?: { secure?: boolean };
  }

  export interface SnapTransactionResult {
    token: string;
    redirect_url: string;
  }

  export class Snap {
    constructor(options: { isProduction: boolean; serverKey: string; clientKey: string });
    createTransaction(parameter: SnapTransactionParameter): Promise<SnapTransactionResult>;
  }
}

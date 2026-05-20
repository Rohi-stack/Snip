export interface CreateOrderResponse {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

export interface WebhookPayload {
  event: string;
  payload: {
    payment?: {
      entity: {
        id: string;
        order_id: string;
        status: string;
        amount?: number;
        currency?: string;
        notes?: Record<string, string>;
      }
    };
    order?: {
      entity: {
        id: string;
        receipt?: string;
        notes?: Record<string, string>;
      }
    }
  };
}

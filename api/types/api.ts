export interface Country {
  id: number;
  name: string;
  code: string;
}

export interface CountriesResponse {
  status: string;
  results: number;
  data: Country[];
  timestamp: string;
  path: string;
  requestId: string;
  message: string;
}

export interface EcentricPaymentDetails {
  ecentric_transaction_uuid?: string;
  ecentric_auth_code?: string;
  ecentric_result_code?: string;
  ecentric_result_desc?: string;
  ecentric_is_approved?: string;
  ecentric_rrn?: string;
  ecentric_card_type?: string;
  ecentric_masked_pan?: string;
  ecentric_terminal_id?: string;
  ecentric_application_id?: string;
  ecentric_receipt_details?: string | object;
  ecentric_receipt_number?: string;
  ecentric_aid?: string;
  ecentric_pos_entry_mode?: string;
  ecentric_transaction_type?: string;
  ecentric_approval_status?: string;
  ecentric_latitude?: string;
  ecentric_longitude?: string;
  ecentric_accuracy?: string;
  ecentric_bank_name?: string;
  ecentric_merchant_id?: string;
  ecentric_batch_number?: string;
}

export interface CreateSaleRequest extends Partial<EcentricPaymentDetails> {
  // Required fields
  user_id: number;
  staff_id: string | number;
  consumer_id: number;
  region_id: number;
  shift_id: number;
  anonymous: string | boolean;
  international: string | boolean;
  country_id?: number;
  productsText: string;
  total: number;
  vat_number: string;
  company_name: string;
  address: string;
  notes: string;
  exchange_notes: string;
  file: any[];
  discount: string;
  payment_type: string;
} 
import { PaymentMethod } from './purchase.types';

export type ExpenseCategory =
  | 'RENT'
  | 'UTILITIES'
  | 'SALARY'
  | 'TRANSPORT'
  | 'SHOP_OPERATIONS'
  | 'OTHER';

export type ExpenseStatus = 'POSTED' | 'REVERSED';

export interface ExpenseComponentDto {
  method: PaymentMethod;
  amount: string;
  onlineReference?: string | null;
}

export interface CreateExpenseRequest {
  expenseDate?: string | null; // YYYY-MM-DD
  category: ExpenseCategory;
  description: string;
  amount: string;
  components: ExpenseComponentDto[];
  externalReference?: string | null;
  notes?: string | null;
}

export interface ReverseExpenseRequest {
  expectedVersion: number;
  reversalReason: string;
  reversalBusinessDate?: string | null; // YYYY-MM-DD
}

export interface ExpenseResponseDto {
  id: string; // BIGINT serialized as string
  expenseNumber: string;
  expenseDate: string; // YYYY-MM-DD
  category: ExpenseCategory;
  description: string;
  amount: string;
  status: ExpenseStatus;
  externalReference?: string | null;
  notes?: string | null;
  components: ExpenseComponentDto[];
  reversalReason?: string | null;
  reversalBusinessDate?: string | null;
  reversedAt?: string | null;
  reversedBy?: string | null;
  businessEventId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  updatedBy?: string | null;
}

export interface ExpenseFilterParams {
  startDate?: string;
  endDate?: string;
  category?: ExpenseCategory;
  status?: ExpenseStatus;
  paymentMethod?: PaymentMethod;
  search?: string;
  page?: number;
  size?: number;
  sort?: string;
}

import apiClient from './client';
import { ApiResponse, PageResponse } from '../types/api.types';
import { generateIdempotencyKey } from './apiHelpers';
import {
  CreateExpenseRequest,
  ReverseExpenseRequest,
  ExpenseResponseDto,
  ExpenseFilterParams,
} from '../types/expense.types';

export const expenseApi = {
  createExpense: async (
    request: CreateExpenseRequest,
    idempotencyKey?: string
  ): Promise<ExpenseResponseDto> => {
    const key = idempotencyKey || generateIdempotencyKey();
    const res = await apiClient.post<ApiResponse<ExpenseResponseDto>>(
      '/expenses',
      request,
      { headers: { 'Idempotency-Key': key } }
    );
    return res.data.data;
  },

  reverseExpense: async (
    expenseId: string | number,
    request: ReverseExpenseRequest,
    idempotencyKey?: string
  ): Promise<ExpenseResponseDto> => {
    const key = idempotencyKey || generateIdempotencyKey();
    const res = await apiClient.post<ApiResponse<ExpenseResponseDto>>(
      `/expenses/${expenseId}/reversals`,
      request,
      { headers: { 'Idempotency-Key': key } }
    );
    return res.data.data;
  },

  getExpenseById: async (
    expenseId: string | number,
    signal?: AbortSignal
  ): Promise<ExpenseResponseDto> => {
    const res = await apiClient.get<ApiResponse<ExpenseResponseDto>>(`/expenses/${expenseId}`, {
      signal,
    });
    return res.data.data;
  },

  searchExpenses: async (
    params?: ExpenseFilterParams,
    signal?: AbortSignal
  ): Promise<PageResponse<ExpenseResponseDto>> => {
    const res = await apiClient.get<PageResponse<ExpenseResponseDto>>('/expenses', {
      params,
      signal,
    });
    return res.data;
  },

  downloadExpensePdf: async (expenseId: string | number): Promise<Blob> => {
    const res = await apiClient.get(`/expenses/${expenseId}/pdf`, {
      responseType: 'blob',
    });
    return res.data as Blob;
  },
};

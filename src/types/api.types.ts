/**
 * API Response Envelopes matching Himmat backend standard contracts.
 */

export interface ApiResponse<T> {
  data: T;
  requestId: string;
}

export interface PageResponse<T> {
  data: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  requestId: string;
}

export interface FieldErrorDto {
  field: string;
  message: string;
}

export interface ErrorDetails {
  code: string;
  message: string;
  fields?: FieldErrorDto[];
  currentVersion?: number;
}

export interface ErrorResponse {
  error: ErrorDetails;
  requestId: string;
}

export class ApiError extends Error {
  code: string;
  status: number;
  fields: FieldErrorDto[];
  currentVersion?: number;
  requestId?: string;

  constructor(
    message: string,
    status: number,
    code = 'UNKNOWN_ERROR',
    fields: FieldErrorDto[] = [],
    currentVersion?: number,
    requestId?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.currentVersion = currentVersion;
    this.requestId = requestId;
  }
}

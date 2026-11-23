import { UserRole, UserSummaryDto } from './auth.types';

export interface CreateUserRequest {
  username: string;
  displayName: string;
  role: UserRole;
  password: string;
}

export interface UpdateUserRequest {
  expectedVersion: number;
  displayName?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface UserFilterParams {
  role?: UserRole;
  isActive?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}

export interface UserManagementState {
  users: UserSummaryDto[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  isLoading: boolean;
}

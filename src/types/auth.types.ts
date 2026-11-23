/**
 * Identity and Authentication types matching Himmat backend contract.
 */

export type UserRole = 'OWNER' | 'MANAGER';

export interface UserSummaryDto {
  id: string; // BIGINT serialized as string
  username: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  permissions: string[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserSummaryDto;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AuthState {
  user: UserSummaryDto | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<UserSummaryDto>;
  logout: () => void;
  refreshUserProfile: () => Promise<UserSummaryDto | null>;
  changePassword: (data: ChangePasswordRequest) => Promise<void>;
  isOwner: boolean;
  isManager: boolean;
  hasPermission: (permission: string) => boolean;
}

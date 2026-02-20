// ===== DATABASE TYPES =====

export interface User {
  id: string
  name: string
  phone_number: string
  role: 'user' | 'admin'
  created_at: string
}

export interface Session {
  id: string
  user_id: string
  session_token: string
  created_at: string
}

export interface License {
  id: string
  code: string
  plan_type: 'trial' | 'standard' | 'premium' | 'vip'
  status: 'unused' | 'active' | 'expired'
  user_id: string | null
  expires_at: string | null
  created_by: string
  created_at: string
}

export interface Generation {
  id: string
  user_id: string
  input_message: string
  tone: string
  context: string | null
  outputs: string[]
  created_at: string
}

// ===== API REQUEST/RESPONSE TYPES =====

export interface SendOtpRequest {
  phone_number: string
  name: string
}

export interface VerifyOtpRequest {
  phone_number: string
  otp: string
}

export interface GenerateRequest {
  input_message: string
  tone: string
  context?: string
}

export interface GenerateResponse {
  outputs: string[]
  generation_id: string
}

export interface ActivateLicenseRequest {
  code: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}


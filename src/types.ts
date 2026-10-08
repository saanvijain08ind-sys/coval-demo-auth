export type UserRole = 'admin' | 'employer' | 'guest';

export interface UserProfile {
  id: string;
  github_login: string;
  name: string;
  email: string;
  role: 'admin' | 'employer';
  avatar_url: string;
  created_at: string;
}

export interface AuthStatusResponse {
  authenticated: boolean;
  user: UserProfile | null;
  role: UserRole;
  security?: {
    token_encrypted_at_rest: boolean;
    encryption_cipher: string;
    key_length_bits: number;
    hashing_algorithm: string;
    can_decrypt_with_key: boolean;
    token_payload_sample: {
      provider: string;
      scopes: string[];
      access_token_masked: string;
    } | null;
  };
  message?: string;
}

export interface Repository {
  id: string;
  org: string;
  name: string;
  full_name: string;
  default_branch: string;
  head_sha: string;
  connected: boolean;
  visible_to_employers: boolean;
  language: string;
  stars: number;
  last_evaluated_at: string | null;
  score: number | null;
  agents_status: string;
}

export interface EvaluationJob {
  job_id: string;
  type: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  stage: string;
  progress: number;
  repository_id: string;
  started_at: string;
}

export interface CriterionScore {
  criterion: string;
  score: number;
  weight: number;
  confidence: number;
  summary: string;
  status: 'passed' | 'warning' | 'needs_improvement';
}

export interface SystemStatus {
  service: string;
  fastapi_service_status: string;
  supabase: {
    url: string;
    connected: boolean;
    pgvector_ready: boolean;
    auth_providers: string[];
  };
  privacy_and_security: {
    aes_secret_key_configured: boolean;
    cipher: string;
    key_length: string;
    nonce_policy: string;
    tag_policy: string;
    hashing: string;
    secret_redaction_filter: string[];
  };
  current_role: UserRole;
  active_user: string | null;
}

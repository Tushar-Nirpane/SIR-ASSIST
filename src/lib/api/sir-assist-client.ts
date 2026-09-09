/**
 * SIR-Assist Backend API Client
 * All paths are relative — Next.js rewrites proxy them to the FastAPI backend.
 */

const API_BASE = '/api/v1';

// ─── Types matching FastAPI response schemas ────────────────────────────────

export interface LineageSearchRequest {
  full_name: string;
  father_or_husband_name?: string;
  date_of_birth?: string; // ISO format: YYYY-MM-DD
  epic_number?: string;
  address_fragment?: string;
}

export interface MatchBasis {
  name_similarity: number;
  father_name_soundex_match: boolean;
  address_code_match: boolean;
  dob_proximity_score: number;
}

export interface LineageMatchItem {
  legacy_record_id: string;
  elector_name: string;
  father_or_husband_name: string;
  polling_station_id: string | null;
  confidence_score: number;
  match_basis: MatchBasis;
}

export interface LineageSearchResponse {
  applicant_id: string;
  matches: LineageMatchItem[];
  match_count: number;
}

export interface DobEligibilityResponse {
  date_of_birth: string;
  bracket_name: string;
  is_eligible: boolean;
  cutoff_date: string;
  documents_required: string[];
  notes: string | null;
}

export interface HealthResponse {
  status: string;
  database: string;
  legacy_roll_count: number;
  applicant_count: number;
  version: string;
}

export interface SyncUploadRequest {
  bundle_id: string;
  officer_id: string;
  part_no: string;
  encrypted_payload: string;
  created_at: string;
}

export interface SyncUploadResponse {
  received: number;
  failed: number;
  message: string;
}

// ─── API functions ──────────────────────────────────────────────────────────

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/**
 * POST /api/v1/lineage/search
 * Fuzzy cross-reference of applicant against the 2002-2004 electoral roll archive.
 */
export async function searchLineage(
  query: LineageSearchRequest
): Promise<LineageSearchResponse> {
  const res = await fetch(`${API_BASE}/lineage/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  });
  return handleResponse<LineageSearchResponse>(res);
}

/**
 * GET /api/v1/dob-eligibility/eligibility?dob=YYYY-MM-DD
 * Returns the statutory document-requirement bracket for a given date of birth.
 */
export async function getDobEligibility(
  dob: string
): Promise<DobEligibilityResponse> {
  const res = await fetch(`${API_BASE}/dob-eligibility/eligibility?dob=${encodeURIComponent(dob)}`);
  return handleResponse<DobEligibilityResponse>(res);
}

/**
 * GET /api/v1/health
 * Returns backend health and live record counts.
 */
export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`);
  return handleResponse<HealthResponse>(res);
}

/**
 * POST /api/v1/sync/upload
 * Uploads one or more encrypted sync bundles from the field device to the backend.
 */
export async function uploadSyncBundles(
  bundles: SyncUploadRequest[]
): Promise<SyncUploadResponse> {
  const res = await fetch(`${API_BASE}/sync/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bundles }),
  });
  return handleResponse<SyncUploadResponse>(res);
}

export type Role = "volunteer" | "coordinator" | "admin" | "field_worker" | "donor";
export type Urgency = "low" | "medium" | "high" | "critical";
export type NeedState =
  | "draft" | "submitted" | "triaged" | "published" | "matched"
  | "in_progress" | "completed" | "verified" | "closed" | "withdrawn" | "expired";
export type AssignmentState =
  | "offered" | "accepted" | "declined" | "en_route" | "checked_in"
  | "performing" | "proof_submitted" | "verified" | "disputed" | "recognized" | "cancelled";

export interface Profile {
  id: string;
  tenant_id: string;
  email: string | null;
  display_name: string | null;
  role: Role;
  languages: string[];
  skills: { tag: string; level?: string }[];
  home_lat: number | null;
  home_lng: number | null;
  max_radius_km: number;
  availability: Record<string, unknown>;
  trust_score: number;
}

export interface Need {
  id: string;
  tenant_id: string;
  program_id: string | null;
  title: string;
  description: string | null;
  category: string | null;
  urgency: Urgency;
  required_skills: string[];
  languages_helpful: string[];
  geo_lat: number | null;
  geo_lng: number | null;
  window_start: string | null;
  window_end: string | null;
  headcount_required: number;
  headcount_filled: number;
  state: NeedState;
  source: string;
  raw_doc_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: string;
  need_id: string;
  volunteer_id: string;
  state: AssignmentState;
  match_reason: string | null;
  accepted_at: string | null;
  checked_in_at: string | null;
  completed_at: string | null;
  proof_url: string | null;
  proof_note: string | null;
  feedback: Record<string, unknown> | null;
  created_at: string;
}

export interface VoiceTicket {
  id: string;
  tenant_id: string;
  volunteer_id: string | null;
  message: string;
  classification: "relational" | "value_based" | "transactional" | "other" | null;
  sentiment: number | null;
  themes: string[];
  resolved: boolean;
  reply: string | null;
  created_at: string;
}

export interface RankedVolunteer {
  id: string;
  display_name: string;
  distance_km: number;
  score: number;
  reason: string;
  skills: string[];
  languages: string[];
}

export interface RankedNeed {
  id: string;
  title: string;
  urgency: Urgency;
  distance_km: number;
  score: number;
  reason: string;
  required_skills: string[];
}

export interface ExtractedNeedDraft {
  title: string;
  description: string;
  category: string;
  urgency: Urgency;
  required_skills: string[];
  languages_helpful: string[];
  geo_hint: string | null;
  headcount_required: number;
}

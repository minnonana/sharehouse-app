// Supabase テーブルに対応する最小限の型定義（第1段階分）
// スキーマ本体: supabase/migrations/0001_init.sql

export type Language = "ja" | "en";
export type DutyCategory = "chore" | "trash" | "rest";
export type AssignmentStatus = "pending" | "done" | "incomplete";
export type WasherStatus = "idle" | "in_use";

export interface House {
  id: string;
  name: string;
  created_at: string;
}

export interface Member {
  id: string;
  house_id: string;
  auth_user_id: string;
  name: string;
  room_number: string;
  display_language: Language;
  is_owner: boolean;
  joined_at: string;
  left_at: string | null;
}

export interface InviteCode {
  id: string;
  house_id: string;
  code: string;
  created_by: string;
  expires_at: string;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
}

export interface HandoverCode {
  id: string;
  member_id: string;
  code: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface DutyType {
  id: string;
  house_id: string;
  key: string;
  label_ja: string;
  label_en: string;
  short_label: string;
  category: DutyCategory;
  color: string;
  sort_order: number;
  created_at: string;
}

export interface DutyAssignment {
  id: string;
  house_id: string;
  week_start_date: string; // YYYY-MM-DD（日曜日）
  member_id: string;
  duty_type_id: string;
  status: AssignmentStatus;
  completed_at: string | null;
  photo_url: string | null;
  covered_by: string | null;
  created_at: string;
}

export interface DutySwapRequest {
  id: string;
  house_id: string;
  from_assignment_id: string;
  to_assignment_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  responded_at: string | null;
}

export interface Absence {
  id: string;
  house_id: string;
  member_id: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface Substitution {
  id: string;
  house_id: string;
  duty_assignment_id: string;
  covering_member_id: string;
  original_member_id: string;
  created_at: string;
}

export interface WasherStatusRow {
  id: string;
  house_id: string;
  status: WasherStatus;
  used_by: string | null;
  started_at: string | null;
  expected_end_at: string | null;
  reminder_sent: boolean;
  updated_at: string;
}

export type BoardPostCategory = "rule" | "guest" | "repair" | "other";

export interface BoardPost {
  id: string;
  house_id: string;
  author_id: string;
  original_lang: Language;
  body_original: string;
  body_ja: string | null;
  body_en: string | null;
  is_important: boolean;
  category: BoardPostCategory;
  created_at: string;
}

export interface BoardPostRead {
  post_id: string;
  member_id: string;
  read_at: string;
}

// =========================================================
// 第3段階: 買い物帳・共用費
// =========================================================

export type ShoppingItemStatus = "pending" | "in_progress" | "done" | "settled";

export interface ShoppingItem {
  id: string;
  house_id: string;
  name: string;
  name_ja: string | null;
  name_en: string | null;
  memo: string | null;
  photo_url: string | null;
  status: ShoppingItemStatus;
  created_by: string;
  assignee_id: string | null;
  amount_yen: number | null;
  receipt_photo_url: string | null;
  claimed_at: string | null;
  completed_at: string | null;
  settled_at: string | null;
  created_at: string;
}

export interface MonthlyDue {
  id: string;
  house_id: string;
  member_id: string;
  year: number;
  month: number;
  amount_yen: number;
  paid: boolean;
  paid_at: string | null;
  created_at: string;
}

// Supabase JS の createClient<Database>() に渡すための最小限の型。
// 生成コマンド（`supabase gen types typescript`）が使えるようになったら置き換える。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;

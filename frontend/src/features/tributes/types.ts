export type TributeType = "message" | "memory_recollection";
export type DisplayMode = "named" | "anonymous";
export type TributeStatus = "pending" | "approved" | "rejected" | "hidden";
export type Visibility = "public" | "private";
export type StickyNoteColor = "sky" | "mint" | "lavender";
export type PenStyle = "classic" | "marker" | "fountain" | "gel";
export type PaperTheme = "plain" | "wildflower_corners" | "eucalyptus_frame" | "lavender_edge";
export type StickerAsset =
  | "daisy"
  | "forget_me_not"
  | "lavender_sprig"
  | "fern"
  | "butterfly"
  | "white_dove"
  | "small_heart"
  | "warm_star";
export type MemoryDecorationAsset = StickerAsset | "photo";
export type AIConsentBasis = "submitter_opt_in" | "contributor_confirmed" | "owner_authored";
export type AIUseStatus = "excluded" | "pending_review" | "included" | "index_error";

export type MemoryDecoration = {
  instance_id: string;
  asset: MemoryDecorationAsset;
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

export type Tribute = {
  id: string;
  type: TributeType;
  title: string | null;
  content: string;
  display_mode: DisplayMode;
  submitted_name: string | null;
  relationship_to_ken: string | null;
  year_tag: number | null;
  occasion_date: string | null;
  image_data_url: string | null;
  sticky_note_color: StickyNoteColor;
  pen_style: PenStyle;
  paper_theme: PaperTheme;
  decorations: MemoryDecoration[];
  public_display_name: string;
  status: TributeStatus;
  visibility: Visibility;
  moderation_notes: string | null;
  submitted_at: string;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  has_image?: boolean;
  is_anonymous: boolean;
  public_author_label: string;
  ai_consent: boolean;
  ai_consent_policy_version: string | null;
  ai_consent_at: string | null;
  ai_consent_basis: AIConsentBasis | null;
  ai_use_status: AIUseStatus;
  ai_redacted_content: string | null;
  ai_indexed_at: string | null;
  ai_index_error: string | null;
};

export const PAPER_THEMES: Array<{ value: PaperTheme; label: string; description: string }> = [
  { value: "plain", label: "Quiet Cotton", description: "Unadorned warm white paper" },
  { value: "wildflower_corners", label: "Wildflower", description: "Delicate blooms in opposite corners" },
  { value: "eucalyptus_frame", label: "Eucalyptus", description: "A soft green botanical frame" },
  { value: "lavender_edge", label: "Lavender", description: "Lavender sprigs along one edge" }
];

export const STICKER_ASSETS: Array<{ value: StickerAsset; label: string }> = [
  { value: "daisy", label: "Daisy" },
  { value: "forget_me_not", label: "Forget-me-not" },
  { value: "lavender_sprig", label: "Lavender sprig" },
  { value: "fern", label: "Fern" },
  { value: "butterfly", label: "Butterfly" },
  { value: "white_dove", label: "White dove" },
  { value: "small_heart", label: "Small heart" },
  { value: "warm_star", label: "Warm star" }
];

export type Priority = "High priority" | "Medium priority" | "Low priority";

export interface Part {
  id: string; // "fonts", "contrast" ... also the id of its detail screen
  name: string;
  share: number; // points it adds to the overall score
  weight: number; // most points it can add
  color: string; // colour of its slice, its key dot and its list icons
  fixLabel: string; // sub-label on its change rows, e.g. "Font change"
}

export interface Change {
  id: string;
  title: string;
  priority: Priority;
  partId: string; // which Part this change belongs to
  live?: ChangeLive; // real data + actions; without it the row behaves like the original sample
}

/** What a real change row can do. Everything optional so rows degrade to the original behaviour. */
export interface LiveActions {
  committed?: boolean; // saved to GitHub: Commit shows as Revert
  busy?: boolean;
  preview?: (on: boolean) => void; // show/hide the change on the page while Preview is open
  commit?: () => void;
  revert?: () => void;
  why?: () => void; // ask the AI about this change
  css?: string; // for Copy CSS
  tailwind?: string; // for Copy Tailwind
}

export interface ChangeLive extends LiveActions {
  figmaLabel?: string; // tile label for the target side; defaults to "FIGMA"
  figma: string; // what the design / goal says
  site: string; // what the page has now
}

export interface Report {
  key: "design" | "accessibility";
  title: string; // "Design Comparison"
  goodLabel: string; // "Similar" / "Accessible"
  remainderLabel: string; // "Still different" / "Still to fix"
  detailRemainderLabel: string; // "Different" / "Needs fixing"
  parts: Part[];
  changes: Change[];
}
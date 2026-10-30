
export type TabId = "figma" | "design" | "accessibility";

export type Theme = "light" | "dark";

export interface TabItem {
  id: TabId;
  label: string;
}

export const TABS: TabItem[] = [
  { id: "figma", label: "Figma Link" },
  { id: "design", label: "Design" },
  { id: "accessibility", label: "Accessibility" },
];

/** Full-screen steps that come before / replace the tabbed app. */
export type Screen = "landing" | "githubLogin" | "githubAuth" | "connecting" | "app";

/** What is saved between sessions. user === "" means signed out. */
export interface Session {
  user: string;
  file: string;
  frame: string; // selected Figma frame name ("" = none yet)
  url: string;
  projectId: number | null; // set only once a frame is selected, so comparisons can run
}

export interface User {
  name: string;
}
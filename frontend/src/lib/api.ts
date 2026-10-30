import { requireSupabase } from "../supabase";
import type { ElementSnapshot } from "./inspect";

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"
).replace(/\/+$/, "");

export interface ParityUser {
  id: string;
  email: string | null;
  username: string | null;
  avatar_url: string | null;
  provider: string | null;
}

async function getAccessToken(): Promise<string> {
  const { data, error } = await requireSupabase().auth.getSession();

  if (error) throw error;

  const token = data.session?.access_token;
  if (!token) throw new Error("Your sign-in has expired. Sign out and sign in with GitHub again.");

  return token;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);

  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch (error) {
    // A network-level failure: server down, wrong URL, or a private Codespaces port
    // (GitHub answers with a login redirect, which the browser reports as a CORS failure).
    console.error(`[parity] request to ${API_BASE_URL}${path} failed`, error);
    throw new Error(
      `Could not reach the Parity backend at ${API_BASE_URL}. Check that it is running` +
        (API_BASE_URL.includes("app.github.dev")
          ? " and that port 3000 is set to Public in the Codespaces Ports tab."
          : ".")
    );
  }

  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return body as T;
}

export function getMe(): Promise<ParityUser> {
  return apiRequest<ParityUser>("/me");
}

export interface FigmaFrame {
  id: string;
  name: string;
  type: string;
  page_id: string;
  page_name: string;
  width: number | null;
  height: number | null;
}

export interface FigmaProject {
  id: number;
  file_key: string;
  file_url: string;
  file_name: string | null;
  selected_frame_id: string | null;
  selected_frame_name: string | null;
  frames: FigmaFrame[];
  updated_at?: string;
}

/** A row in Recent Figma history (no frame list, to keep it light). */
export type FigmaHistoryItem = Omit<FigmaProject, "frames">;

export function connectFigmaProject(fileUrl: string): Promise<FigmaProject> {
  return apiRequest<FigmaProject>("/figma-projects", {
    method: "POST",
    body: JSON.stringify({ file_url: fileUrl }),
  });
}

export function selectFigmaFrame(projectId: number, frameId: string): Promise<FigmaProject> {
  return apiRequest<FigmaProject>(`/figma-projects/${projectId}/frame`, {
    method: "PATCH",
    body: JSON.stringify({ frame_id: frameId }),
  });
}

export function listFigmaHistory(): Promise<FigmaHistoryItem[]> {
  return apiRequest<FigmaHistoryItem[]>("/figma-projects");
}

/** Reopens a saved project (cached frames, no Figma call) and marks it as recently used. */
export function openFigmaProject(projectId: number): Promise<FigmaProject> {
  return apiRequest<FigmaProject>(`/figma-projects/${projectId}/open`, { method: "POST" });
}

export function deleteFigmaProject(projectId: number): Promise<void> {
  return apiRequest<void>(`/figma-projects/${projectId}`, { method: "DELETE" });
}

export interface FigmaLayer {
  id: string;
  name: string;
  type: string;
  text: string | null;
  parent_id: string | null;
}

export function listFigmaLayers(projectId: number): Promise<FigmaLayer[]> {
  return apiRequest<FigmaLayer[]>(`/figma-projects/${projectId}/nodes`);
}

export interface ComparePart {
  id: string; // "fonts" | "color" | "spacing" | "sizing"
  name: string;
  weight: number;
  fraction: number | null; // null = not comparable for this element
  current: string | null;
  expected: string | null;
  fix: string;
}

export interface SuggestedFix {
  property: string;
  css_property: string;
  current: string;
  expected: string;
  tailwind: string[];
}

export interface CompareResult {
  project: { id: number; file_name: string | null; frame_id: string; frame_name: string | null };
  matched_node: { id: string; name: string; type: string; text: string | null; match_score: number | null };
  text_node?: { id: string; name: string } | null; // text layer whose font was used, when combined with a frame
  design_score: number;
  categories: ComparePart[];
  suggested_fixes: SuggestedFix[];
  css_fix_rule: string;
  target_css_rule: string;
  tailwind_classes: string[];
  tailwind_fix_classes?: string[];
}

export function compareElement(
  projectId: number,
  element: ElementSnapshot,
  figmaNodeId: string | null
): Promise<CompareResult> {
  return apiRequest<CompareResult>("/compare/element", {
    method: "POST",
    body: JSON.stringify({
      project_id: projectId,
      element,
      figma_node_id: figmaNodeId,
    }),
  });
}

/** Asks Parity's AI about the results currently on screen (context is plain data). */
export function askParity(context: object, question: string): Promise<{ answer: string }> {
  return apiRequest<{ answer: string }>("/ai/ask", {
    method: "POST",
    body: JSON.stringify({ context, question }),
  });
}

import { supabase } from "../supabase";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export interface ParityUser {
  id: string;
  email: string | null;
  username: string | null;
  avatar_url: string | null;
  provider: string | null;
}

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  const token = data.session?.access_token;

  if (!token) {
    throw new Error("Not signed in");
  }

  return token;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);

  headers.set("Authorization", `Bearer ${token}`);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      body &&
      typeof body === "object" &&
      "error" in body &&
      typeof body.error === "string"
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
}

export function connectFigmaProject(
  fileUrl: string
): Promise<FigmaProject> {
  return apiRequest<FigmaProject>("/figma-projects", {
    method: "POST",
    body: JSON.stringify({
      file_url: fileUrl,
    }),
  });
}

export function selectFigmaFrame(
  projectId: number,
  frameId: string
): Promise<FigmaProject> {
  return apiRequest<FigmaProject>(
    `/figma-projects/${projectId}/frame`,
    {
      method: "PATCH",
      body: JSON.stringify({
        frame_id: frameId,
      }),
    }
  );
}

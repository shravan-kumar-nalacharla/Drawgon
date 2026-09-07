import type { Session } from "../types";
export const KEY_STORAGE = "project_diagram_ai_gemini_key";
const PROJECT_STORAGE = "project_diagram_ai_session";
export function getGeminiApiKey() {
  try {
    return sessionStorage.getItem(KEY_STORAGE) || "";
  } catch {
    return "";
  }
}
export function setGeminiApiKey(key: string) {
  sessionStorage.setItem(KEY_STORAGE, key.trim());
}
export function removeGeminiApiKey() {
  sessionStorage.removeItem(KEY_STORAGE);
}
export function loadProjectSession(): Session | null {
  try {
    return JSON.parse(sessionStorage.getItem(PROJECT_STORAGE) || "null");
  } catch {
    return null;
  }
}
export function saveProjectSession(session: Session) {
  try {
    sessionStorage.setItem(PROJECT_STORAGE, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}
export function clearEntireSession() {
  removeGeminiApiKey();
  sessionStorage.removeItem(PROJECT_STORAGE);
}

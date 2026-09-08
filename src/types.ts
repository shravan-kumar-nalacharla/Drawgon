import type { Settings } from "./config/settings";
import type { Blueprint } from "./services/gemini/schemas";
import type { DiagramEditorState } from "./services/diagram/editor";
export interface Project {
  title: string;
  abstract: string;
  repositoryUrl: string;
  details: Record<string, string>;
  techStack: string[];
}
export interface RepositoryContext {
  name: string;
  language: string;
  branch: string;
  files: string[];
  text: string;
  warnings: string[];
}
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
export interface GeneratedDiagram {
  id: string;
  requestedType: string;
  canonicalType: string;
  title: string;
  summary: string;
  html: string;
  sanitizedHtml: string;
  validation: ValidationResult;
  createdAt: number;
  revision: number;
  assumptions: string[];
  fidelityNotes: string[];
  settings?: Settings;
  editor?: DiagramEditorState;
}
export interface Session {
  project: Project;
  settings: Settings;
  selected: string[];
  repository?: RepositoryContext;
  blueprint?: Blueprint;
  blueprintHash?: string;
  diagrams: GeneratedDiagram[];
}

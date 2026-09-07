import type { Project, RepositoryContext } from "../types";
export async function projectHash(
  project: Project,
  repository?: RepositoryContext,
) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify({ project, repository })),
  );
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

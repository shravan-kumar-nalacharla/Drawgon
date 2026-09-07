import { z } from "zod";
import type { RepositoryContext } from "../../types";
export function parseGithubUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(
      "Enter a GitHub URL such as https://github.com/owner/repository.",
    );
  }
  const parts = url.pathname.split("/").filter(Boolean);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "github.com" ||
    url.port ||
    url.username ||
    url.password ||
    parts.length < 2 ||
    !parts.slice(0, 2).every((p) => /^[\w.-]+$/.test(p))
  )
    throw new Error("Enter a public https://github.com/owner/repository URL.");
  if (parts.length > 2 && (parts[2] !== "tree" || parts.length < 4))
    throw new Error("Use the repository URL or a tree/branch URL.");
  return {
    owner: parts[0],
    repo: parts[1].replace(/\.git$/, ""),
    treePath: parts.slice(3).map(decodeURIComponent).join("/"),
  };
}
export function scoreFile(path: string): number {
  if (
    /(^|\/)(node_modules|dist|build|coverage|vendor|\.git|\.next|generated)(\/|$)|(?:lock|\.min)\.|(?:^|\/)(?:yarn|pnpm)-lock|\.(png|jpe?g|gif|svg|webp|ico|pdf|zip|woff2?|ttf|mp4|exe|dll|map)$/i.test(
      path,
    )
  )
    return -1;
  if (/(^|\/)\.env(?!\.example$)/i.test(path)) return -1;
  if (
    /(^|\/)(README(?:\.md)?|package.json|pyproject.toml|requirements.txt|Pipfile|go.mod|Cargo.toml|pom.xml|build.gradle|Dockerfile|docker-compose.ya?ml|schema.prisma|openapi.ya?ml|openapi.json|swagger.json|\.env.example)$/i.test(
      path,
    )
  )
    return 100;
  if (
    /(^|\/)(main|index|App|server|app)\.[\w]+$|(?:vite|next|tsconfig)\.config|tsconfig.json/i.test(
      path,
    )
  )
    return 80;
  if (
    /\.(md|txt|json|[cm]?[jt]sx?|py|java|go|rs|prisma|sql|ya?ml|toml|cs|rb|php|tf|gradle)$/i.test(
      path,
    )
  )
    return /(^|\/)(api|routes|controllers|services|models|entities|schemas|database|db|infrastructure|terraform|k8s)\//.test(
      path,
    )
      ? 70
      : 40;
  return -1;
}
async function github(path: string, signal: AbortSignal) {
  const response = await fetch(`https://api.github.com${path}`, {
    signal,
    headers: { Accept: "application/vnd.github+json" },
    credentials: "omit",
    referrerPolicy: "no-referrer",
  });
  if (!response.ok) {
    if (response.status === 403 || response.status === 429)
      throw new Error(
        "GitHub's anonymous API rate limit was reached. Your repository could not be fully analyzed. You can still generate diagrams from the details you entered.",
      );
    if (response.status === 404)
      throw new Error(
        "This version currently analyzes public repositories. Check the URL, or continue by describing the project manually.",
      );
    throw new Error(
      "GitHub could not be reached. You can continue with your project description.",
    );
  }
  return response.json() as Promise<unknown>;
}
const metadataSchema = z.object({
  full_name: z.string(),
  default_branch: z.string(),
  language: z.string().nullable(),
});
const treeSchema = z.object({
  truncated: z.boolean().optional(),
  tree: z.array(
    z.object({
      path: z.string(),
      type: z.string(),
      sha: z.string(),
      size: z.number().optional(),
    }),
  ),
});
export async function analyzeRepository(
  url: string,
  signal: AbortSignal,
  status: (value: string) => void,
): Promise<RepositoryContext> {
  const { owner, repo, treePath } = parseGithubUrl(url);
  const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  status("Reading repository structure…");
  const metadata = metadataSchema.parse(await github(base, signal));
  let branch = metadata.default_branch;
  let subtree = "";
  // Resolve branch names containing slashes, longest ref first, without assuming main.
  if (treePath) {
    const parts = treePath.split("/");
    let found = false;
    for (let count = parts.length; count > 0; count--) {
      const candidate = parts.slice(0, count).join("/");
      try {
        await github(
          `${base}/branches/${encodeURIComponent(candidate)}`,
          signal,
        );
        branch = candidate;
        subtree = parts.slice(count).join("/");
        found = true;
        break;
      } catch (error) {
        signal.throwIfAborted();
        if (
          !(error instanceof Error) ||
          !error.message.includes("public repositories")
        )
          throw error;
      }
    }
    if (!found)
      throw new Error(
        "The branch in this URL could not be found. Use the main repository URL or continue manually.",
      );
  }
  const tree = treeSchema.parse(
    await github(
      `${base}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
      signal,
    ),
  );
  const candidates = tree.tree
    .filter(
      (f) =>
        f.type === "blob" &&
        (!subtree || f.path.startsWith(`${subtree}/`)) &&
        (f.size ?? 0) < 200_000 &&
        scoreFile(f.path) >= 0,
    )
    .sort(
      (a, b) =>
        scoreFile(b.path) - scoreFile(a.path) || a.path.length - b.path.length,
    )
    .slice(0, 24);
  const result: RepositoryContext = {
    name: metadata.full_name,
    branch,
    language: metadata.language || "Not detected",
    files: [],
    text: "",
    warnings: tree.truncated
      ? ["GitHub returned a partial tree. Analysis covers the files available."]
      : [],
  };
  for (const file of candidates) {
    signal.throwIfAborted();
    if (result.text.length >= 120_000) break;
    status(`Reading ${file.path}…`);
    try {
      const blob = z
        .object({ content: z.string(), encoding: z.string() })
        .parse(
          await github(
            `${base}/git/blobs/${encodeURIComponent(file.sha)}`,
            signal,
          ),
        );
      if (blob.encoding !== "base64") continue;
      const raw = new TextDecoder().decode(
        Uint8Array.from(atob(blob.content.replace(/\s/g, "")), (c) =>
          c.charCodeAt(0),
        ),
      );
      if (raw.includes("\0")) continue;
      const header = `\n===== FILE: ${file.path} =====\n`;
      const footer = "\n===== END FILE =====\n";
      const room = Math.min(
        16_000,
        120_000 - result.text.length - header.length - footer.length - 30,
      );
      if (room < 1) break;
      result.text +=
        header +
        raw.slice(0, room) +
        (raw.length > room ? "\n[File truncated to budget]" : "") +
        footer;
      result.files.push(file.path);
    } catch (error) {
      signal.throwIfAborted();
      result.warnings.push(
        error instanceof Error && error.message.includes("rate limit")
          ? error.message
          : `Could not read ${file.path}.`,
      );
      if (error instanceof Error && error.message.includes("rate limit")) break;
    }
  }
  if (!result.files.length)
    result.warnings.push(
      "No readable source files were found. Your project description will be used.",
    );
  return result;
}

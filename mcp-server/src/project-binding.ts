import type { ApiProject } from "./api-client.js"

export class McpProjectBinding {
  private pinned: ApiProject | null = null

  constructor(readonly fixedSelector?: string) {
    if (fixedSelector !== undefined && (!fixedSelector || fixedSelector === "current" || fixedSelector.trim() !== fixedSelector)) {
      throw new Error("Fixed MCP scope requires an explicit project UUID or exact path")
    }
  }

  get project(): ApiProject | null {
    return this.pinned
  }

  clear(): void {
    if (this.fixedSelector !== undefined) throw new Error("This MCP process has a fixed project scope")
    this.pinned = null
  }

  pin(requested: string, projects: ApiProject[], current: ApiProject | null): ApiProject {
    const candidate = requested === "current"
      ? current
      : projects.find((project) => project.id === requested || project.path === requested) ?? null
    if (!candidate) throw new Error(`Unknown LLM Wiki project: ${requested}`)
    if (this.fixedSelector !== undefined && this.fixedSelector !== candidate.id && this.fixedSelector !== candidate.path) {
      throw new Error("This MCP process has a fixed project scope; switching projects is forbidden")
    }
    this.pinned = candidate
    return candidate
  }

  resolve(requested?: string): string {
    if (!this.pinned) {
      if (this.fixedSelector !== undefined) {
        if (requested && requested !== "current" && requested !== this.fixedSelector) {
          throw new Error("This MCP process has a fixed project scope; project override rejected")
        }
        return this.fixedSelector
      }
      return requested ?? "current"
    }
    if (
      requested &&
      requested !== "current" &&
      requested !== this.pinned.id &&
      requested !== this.pinned.path
    ) {
      if (this.fixedSelector !== undefined) throw new Error("This MCP process has a fixed project scope; project override rejected")
      throw new Error(
        `This MCP session is pinned to ${this.pinned.name} (${this.pinned.id}); ` +
        `project override ${requested} was rejected. Call llm_wiki_set_project to change scope.`,
      )
    }
    return this.pinned.id
  }
}

export function withActiveProject(text: string, project: ApiProject | null, requestedId: string): string {
  const scope = project
    ? `${project.name} (${project.id})`
    : requestedId
  return `[activeProject: ${scope}]\n\n${text}`
}

# Fixed-project MCP processes

Set `LLM_WIKI_FIXED_PROJECT` to an explicit project UUID or exact project path when launching a stdio server. The process then resolves omitted or `current` tool arguments to that project, independently of the desktop's active project. Foreign project overrides, clearing the binding, and switching through `llm_wiki_set_project` are rejected. Status and project listings include only the fixed project.

The `current` alias, an empty value and leading/trailing whitespace are not valid fixed selectors. Missing or unknown configured projects fail closed for project operations. Omit the variable to preserve the existing mutable session-pinning behavior.

For separate knowledge domains, run one MCP process per domain with distinct fixed selectors and a strict read-tool allow-list. Do not expose write, embedding, chat or scope-changing tools unless they are intentionally authorized. In particular, hosted model-backed chat may transmit selected content to the configured model provider.

This is a tool-level accidental-mixing boundary, not an operating-system security boundary: the local API credential and desktop application can still access their registered projects. Profiles sharing an OS identity can access the underlying files through other authorized tools. Store credentials through the client's secret configuration, not in project notes or version control.

/**
 * Core read-only tool registry for Vlawd Cycle 3.
 *
 * This is the AI-facing contract: the model can call these tools by name
 * with typed parameters. Only read-only / session-control tools are exposed
 * in Cycle 3; cursor/keyboard/form-fill remain blocked until Phase 2.
 */

export interface ToolParameter {
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  items?: unknown;
  properties?: Record<string, ToolParameter>;
  required?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, ToolParameter>;
    required: string[];
  };
  returns?: {
    type: "object";
    properties: Record<string, ToolParameter>;
  };
}

export const CORE_TOOLS: ToolDefinition[] = [
  {
    name: "browser.search",
    description: "Use the default search engine to find public web pages for a query. Returns search results page.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search keywords."
        }
      },
      required: ["query"]
    }
  },
  {
    name: "browser.open",
    description: "Open a specific URL in the task BrowserView. Only HTTP/HTTPS URLs allowed.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "A full http:// or https:// URL."
        }
      },
      required: ["url"]
    }
  },
  {
    name: "browser.scroll",
    description: "Scroll down the current page to reveal more content.",
    parameters: {
      type: "object",
      properties: {
        distance: {
          type: "number",
          description: "Pixels to scroll. Defaults to one viewport."
        }
      },
      required: []
    }
  },
  {
    name: "browser.read",
    description: "Extract visible text from the current BrowserView page. Use after search/open/scroll.",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "browser.find",
    description: "Search for visible text or a heading on the current page and return its context. Does not click.",
    parameters: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "Text to locate on the page."
        }
      },
      required: ["text"]
    }
  },
  {
    name: "session.save",
    description: "Persist the current task Session, including sources, plan, and evidence summary.",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "session.branch",
    description: "Fork the current Session into a new branch, e.g. after a user correction or a new sub-goal.",
    parameters: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "Why the branch was created (e.g. user correction)."
        }
      },
      required: ["reason"]
    }
  },
  {
    name: "task.plan",
    description: "Generate a read-only multi-step plan for a research goal. Each step names one of the browser.* tools.",
    parameters: {
      type: "object",
      properties: {
        goal: {
          type: "string",
          description: "Research goal."
        }
      },
      required: ["goal"]
    }
  }
];

export function getToolDefinitions(): ToolDefinition[] {
  return CORE_TOOLS;
}

export function toolSchemasForPrompt(): string {
  return JSON.stringify(CORE_TOOLS, null, 2);
}

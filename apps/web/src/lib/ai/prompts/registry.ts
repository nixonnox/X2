// ─────────────────────────────────────────────────────────────
// AI Prompt Template Registry — Version-aware template manager
// ─────────────────────────────────────────────────────────────

import type { AiLanguageCode, AiTaskType, PromptTemplate } from "../types";
import { ALL_PROMPT_TEMPLATES } from "./templates";

/**
 * Manages prompt templates with version control and language fallback.
 *
 * Registry key format: `${taskType}:${language}`
 * Each key maps to an array of template versions sorted ascending.
 */
export class PromptTemplateRegistry {
  private templates: Map<string, PromptTemplate[]>;

  constructor() {
    this.templates = new Map();
  }

  // ── Key helper ──

  private makeKey(taskType: AiTaskType, language: AiLanguageCode): string {
    return `${taskType}:${language}`;
  }

  // ── Registration ──

  register(template: PromptTemplate): void {
    const key = this.makeKey(template.taskType, template.language);
    const existing = this.templates.get(key) ?? [];

    // Replace if same version already exists, otherwise append
    const idx = existing.findIndex((t) => t.version === template.version);
    if (idx >= 0) {
      existing[idx] = template;
    } else {
      existing.push(template);
      // Sort versions ascending so latest is at the end
      existing.sort((a, b) =>
        a.version.localeCompare(b.version, undefined, { numeric: true }),
      );
    }

    this.templates.set(key, existing);
  }

  // ── Retrieval ──

  /**
   * Get a prompt template by task type and language.
   * - If no version is specified, returns the latest version.
   * - If the requested language is not found, falls back to 'ko'.
   * - Returns null if nothing is found even after fallback.
   */
  get(
    taskType: AiTaskType,
    language: AiLanguageCode,
    version?: string,
  ): PromptTemplate | null {
    let key = this.makeKey(taskType, language);
    let versions = this.templates.get(key);

    // Language fallback to Korean
    if (!versions && language !== "ko") {
      key = this.makeKey(taskType, "ko");
      versions = this.templates.get(key);
    }

    if (!versions || versions.length === 0) {
      return null;
    }

    if (version) {
      return versions.find((t) => t.version === version) ?? null;
    }

    // Return latest (last element after sort)
    return versions[versions.length - 1]!;
  }

  /**
   * List all available versions for a task type and language.
   */
  getVersions(taskType: AiTaskType, language: AiLanguageCode): string[] {
    const key = this.makeKey(taskType, language);
    const versions = this.templates.get(key);
    if (!versions) return [];
    return versions.map((t) => t.version);
  }

  /**
   * Return every registered template (flat array).
   */
  getAllTemplates(): PromptTemplate[] {
    const result: PromptTemplate[] = [];
    this.templates.forEach((versions) => {
      result.push(...versions);
    });
    return result;
  }

  /**
   * Return all templates matching a given task type (all languages, all versions).
   */
  getByTaskType(taskType: AiTaskType): PromptTemplate[] {
    const result: PromptTemplate[] = [];
    this.templates.forEach((versions, key) => {
      if (key.startsWith(`${taskType}:`)) {
        result.push(...versions);
      }
    });
    return result;
  }
}

// ── Singleton ──

export const promptRegistry = new PromptTemplateRegistry();

// Auto-register all built-in templates
for (const template of ALL_PROMPT_TEMPLATES) {
  promptRegistry.register(template);
}

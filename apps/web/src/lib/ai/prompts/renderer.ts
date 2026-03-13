// ─────────────────────────────────────────────────────────────
// AI Prompt Template Renderer — Variable substitution & message assembly
// ─────────────────────────────────────────────────────────────

import type { AiProviderMessage, PromptTemplate } from "../types";

// ── Variable substitution ──

const VARIABLE_PATTERN = /\{\{(\w+)\}\}/g;

/**
 * Replace all `{{variableName}}` placeholders in a string with values
 * from the variables map. Unknown variables are left as-is.
 */
function substituteVariables(
  text: string,
  variables: Record<string, unknown>,
): string {
  return text.replace(VARIABLE_PATTERN, (match, name: string) => {
    const value = variables[name];
    if (value === undefined || value === null) {
      return match; // leave placeholder intact if no value provided
    }
    if (typeof value === "string") {
      return value;
    }
    return JSON.stringify(value);
  });
}

// ── Few-shot formatting ──

function formatFewShotExamples(
  examples: { input: string; output: string }[],
  variables: Record<string, unknown>,
): string {
  if (examples.length === 0) return "";

  const lines: string[] = ["\n--- Examples ---"];
  for (let i = 0; i < examples.length; i++) {
    const ex = examples[i]!;
    lines.push(`\n[Example ${i + 1}]`);
    lines.push(`Input: ${substituteVariables(ex.input, variables)}`);
    lines.push(`Output: ${substituteVariables(ex.output, variables)}`);
  }
  lines.push("\n--- End Examples ---\n");
  return lines.join("\n");
}

// ── Public API ──

/**
 * Render a prompt template with the given variables into a system message
 * and a user message.
 *
 * Assembly logic:
 *   systemMessage  = systemInstruction + safetyNote
 *   userMessage    = developerInstruction + outputFormatInstruction + few-shot examples
 */
export function renderPrompt(
  template: PromptTemplate,
  variables: Record<string, unknown>,
): { systemMessage: string; userMessage: string } {
  const systemInstruction = substituteVariables(
    template.systemInstruction,
    variables,
  );
  const safetyNote = substituteVariables(template.safetyNote, variables);

  const developerInstruction = substituteVariables(
    template.developerInstruction,
    variables,
  );
  const outputFormat = substituteVariables(
    template.outputFormatInstruction,
    variables,
  );
  const fewShot = template.fewShotExamples
    ? formatFewShotExamples(template.fewShotExamples, variables)
    : "";

  const systemMessage = `${systemInstruction}\n\n[Safety Guidelines]\n${safetyNote}`;

  const userParts = [developerInstruction, outputFormat, fewShot].filter(
    Boolean,
  );
  const userMessage = userParts.join("\n\n");

  return { systemMessage, userMessage };
}

/**
 * Render a prompt template into an array of `AiProviderMessage` objects
 * suitable for passing directly to `provider.generateText()`.
 *
 * Message structure:
 *   1. system  — systemInstruction + safetyNote
 *   2. user    — developerInstruction + outputFormatInstruction + few-shot + user input
 */
export function renderForProvider(
  template: PromptTemplate,
  variables: Record<string, unknown>,
): AiProviderMessage[] {
  const { systemMessage, userMessage } = renderPrompt(template, variables);

  const messages: AiProviderMessage[] = [
    { role: "system", content: systemMessage },
    { role: "user", content: userMessage },
  ];

  return messages;
}

/** Single-quote shell data so prompts remain literal when pasted into Terminal. */
export function shellQuote(value: string): string {
  return "'" + value.split("'").join("'\"'\"'") + "'";
}

/** The runner reads its full configuration from stdin, including chat history. */
export function buildDemoCommand(command: string, settings: unknown): string {
  if (!command) return '';
  return (
    "printf '%s' " +
    shellQuote(JSON.stringify(settings, null, 2)) +
    ' | \\\n  ' +
    command
  );
}

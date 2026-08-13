export function cx(
  ...parts: ReadonlyArray<string | false | null | undefined>
): string {
  let out = "";
  for (const part of parts) {
    if (!part) continue;
    out = out.length === 0 ? part : `${out} ${part}`;
  }
  return out;
}

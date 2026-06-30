/**
 * Configurable "sign-in" fields a teacher can collect from each student
 * before the exam starts. The student's full name is always collected
 * implicitly (it's the attempt identifier); these are *extra* fields.
 */

export type CollectFieldType = "text" | "email" | "number" | "select";

export type CollectField = {
  key: string; // stable identifier, unique within an exam
  label: string; // shown to the student
  type: CollectFieldType;
  required: boolean;
  options?: string[]; // for type === "select"
};

/** One-click presets the teacher can add. */
export const COLLECT_PRESETS: ReadonlyArray<Omit<CollectField, "required">> = [
  { key: "email", label: "Email address", type: "email" },
  { key: "class", label: "Class / grade", type: "text" },
  { key: "studentId", label: "Student ID", type: "text" },
  { key: "listNumber", label: "Class list number", type: "number" },
  { key: "section", label: "Section / stream", type: "text" },
];

export function parseCollectFields(raw: string | null | undefined): CollectField[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (f): f is CollectField =>
          f &&
          typeof f.key === "string" &&
          typeof f.label === "string" &&
          ["text", "email", "number", "select"].includes(f.type)
      )
      .map((f) => ({
        key: f.key,
        label: f.label,
        type: f.type,
        required: Boolean(f.required),
        options: Array.isArray(f.options)
          ? f.options.filter((o: unknown) => typeof o === "string")
          : undefined,
      }));
  } catch {
    return [];
  }
}

/** Generate a unique key for a new custom field given existing ones. */
export function makeFieldKey(label: string, existing: CollectField[]): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 32) || "field";
  let key = base;
  let n = 2;
  const taken = new Set(existing.map((f) => f.key));
  while (taken.has(key)) key = `${base}_${n++}`;
  return key;
}

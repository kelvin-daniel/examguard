"use client";

import { useState } from "react";
import { GripVertical, Plus, Trash2, X, ChevronUp, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  COLLECT_PRESETS,
  makeFieldKey,
  type CollectField,
  type CollectFieldType,
} from "@/lib/collect-fields";

const TYPE_LABELS: Record<CollectFieldType, string> = {
  text: "Text",
  email: "Email",
  number: "Number",
  select: "Dropdown",
};

export function CollectFieldsEditor({
  fields,
  onChange,
}: {
  fields: CollectField[];
  onChange: (fields: CollectField[]) => void;
}) {
  const [adding, setAdding] = useState(false);

  function update(key: string, patch: Partial<CollectField>) {
    onChange(fields.map((f) => (f.key === key ? { ...f, ...patch } : f)));
  }
  function remove(key: string) {
    onChange(fields.filter((f) => f.key !== key));
  }
  function move(key: string, dir: -1 | 1) {
    const i = fields.findIndex((f) => f.key === key);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= fields.length) return;
    const next = [...fields];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }
  function addPreset(preset: (typeof COLLECT_PRESETS)[number]) {
    if (fields.some((f) => f.key === preset.key)) return;
    onChange([...fields, { ...preset, required: true }]);
  }
  function addCustom() {
    const label = "Custom field";
    onChange([
      ...fields,
      {
        key: makeFieldKey(label, fields),
        label,
        type: "text",
        required: false,
      },
    ]);
    setAdding(false);
  }

  const usedPresetKeys = new Set(fields.map((f) => f.key));
  const availablePresets = COLLECT_PRESETS.filter(
    (p) => !usedPresetKeys.has(p.key)
  );

  return (
    <div className="space-y-3">
      {/* Always-present name field, shown locked for clarity */}
      <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)]/50 px-3 py-2.5">
        <GripVertical className="h-4 w-4 text-[var(--fg-subtle)] opacity-40" />
        <div className="flex-1">
          <div className="text-sm font-medium text-[var(--fg)]">Full name</div>
          <div className="text-xs text-[var(--fg-muted)]">
            Always collected · required
          </div>
        </div>
        <span className="text-xs text-[var(--fg-subtle)] uppercase tracking-wide">
          Locked
        </span>
      </div>

      {fields.map((f, i) => (
        <div
          key={f.key}
          className="rounded-xl border border-[var(--border)] bg-white dark:bg-white/5 p-3 space-y-3"
        >
          <div className="flex items-start gap-2">
            <div className="flex flex-col pt-1">
              <button
                type="button"
                onClick={() => move(f.key, -1)}
                disabled={i === 0}
                className="text-[var(--fg-subtle)] hover:text-[var(--fg)] disabled:opacity-30"
                aria-label="Move up"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => move(f.key, 1)}
                disabled={i === fields.length - 1}
                className="text-[var(--fg-subtle)] hover:text-[var(--fg)] disabled:opacity-30"
                aria-label="Move down"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 grid sm:grid-cols-[1fr_auto] gap-2">
              <Input
                value={f.label}
                onChange={(e) => update(f.key, { label: e.target.value })}
                placeholder="Field label"
                className="h-9"
              />
              <select
                value={f.type}
                onChange={(e) =>
                  update(f.key, {
                    type: e.target.value as CollectFieldType,
                    options:
                      e.target.value === "select"
                        ? f.options ?? ["Option 1"]
                        : undefined,
                  })
                }
                className="h-9 px-3 rounded-xl border border-[var(--border-strong)] bg-white dark:bg-white/5 text-sm text-[var(--fg)]"
              >
                {Object.entries(TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => remove(f.key)}
              className="text-[var(--fg-subtle)] hover:text-[#dc2626] pt-1.5"
              aria-label="Remove field"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {f.type === "select" && (
            <SelectOptions
              options={f.options ?? []}
              onChange={(options) => update(f.key, { options })}
            />
          )}

          <label className="flex items-center gap-2 text-sm text-[var(--fg-muted)]">
            <Switch
              checked={f.required}
              onChange={(v) => update(f.key, { required: v })}
              label="Required"
            />
            Required
          </label>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {availablePresets.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => addPreset(p)}
            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-full border border-[var(--border-strong)] text-[var(--fg-muted)] hover:border-[var(--primary)] hover:text-[var(--fg)]"
          >
            <Plus className="h-3.5 w-3.5" />
            {p.label}
          </button>
        ))}
        <Button type="button" variant="ghost" size="sm" onClick={addCustom}>
          <Plus className="h-4 w-4" /> Custom field
        </Button>
        {/* `adding` reserved for future inline form; keep state referenced */}
        {adding && <span className="sr-only">adding</span>}
      </div>
    </div>
  );
}

function SelectOptions({
  options,
  onChange,
}: {
  options: string[];
  onChange: (options: string[]) => void;
}) {
  return (
    <div className="pl-6 space-y-2">
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={opt}
            onChange={(e) => {
              const next = [...options];
              next[i] = e.target.value;
              onChange(next);
            }}
            placeholder={`Option ${i + 1}`}
            className="h-8"
          />
          {options.length > 1 && (
            <button
              type="button"
              onClick={() => onChange(options.filter((_, j) => j !== i))}
              className="text-[var(--fg-subtle)] hover:text-[#dc2626]"
              aria-label="Remove option"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      {options.length < 20 && (
        <button
          type="button"
          onClick={() => onChange([...options, ""])}
          className="text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] inline-flex items-center gap-1"
        >
          <Plus className="h-3.5 w-3.5" /> Add option
        </button>
      )}
    </div>
  );
}

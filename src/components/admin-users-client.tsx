"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Clock,
  ShieldX,
  Shield,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  approvedAt: string | null;
};

type Action = "approve" | "reject" | "promote" | "demote";

export function AdminUsersClient() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/users");
    if (!res.ok) return;
    const data = await res.json();
    setUsers(data.users);
  }

  useEffect(() => {
    void load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  async function act(id: string, action: Action) {
    setBusy(id + ":" + action);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(null);
    if (res.ok) await load();
    else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Action failed");
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Permanently delete ${name}? This removes all of their exams too.`))
      return;
    setBusy(id + ":delete");
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    setBusy(null);
    if (res.ok) await load();
    else alert("Delete failed");
  }

  if (!users)
    return <div className="text-[var(--fg-muted)]">Loading…</div>;

  const pending = users.filter((u) => u.status === "pending");
  const active = users.filter((u) => u.status === "active");
  const rejected = users.filter((u) => u.status === "rejected");

  return (
    <div className="space-y-10">
      <Section
        title="Pending approval"
        count={pending.length}
        accent="warning"
      >
        {pending.length === 0 ? (
          <Empty label="No pending requests right now." />
        ) : (
          <UserTable
            users={pending}
            busy={busy}
            actions={(u) => (
              <>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => act(u.id, "approve")}
                  disabled={busy === u.id + ":approve"}
                >
                  <Check className="h-4 w-4" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => act(u.id, "reject")}
                  disabled={busy === u.id + ":reject"}
                >
                  <X className="h-4 w-4" /> Reject
                </Button>
              </>
            )}
          />
        )}
      </Section>

      <Section title="Active" count={active.length}>
        {active.length === 0 ? (
          <Empty label="No active users yet." />
        ) : (
          <UserTable
            users={active}
            busy={busy}
            actions={(u) => (
              <>
                {u.role === "admin" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => act(u.id, "demote")}
                    disabled={busy === u.id + ":demote"}
                  >
                    <Shield className="h-4 w-4" /> Demote
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => act(u.id, "promote")}
                    disabled={busy === u.id + ":promote"}
                  >
                    <ShieldAlert className="h-4 w-4" /> Make admin
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(u.id, u.name)}
                  disabled={busy === u.id + ":delete"}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          />
        )}
      </Section>

      {rejected.length > 0 && (
        <Section title="Rejected" count={rejected.length} accent="danger">
          <UserTable
            users={rejected}
            busy={busy}
            actions={(u) => (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => act(u.id, "approve")}
                  disabled={busy === u.id + ":approve"}
                >
                  <Check className="h-4 w-4" /> Re-approve
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(u.id, u.name)}
                  disabled={busy === u.id + ":delete"}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          />
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  accent,
  children,
}: {
  title: string;
  count: number;
  accent?: "warning" | "danger";
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold text-[var(--fg)]">{title}</h2>
        <Badge variant={accent ?? "default"}>{count}</Badge>
      </div>
      {children}
    </section>
  );
}

function UserTable({
  users,
  busy,
  actions,
}: {
  users: User[];
  busy: string | null;
  actions: (u: User) => React.ReactNode;
}) {
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-white/40 dark:bg-white/5 text-left text-xs font-medium text-[var(--fg-muted)] uppercase tracking-wide">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Joined</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr
              key={u.id}
              className="border-t border-[var(--border)] text-[var(--fg)]"
            >
              <td className="px-4 py-3 font-medium">{u.name}</td>
              <td className="px-4 py-3 text-[var(--fg-muted)]">{u.email}</td>
              <td className="px-4 py-3">
                {u.role === "admin" ? (
                  <Badge variant="info">
                    <ShieldAlert className="h-3 w-3" /> Admin
                  </Badge>
                ) : (
                  <Badge variant="default">Teacher</Badge>
                )}
              </td>
              <td className="px-4 py-3 text-[var(--fg-muted)] text-xs">
                {relTime(u.createdAt)}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                  {actions(u)}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-8 text-center text-sm text-[var(--fg-muted)] flex items-center justify-center gap-2">
      <Clock className="h-4 w-4" />
      {label}
    </div>
  );
}

function relTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

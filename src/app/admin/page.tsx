import { AdminUsersClient } from "@/components/admin-users-client";

export default function AdminPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--fg)]">
          User management
        </h1>
        <p className="text-[var(--fg-muted)] mt-1">
          Approve new teachers, manage admins, and remove inactive accounts.
        </p>
      </div>
      <AdminUsersClient />
    </div>
  );
}

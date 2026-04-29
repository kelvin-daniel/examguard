import { Suspense } from "react";
import { JoinForm } from "./join-form";

export default function JoinPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <div className="aurora pointer-events-none fixed inset-0 -z-10" aria-hidden />
      <div className="w-full max-w-md">
        <Suspense fallback={null}>
          <JoinForm />
        </Suspense>
      </div>
    </div>
  );
}

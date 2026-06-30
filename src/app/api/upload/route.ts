import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { uploadBuffer } from "@/lib/storage";

// Client compresses to a byte budget first; this is a generous safety ceiling
// that also leaves room for GIFs (which pass through uncompressed).
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function POST(req: Request) {
  const user = await requireUser().catch(() => null);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData().catch(() => null);
  if (!formData)
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });

  const file = formData.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "Missing file" }, { status: 400 });

  if (!ALLOWED_MIME.has(file.type))
    return NextResponse.json(
      {
        error: "Only PNG, JPEG, GIF, and WebP images are allowed.",
      },
      { status: 400 }
    );

  if (file.size > MAX_BYTES)
    return NextResponse.json(
      { error: "Image must be smaller than 5 MB." },
      { status: 400 }
    );

  const buffer = Buffer.from(await file.arrayBuffer());
  const { url, storedRemotely } = await uploadBuffer(
    buffer,
    file.type,
    `images/${user.id}`
  );

  return NextResponse.json({ url, storedRemotely });
}

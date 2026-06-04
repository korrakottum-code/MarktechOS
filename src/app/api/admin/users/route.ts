import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/lib/server/supabase-admin";
import { prisma } from "@/lib/server/prisma";

// Helper: check if current user is ceo/admin
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const role = user.app_metadata?.role;
  // CEO email or explicit admin/ceo role
  if (user.email === "korrakottum@gmail.com") return user;
  if (role === "ceo" || role === "admin") return user;
  return null;
}

// ── GET /api/admin/users — List all users ─────────────────────────────────────
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const supabaseAdmin = createAdminClient();
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 100,
    });

    if (error) throw error;

    // Also fetch all available pages for the dropdown
    const allPages = await prisma.pageNameCache.findMany({
      orderBy: { pageName: "asc" },
    });

    // Format users for the frontend
    const formattedUsers = users.map(u => ({
      id: u.id,
      email: u.email || "",
      role: u.app_metadata?.role || "admin",
      allowedPages: Array.isArray(u.app_metadata?.allowed_pages)
        ? u.app_metadata.allowed_pages
        : [],
      displayName: u.user_metadata?.full_name || u.user_metadata?.name || u.email || u.id,
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at,
    }));

    return NextResponse.json({
      users: formattedUsers,
      allPages: allPages.map(p => ({ pageId: p.pageId, pageName: p.pageName })),
    });
  } catch (err: any) {
    console.error("❌ admin/users GET error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST /api/admin/users — Create new user ───────────────────────────────────
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { email, password, role, allowedPages, displayName } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email verification
      app_metadata: {
        role: role || "client",
        ...(Array.isArray(allowedPages) && allowedPages.length > 0
          ? { allowed_pages: allowedPages }
          : {}),
      },
      user_metadata: {
        ...(displayName ? { full_name: displayName } : {}),
      },
    });

    if (error) throw error;

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        role: data.user.app_metadata?.role || "client",
        allowedPages: data.user.app_metadata?.allowed_pages || [],
      },
      message: "User created successfully",
    });
  } catch (err: any) {
    console.error("❌ admin/users POST error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PUT /api/admin/users — Update user ────────────────────────────────────────
export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { userId, role, allowedPages, displayName } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    const updatePayload: any = {
      app_metadata: {
        role: role || "client",
        allowed_pages: Array.isArray(allowedPages) ? allowedPages : [],
      },
    };

    if (displayName !== undefined) {
      updatePayload.user_metadata = { full_name: displayName };
    }

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      updatePayload
    );

    if (error) throw error;

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        role: data.user.app_metadata?.role,
        allowedPages: data.user.app_metadata?.allowed_pages || [],
      },
      message: "User updated successfully",
    });
  } catch (err: any) {
    console.error("❌ admin/users PUT error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── DELETE /api/admin/users — Delete user ─────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = req.nextUrl;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Prevent deleting yourself
    if (userId === admin.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) throw error;

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (err: any) {
    console.error("❌ admin/users DELETE error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

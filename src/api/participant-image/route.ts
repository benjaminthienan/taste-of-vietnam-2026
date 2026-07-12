import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY;

function getAdminClient() {
  if (!supabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is missing from .env.local."
    );
  }

  if (!supabaseSecretKey) {
    throw new Error(
      "SUPABASE_SECRET_KEY is missing from .env.local."
    );
  }

  return createClient(
    supabaseUrl,
    supabaseSecretKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

export async function GET() {
  try {
    const adminSupabase = getAdminClient();

    const { data, error } = await adminSupabase
      .from("profiles")
      .select("id, name, username, role")
      .eq("role", "staff")
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      staff: data ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not load staff accounts.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const username =
      typeof body.username === "string"
        ? body.username
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9._-]/g, "")
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!name) {
      return NextResponse.json(
        { error: "Staff name is required." },
        { status: 400 }
      );
    }

    if (!username) {
      return NextResponse.json(
        { error: "Username is required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          error:
            "Password must contain at least 6 characters.",
        },
        { status: 400 }
      );
    }

    const adminSupabase = getAdminClient();
    const internalEmail = `${username}@staff.tov`;

    const { data: existingProfile } =
      await adminSupabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();

    if (existingProfile) {
      return NextResponse.json(
        {
          error:
            "That username is already being used.",
        },
        { status: 409 }
      );
    }

    const {
      data: authData,
      error: authError,
    } =
      await adminSupabase.auth.admin.createUser({
        email: internalEmail,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          username,
          role: "staff",
        },
      });

    if (authError || !authData.user) {
      return NextResponse.json(
        {
          error:
            authError?.message ||
            "Could not create the login account.",
        },
        { status: 400 }
      );
    }

    const { data: profile, error: profileError } =
      await adminSupabase
        .from("profiles")
        .insert({
          id: authData.user.id,
          name,
          username,
          role: "staff",
        })
        .select("id, name, username, role")
        .single();

    if (profileError) {
      await adminSupabase.auth.admin.deleteUser(
        authData.user.id
      );

      return NextResponse.json(
        {
          error: `Could not create the staff profile: ${profileError.message}`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { staff: profile },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create the staff account.",
      },
      { status: 500 }
    );
  }
}
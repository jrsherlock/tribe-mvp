// Supabase Edge Function: invite_user
// Generates a secure invite token, stores it, and sends an invitation email

// Deno runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS helpers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function generateSecureToken(size = 32): string {
  const buf = new Uint8Array(size);
  crypto.getRandomValues(buf);
  return base64UrlEncode(buf);
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return json({ error: "Missing Supabase environment variables" }, 500);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    type Body = {
      email: string;
      tenant_id: string;
      role?: string; // 'ADMIN' | 'MEMBER' | 'OWNER' (we will limit below)
      expires_in_days?: number; // default 7
    };

    const body = (await req.json()) as Body;
    const targetEmail = (body.email || "").trim().toLowerCase();
    const tenantId = body.tenant_id;
    const requestedRoleRaw = (body.role || "MEMBER").toUpperCase().replace(/-/g, "_");
    const requestedRole = requestedRoleRaw === "FACILITY_ADMIN" ? "ADMIN" : requestedRoleRaw;
    const expiresDays = Math.min(Math.max(Number(body.expires_in_days || 7), 1), 30);

    if (!targetEmail || !tenantId) {
      return json({ error: "email and tenant_id are required" }, 400);
    }

    // Only allow inviting as MEMBER or ADMIN (OWNER reserved)
    const allowedRoles = new Set(["MEMBER", "ADMIN"]);
    if (!allowedRoles.has(requestedRole)) {
      return json({ error: "Invalid role. Allowed roles: MEMBER, ADMIN" }, 400);
    }

    // Verify caller has OWNER or ADMIN membership in the tenant
    const { data: membership, error: membershipError } = await supabase
      .from("tenant_members")
      .select("role")
      .eq("user_id", authData.user.id)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (membershipError || !membership || !["OWNER", "ADMIN"].includes(membership.role)) {
      return json({ error: "Forbidden: requires tenant OWNER or ADMIN" }, 403);
    }

    // Get tenant name for email content (optional)
    const { data: tenant, error: tenantErr } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", tenantId)
      .maybeSingle();

    const token = generateSecureToken(48);
    const expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString();

    // Insert invite
    const { data: invite, error: inviteError } = await supabase
      .from("invites")
      .insert({
        tenant_id: tenantId,
        email: targetEmail,
        role: requestedRole,
        token,
        expires_at: expiresAt,
      })
      .select("id, token, email, tenant_id, role, expires_at, created_at")
      .single();

    if (inviteError) {
      return json({ error: "Failed to create invite", details: inviteError.message }, 500);
    }

    // Send email via SendGrid (recommended) or return invite for manual handling
    const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
    const fromEmail = Deno.env.get("INVITE_FROM_EMAIL") || "no-reply@your-app.com";
    const appBaseUrl = Deno.env.get("APP_BASE_URL") || "https://your-app.com";
    const acceptUrl = `${appBaseUrl.replace(/\/$/, "")}/accept-invite?token=${encodeURIComponent(token)}`;

    const subject = `You're invited to join ${tenant?.name ?? "our app"}`;
    const plainText = `Hello!\n\nYou've been invited to join ${tenant?.name ?? "our app"} as ${requestedRole}.\n\nAccept your invite: ${acceptUrl}\n\nThis link will expire on ${new Date(expiresAt).toLocaleString()}.\n\nIf you weren't expecting this, you can ignore this email.`;

    if (!sendgridApiKey) {
      // If email is not configured yet, return the accept URL so the caller can deliver it another way
      return json({
        message: "Invite created. Email sending not configured (missing SENDGRID_API_KEY).",
        invite,
        accept_url: acceptUrl,
      });
    }

    const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sendgridApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: targetEmail }],
            subject,
          },
        ],
        from: { email: fromEmail, name: tenant?.name ?? "Tribe" },
        content: [
          { type: "text/plain", value: plainText },
        ],
      }),
    });

    if (!sgRes.ok) {
      const errTxt = await sgRes.text();
      return json({
        error: "Invite created but failed to send email via SendGrid",
        invite,
        details: errTxt,
        accept_url: acceptUrl,
      }, 502);
    }

    return json({ message: "Invite created and email sent", invite });
  } catch (e: any) {
    console.error("invite_user error", e);
    return json({ error: "Unexpected error", details: String(e?.message ?? e) }, 500);
  }
});


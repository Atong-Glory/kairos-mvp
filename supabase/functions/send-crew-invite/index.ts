// Supabase Edge Function: Send Email Invitation to Crew
// This function sends a professional email invitation using Supabase's Admin API
// Call this from the client with: supabase.functions.invoke('send-crew-invite', {...})

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { render } from "https://esm.sh/preact-render-to-string@6.2.3";

// Initialize Supabase with service role (server-side, secure)
const supabaseServiceRole = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface InviteRequest {
  email: string;
  full_name: string;
  project_id: string;
  invited_by_user_id: string;
  permission_level: "viewer" | "editor";
}

// Email template component
const EmailTemplate = (props: {
  full_name: string;
  inviter_name: string;
  project_name: string;
  invite_link: string;
}) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #0F172A; color: #F8FAFC; padding: 20px; border-radius: 8px; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">🎬 You're Invited!</h1>
  </div>
  
  <div style="padding: 30px; background-color: #f8f9fa; border-radius: 8px; margin-top: 20px;">
    <p>Hi <strong>${props.full_name}</strong>,</p>
    
    <p><strong>${props.inviter_name}</strong> has invited you to join the production team for <strong>${props.project_name}</strong> on KAIRO.</p>
    
    <p style="margin-top: 30px; text-align: center;">
      <a href="${props.invite_link}" 
         style="background-color: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
        Accept Invitation
      </a>
    </p>
    
    <p style="color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
      If you didn't expect this invitation, you can safely ignore this email.
      This invitation link will expire in 24 hours.
    </p>
  </div>
</div>
`;

export async function handler(req: Request): Promise<Response> {
  try {
    // Verify request method
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { email, full_name, project_id, invited_by_user_id, permission_level } =
      (await req.json()) as InviteRequest;

    // Validation
    if (!email || !full_name || !project_id || !invited_by_user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 1. Check if user already exists
    const { data: existingUser } = await supabaseServiceRole
      .from("users")
      .select("id, full_name")
      .eq("email", email.toLowerCase())
      .single();

    if (existingUser) {
      // User exists - check if already on project
      const { data: existingRole } = await supabaseServiceRole
        .from("project_roles")
        .select("id")
        .eq("project_id", project_id)
        .eq("user_id", existingUser.id)
        .single();

      if (existingRole) {
        return new Response(
          JSON.stringify({ error: "User is already on this project" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Add existing user to project
      const { error: roleError } = await supabaseServiceRole
        .from("project_roles")
        .insert({
          project_id,
          user_id: existingUser.id,
          role_id: "producer", // Default role - can be customized
          permission_level: permission_level || "viewer",
        });

      if (roleError) throw roleError;

      return new Response(
        JSON.stringify({
          success: true,
          message: `${full_name} added to project (already registered)`,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. User doesn't exist - create invitation
    // Get inviter's name for email
    const { data: inviterData } = await supabaseServiceRole
      .from("users")
      .select("full_name")
      .eq("id", invited_by_user_id)
      .single();

    const inviterName = inviterData?.full_name || "A team member";

    // Get project name
    const { data: projectData } = await supabaseServiceRole
      .from("projects")
      .select("title")
      .eq("id", project_id)
      .single();

    const projectName = projectData?.title || "the project";

    // 3. Create magic link invitation (using Supabase Admin API)
    // This generates a passwordless signup link
    const redirectUrl = `${Deno.env.get("SITE_URL")}/auth/accept-invite?project_id=${project_id}&permission_level=${permission_level || "viewer"}`;

    const { data: inviteData, error: inviteError } =
      await supabaseServiceRole.auth.admin.inviteUserByEmail(email, {
        data: {
          full_name,
          project_id,
          permission_level: permission_level || "viewer",
        },
        redirectTo: redirectUrl,
      });

    if (inviteError) throw inviteError;

    // 4. Store invitation record for tracking
    const { error: trackError } = await supabaseServiceRole
      .from("users")
      .insert({
        id: inviteData?.user?.id,
        email: email.toLowerCase(),
        full_name,
        tenant_id: (await supabaseServiceRole
          .from("projects")
          .select("tenant_id")
          .eq("id", project_id)
          .single()).data?.tenant_id,
        invite_status: "invited",
        invitation_sent_at: new Date().toISOString(),
        last_invite_email: email.toLowerCase(),
      })
      .single();

    // 5. Create project role entry (user starts as invited)
    await supabaseServiceRole.from("project_roles").insert({
      project_id,
      user_id: inviteData?.user?.id,
      role_id: "producer", // Default role
      permission_level: permission_level || "viewer",
    });

    // 6. Send custom email via Supabase Email (optional - if you have custom email configured)
    // For now, rely on the built-in Supabase invitation email
    // You can enhance this by calling a custom email service

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invitation sent to ${email}`,
        user_id: inviteData?.user?.id,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending invitation:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// delete-account: removes the calling member's storage objects, legacy rows,
// and auth account. Vendored from the deployed v2 function so it lives in
// version control with the rest of the backend.
//
// New-schema tables (profiles, workout_sessions, meals, ...) all have
// user_id -> auth.users ON DELETE CASCADE, so auth.admin.deleteUser() removes
// them; the explicit deletes below cover the legacy tables and storage, whose
// objects are not tied to the auth user by FK.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = request.headers.get("Authorization");

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !authHeader) {
    return new Response("Missing function configuration.", {
      status: 500,
      headers: corsHeaders,
    });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return new Response("Unauthorized", {
      status: 401,
      headers: corsHeaders,
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const deleteFilesAtPath = async (bucket: string, path: string) => {
    const { data, error } = await adminClient.storage.from(bucket).list(path, {
      limit: 1000,
    });

    if (error || !data || data.length === 0) {
      return;
    }

    const filePaths = data
      .filter((item) => item.name && !item.id?.endsWith("/"))
      .map((item) => `${path}/${item.name}`);

    if (filePaths.length > 0) {
      await adminClient.storage.from(bucket).remove(filePaths);
    }
  };

  await deleteFilesAtPath("profile-images", `users/${user.id}`);
  await deleteFilesAtPath("progress-photo", `users/${user.id}/workouts`);
  // Legacy tables (dual-run period); new-schema rows cascade from deleteUser.
  await adminClient.from("workouts").delete().eq("user_id", user.id);
  await adminClient.from("user_profiles").delete().eq("user_id", user.id);

  const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(user.id);
  if (deleteUserError) {
    return new Response(deleteUserError.message, {
      status: 500,
      headers: corsHeaders,
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
});

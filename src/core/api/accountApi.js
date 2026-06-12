// Account deletion via the delete-account Edge Function: removes storage
// objects and legacy rows, then deletes the auth user (new-schema rows
// cascade). The caller signs the member out afterwards.
import { supabase } from "./client";

export async function deleteAccount() {
  const { error } = await supabase.functions.invoke("delete-account", {
    method: "POST",
    body: {},
  });
  if (error) {
    throw new Error(error.message ?? "Unable to delete account.");
  }
}

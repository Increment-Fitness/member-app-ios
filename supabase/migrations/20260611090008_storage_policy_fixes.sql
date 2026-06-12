-- Storage policy fixes (gate-1 approved security cleanup).
--
-- 1. "Public read for images" granted ANONYMOUS SELECT on profile-images
--    (and on 'progress-photos', a bucket that does not exist). Member profile
--    photos must not be world-readable. The legacy Swift app downloads via
--    authenticated supabase.storage.download() calls (SupabaseStore.swift),
--    so dropping this changes nothing for it.
-- 2. "Users can manage their images" also referenced the nonexistent
--    'progress-photos' bucket; its only live effect (owner access to
--    profile-images) is already covered by the per-bucket
--    "profile images select/insert/update/delete" policies.
--
-- After this migration the surviving storage policies are the eight
-- per-bucket owner-only policies on the two real buckets
-- (profile-images, progress-photo). Nothing storage-side is public.

drop policy if exists "Public read for images" on storage.objects;
drop policy if exists "Users can manage their images" on storage.objects;

REVOKE EXECUTE ON FUNCTION public.sync_story_format_collections(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_story_format_collections(uuid) TO service_role;
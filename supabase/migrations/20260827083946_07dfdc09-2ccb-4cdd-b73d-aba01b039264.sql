REVOKE EXECUTE ON FUNCTION public.sync_story_format_collections(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.trg_sync_story_format() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.create_story(text,text,text,text,text,text,text,text,text,text,integer,text,text,text,boolean,text) FROM anon, public;
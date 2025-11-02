-- Fix function search path security issue
DROP TRIGGER IF EXISTS update_session_on_message ON public.chat_messages CASCADE;
DROP FUNCTION IF EXISTS update_chat_session_timestamp() CASCADE;

CREATE OR REPLACE FUNCTION update_chat_session_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_sessions 
  SET updated_at = now() 
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_session_on_message
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_chat_session_timestamp();
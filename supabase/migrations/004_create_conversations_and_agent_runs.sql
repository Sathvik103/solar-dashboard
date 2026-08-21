-- Migration: 004_create_conversations_and_agent_runs.sql
-- Description: Creates conversations, messages, and agent_runs tables with RLS policies and triggers.

-- 1. Conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT 'New Solar Consultation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content         TEXT NOT NULL,
  citations       JSONB NOT NULL DEFAULT '[]'::jsonb,
  tool_calls      JSONB NOT NULL DEFAULT '[]'::jsonb,
  trace_events    JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Agent Runs table (observability and execution logs)
CREATE TABLE IF NOT EXISTS public.agent_runs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  conversation_id     UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  request             TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('running', 'completed', 'failed')),
  tools_used          JSONB NOT NULL DEFAULT '[]'::jsonb,
  retrieval_count     INT NOT NULL DEFAULT 0,
  verification_status TEXT NOT NULL DEFAULT 'passed',
  latency_ms          INT NOT NULL DEFAULT 0,
  error_message       TEXT,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_user_id ON public.agent_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_conversation_id ON public.agent_runs(conversation_id);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS set_conversations_updated_at ON public.conversations;
CREATE TRIGGER set_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

-- Policies for conversations: user can only see/modify their own conversations
DROP POLICY IF EXISTS "conversations_select_own" ON public.conversations;
CREATE POLICY "conversations_select_own" ON public.conversations FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "conversations_insert_own" ON public.conversations;
CREATE POLICY "conversations_insert_own" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "conversations_update_own" ON public.conversations;
CREATE POLICY "conversations_update_own" ON public.conversations FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "conversations_delete_own" ON public.conversations;
CREATE POLICY "conversations_delete_own" ON public.conversations FOR DELETE USING (auth.uid() = user_id);

-- Policies for messages: user can only see/modify messages belonging to them
DROP POLICY IF EXISTS "messages_select_own" ON public.messages;
CREATE POLICY "messages_select_own" ON public.messages FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
CREATE POLICY "messages_insert_own" ON public.messages FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "messages_delete_own" ON public.messages;
CREATE POLICY "messages_delete_own" ON public.messages FOR DELETE USING (auth.uid() = user_id);

-- Policies for agent_runs: user can only view their own runs
DROP POLICY IF EXISTS "agent_runs_select_own" ON public.agent_runs;
CREATE POLICY "agent_runs_select_own" ON public.agent_runs FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "agent_runs_insert_own" ON public.agent_runs;
CREATE POLICY "agent_runs_insert_own" ON public.agent_runs FOR INSERT WITH CHECK (auth.uid() = user_id);

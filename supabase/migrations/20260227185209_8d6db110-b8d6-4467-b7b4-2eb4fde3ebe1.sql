
-- Messages table for patient-professional communication
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Sender can view messages they sent
CREATE POLICY "Users can view their own messages"
ON public.messages FOR SELECT
USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Authenticated users can send messages
CREATE POLICY "Users can send messages"
ON public.messages FOR INSERT
WITH CHECK (sender_id = auth.uid());

-- Receiver can mark messages as read
CREATE POLICY "Receiver can update messages"
ON public.messages FOR UPDATE
USING (receiver_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Index for faster queries
CREATE INDEX idx_messages_patient ON public.messages(patient_id);
CREATE INDEX idx_messages_participants ON public.messages(sender_id, receiver_id);

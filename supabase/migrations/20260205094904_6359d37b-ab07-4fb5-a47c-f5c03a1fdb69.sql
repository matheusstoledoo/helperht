-- Add source tracking to documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS source_trail_id UUID REFERENCES public.care_trails(id),
ADD COLUMN IF NOT EXISTS source_enrollment_id UUID REFERENCES public.trail_enrollments(id),
ADD COLUMN IF NOT EXISTS source_contact_point_id UUID REFERENCES public.trail_contact_points(id);

-- Add source tracking to goals table
ALTER TABLE public.goals 
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS source_trail_id UUID REFERENCES public.care_trails(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_documents_source_trail ON public.documents(source_trail_id) WHERE source_trail_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_source_enrollment ON public.documents(source_enrollment_id) WHERE source_enrollment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_goals_source_trail ON public.goals(source_trail_id) WHERE source_trail_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.documents.source_type IS 'Origin of document: manual, trail, exam_result';
COMMENT ON COLUMN public.documents.source_trail_id IS 'Reference to the care trail if uploaded via trail';
COMMENT ON COLUMN public.goals.source_type IS 'Origin of goal: manual, trail, consultation';
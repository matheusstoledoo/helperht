
-- Enable RLS on protocols
ALTER TABLE public.protocols ENABLE ROW LEVEL SECURITY;

-- Enable RLS on protocol_phases
ALTER TABLE public.protocol_phases ENABLE ROW LEVEL SECURITY;

-- Protocols are reference data - all authenticated users can read
CREATE POLICY "Authenticated users can view protocols"
ON public.protocols FOR SELECT
TO authenticated
USING (true);

-- Only admins can modify protocols
CREATE POLICY "Admins can manage protocols"
ON public.protocols FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Protocol phases follow the same pattern
CREATE POLICY "Authenticated users can view protocol phases"
ON public.protocol_phases FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage protocol phases"
ON public.protocol_phases FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

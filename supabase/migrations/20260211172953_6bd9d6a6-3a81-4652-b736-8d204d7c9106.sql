
-- Drop the recursive policy
DROP POLICY IF EXISTS "Patients can view trails they are enrolled in" ON public.care_trails;

-- Create a security definer function to check if a patient is enrolled in a trail
CREATE OR REPLACE FUNCTION public.patient_is_enrolled_in_trail(_user_id uuid, _trail_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM trail_enrollments te
    JOIN patients p ON te.patient_id = p.id
    WHERE p.user_id = _user_id
      AND te.trail_id = _trail_id
  )
$$;

-- Re-create the policy using the security definer function
CREATE POLICY "Patients can view trails they are enrolled in"
ON public.care_trails
FOR SELECT
USING (
  public.patient_is_enrolled_in_trail(auth.uid(), id)
);

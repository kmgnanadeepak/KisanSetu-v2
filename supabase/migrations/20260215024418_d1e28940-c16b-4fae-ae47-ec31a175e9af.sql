-- Allow authenticated users to view merchant profiles
CREATE POLICY "Authenticated users can view merchant profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = profiles.user_id
    AND user_roles.role = 'merchant'
  )
);

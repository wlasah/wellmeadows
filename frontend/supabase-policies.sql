-- Supabase policy examples for development/testing only.
-- Replace these with secure policies before deploying to production.

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read/write patients" ON patients
  FOR ALL
  USING (auth.role() = 'anon')
  WITH CHECK (auth.role() = 'anon');

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read/write appointments" ON appointments
  FOR ALL
  USING (auth.role() = 'anon')
  WITH CHECK (auth.role() = 'anon');

ALTER TABLE in_patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read/write admissions" ON in_patients
  FOR ALL
  USING (auth.role() = 'anon')
  WITH CHECK (auth.role() = 'anon');

ALTER TABLE wards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read wards" ON wards
  FOR SELECT
  USING (auth.role() = 'anon');

ALTER TABLE beds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read beds" ON beds
  FOR SELECT
  USING (auth.role() = 'anon');

ALTER TABLE patient_medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read medications" ON patient_medications
  FOR ALL
  USING (auth.role() = 'anon')
  WITH CHECK (auth.role() = 'anon');

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read staff" ON staff
  FOR SELECT
  USING (auth.role() = 'anon');

ALTER TABLE staff_department_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read schedule" ON staff_department_assignments
  FOR SELECT
  USING (auth.role() = 'anon');

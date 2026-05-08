-- Wellmeadows Hospital full Supabase/Postgres schema
-- Use this SQL in Supabase SQL editor or psql.
-- Note: Firebase is not SQL-based. For this project, continue with Supabase/Postgres.

CREATE TABLE local_doctors (
    local_doctor_id BIGSERIAL PRIMARY KEY,
    clinic_number TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    address TEXT,
    telephone TEXT,
    email TEXT
);

CREATE TABLE patients (
    patient_number TEXT PRIMARY KEY,
    local_doctor_id BIGINT REFERENCES local_doctors(local_doctor_id),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    address TEXT,
    telephone TEXT,
    date_of_birth DATE,
    sex TEXT,
    marital_status TEXT,
    date_registered DATE DEFAULT CURRENT_DATE,
    referral_source TEXT,
    referral_reason TEXT
);

CREATE TABLE next_of_kin (
    next_of_kin_id BIGSERIAL PRIMARY KEY,
    patient_number TEXT REFERENCES patients(patient_number) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    relationship TEXT,
    address TEXT,
    telephone TEXT
);

CREATE TABLE patient_medical_records (
    medical_record_id BIGSERIAL PRIMARY KEY,
    patient_number TEXT REFERENCES patients(patient_number) ON DELETE CASCADE,
    record_date DATE DEFAULT CURRENT_DATE,
    description TEXT,
    notes TEXT
);

CREATE TABLE departments (
    department_id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT
);

CREATE TABLE staff (
    staff_number TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    address TEXT,
    telephone TEXT,
    date_of_birth DATE,
    sex TEXT,
    position TEXT,
    current_salary NUMERIC,
    contract_type TEXT,
    salary_scale TEXT
);

CREATE TABLE wards (
    ward_number BIGSERIAL PRIMARY KEY,
    ward_name TEXT NOT NULL,
    location TEXT,
    total_beds INTEGER DEFAULT 0,
    telephone_extension TEXT,
    charge_nurse_id TEXT REFERENCES staff(staff_number)
);

CREATE TABLE beds (
    bed_number BIGSERIAL PRIMARY KEY,
    ward_number BIGINT REFERENCES wards(ward_number) ON DELETE SET NULL,
    bed_status TEXT DEFAULT 'Available',
    bed_type TEXT,
    notes TEXT
);

CREATE TABLE bed_occupancy_history (
    occupancy_id BIGSERIAL PRIMARY KEY,
    bed_number BIGINT REFERENCES beds(bed_number) ON DELETE CASCADE,
    patient_number TEXT REFERENCES patients(patient_number) ON DELETE CASCADE,
    date_occupied DATE NOT NULL,
    date_vacated DATE,
    notes TEXT
);

CREATE TABLE waiting_list (
    waiting_id BIGSERIAL PRIMARY KEY,
    patient_number TEXT REFERENCES patients(patient_number) ON DELETE CASCADE,
    ward_number BIGINT REFERENCES wards(ward_number) ON DELETE CASCADE,
    date_placed DATE DEFAULT CURRENT_DATE,
    expected_duration INTEGER,
    priority_level INTEGER DEFAULT 1,
    status TEXT DEFAULT 'Waiting'
);

CREATE TABLE in_patients (
    inpatient_id BIGSERIAL PRIMARY KEY,
    patient_number TEXT REFERENCES patients(patient_number) ON DELETE CASCADE,
    ward_number BIGINT REFERENCES wards(ward_number) ON DELETE SET NULL,
    bed_number BIGINT REFERENCES beds(bed_number) ON DELETE SET NULL,
    date_placed DATE DEFAULT CURRENT_DATE,
    expected_duration INTEGER,
    date_expected_leave DATE,
    admission_reason TEXT,
    actual_leave_date DATE
);

CREATE TABLE qualifications (
    qualification_id BIGSERIAL PRIMARY KEY,
    staff_number TEXT REFERENCES staff(staff_number) ON DELETE CASCADE,
    qualification_type TEXT,
    qualification_date DATE,
    institution TEXT
);

CREATE TABLE work_experience (
    experience_id BIGSERIAL PRIMARY KEY,
    staff_number TEXT REFERENCES staff(staff_number) ON DELETE CASCADE,
    position TEXT,
    organization TEXT,
    start_date DATE,
    finish_date DATE
);

CREATE TABLE shifts (
    shift_id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    start_time TIME,
    end_time TIME
);

CREATE TABLE staff_department_assignments (
    assignment_id BIGSERIAL PRIMARY KEY,
    staff_number TEXT REFERENCES staff(staff_number) ON DELETE CASCADE,
    department_id BIGINT REFERENCES departments(department_id) ON DELETE CASCADE,
    start_date DATE,
    end_date DATE,
    is_head BOOLEAN DEFAULT FALSE
);

CREATE TABLE staff_role_history (
    role_history_id BIGSERIAL PRIMARY KEY,
    staff_number TEXT REFERENCES staff(staff_number) ON DELETE CASCADE,
    role TEXT,
    start_date DATE,
    end_date DATE,
    notes TEXT
);

CREATE TABLE appointments (
    appointment_number TEXT PRIMARY KEY,
    patient_number TEXT REFERENCES patients(patient_number) ON DELETE CASCADE,
    staff_number TEXT REFERENCES staff(staff_number) ON DELETE SET NULL,
    appointment_date DATE,
    appointment_time TIME,
    examination_room TEXT,
    appointment_status TEXT DEFAULT 'Scheduled'
);

CREATE TABLE outpatients (
    outpatient_id BIGSERIAL PRIMARY KEY,
    patient_number TEXT REFERENCES patients(patient_number) ON DELETE CASCADE,
    clinic_name TEXT,
    visit_date DATE DEFAULT CURRENT_DATE,
    notes TEXT
);

CREATE TABLE treatments (
    treatment_id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT
);

CREATE TABLE treatment_providers (
    provider_id BIGSERIAL PRIMARY KEY,
    treatment_id BIGINT REFERENCES treatments(treatment_id) ON DELETE CASCADE,
    patient_number TEXT REFERENCES patients(patient_number) ON DELETE CASCADE,
    staff_number TEXT REFERENCES staff(staff_number) ON DELETE SET NULL,
    treatment_date DATE DEFAULT CURRENT_DATE,
    outcome TEXT,
    notes TEXT
);

CREATE TABLE patient_visit_history (
    visit_id BIGSERIAL PRIMARY KEY,
    patient_number TEXT REFERENCES patients(patient_number) ON DELETE CASCADE,
    ward_number BIGINT REFERENCES wards(ward_number) ON DELETE SET NULL,
    diagnosis_id BIGINT,
    bill_id BIGINT,
    visit_date DATE DEFAULT CURRENT_DATE,
    visit_type TEXT,
    notes TEXT
);

CREATE TABLE diagnoses (
    diagnosis_id BIGSERIAL PRIMARY KEY,
    patient_number TEXT REFERENCES patients(patient_number) ON DELETE CASCADE,
    visit_id BIGINT REFERENCES patient_visit_history(visit_id) ON DELETE SET NULL,
    staff_number TEXT REFERENCES staff(staff_number) ON DELETE SET NULL,
    diagnosis_description TEXT,
    diagnosis_date DATE DEFAULT CURRENT_DATE
);

CREATE TABLE pharmaceutical_supplies (
    drug_number TEXT PRIMARY KEY,
    drug_name TEXT NOT NULL,
    description TEXT,
    quantity_in_stock INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 0,
    cost_per_unit NUMERIC
);

CREATE TABLE surgical_nonsurgical_supplies (
    supply_number TEXT PRIMARY KEY,
    supply_name TEXT NOT NULL,
    description TEXT,
    quantity_in_stock INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 0,
    cost_per_unit NUMERIC,
    supply_type TEXT
);

CREATE TABLE suppliers (
    supplier_id BIGSERIAL PRIMARY KEY,
    supplier_name TEXT NOT NULL,
    address TEXT,
    telephone TEXT,
    email TEXT
);

CREATE TABLE supplies_supplier (
    supplies_supplier_id BIGSERIAL PRIMARY KEY,
    supplier_id BIGINT REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
    drug_number TEXT REFERENCES pharmaceutical_supplies(drug_number) ON DELETE CASCADE,
    supply_number TEXT REFERENCES surgical_nonsurgical_supplies(supply_number) ON DELETE CASCADE,
    purchase_price NUMERIC,
    supplied_date DATE DEFAULT CURRENT_DATE
);

CREATE TABLE patient_medications (
    patient_medication_id BIGSERIAL PRIMARY KEY,
    patient_number TEXT REFERENCES patients(patient_number) ON DELETE CASCADE,
    drug_number TEXT REFERENCES pharmaceutical_supplies(drug_number) ON DELETE SET NULL,
    dosage TEXT,
    method_of_admin TEXT,
    units_per_day INTEGER,
    start_date DATE,
    finish_date DATE,
    notes TEXT
);

CREATE TABLE appointments_diagnoses (
    appointment_diagnosis_id BIGSERIAL PRIMARY KEY,
    appointment_number TEXT REFERENCES appointments(appointment_number) ON DELETE CASCADE,
    diagnosis_id BIGINT REFERENCES diagnoses(diagnosis_id) ON DELETE CASCADE
);

CREATE TABLE prescriptions (
    prescription_id BIGSERIAL PRIMARY KEY,
    patient_number TEXT REFERENCES patients(patient_number) ON DELETE CASCADE,
    drug_number TEXT REFERENCES pharmaceutical_supplies(drug_number) ON DELETE SET NULL,
    staff_number TEXT REFERENCES staff(staff_number) ON DELETE SET NULL,
    dosage TEXT,
    method_of_admin TEXT,
    units_per_day INTEGER,
    start_date DATE,
    finish_date DATE,
    notes TEXT
);

CREATE TABLE bills (
    bill_id BIGSERIAL PRIMARY KEY,
    patient_number TEXT REFERENCES patients(patient_number) ON DELETE CASCADE,
    visit_id BIGINT REFERENCES patient_visit_history(visit_id) ON DELETE SET NULL,
    bill_date DATE DEFAULT CURRENT_DATE,
    total_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Unpaid'
);

CREATE TABLE bill_items (
    bill_item_id BIGSERIAL PRIMARY KEY,
    bill_id BIGINT REFERENCES bills(bill_id) ON DELETE CASCADE,
    description TEXT,
    amount NUMERIC,
    quantity INTEGER DEFAULT 1,
    item_type TEXT
);

CREATE TABLE payments (
    payment_id BIGSERIAL PRIMARY KEY,
    bill_id BIGINT REFERENCES bills(bill_id) ON DELETE CASCADE,
    payment_date DATE DEFAULT CURRENT_DATE,
    amount NUMERIC,
    method TEXT,
    reference TEXT
);

CREATE TABLE ward_requisitions (
    requisition_id BIGSERIAL PRIMARY KEY,
    ward_number BIGINT REFERENCES wards(ward_number) ON DELETE SET NULL,
    requisitioned_by TEXT REFERENCES staff(staff_number) ON DELETE SET NULL,
    signed_by TEXT REFERENCES staff(staff_number) ON DELETE SET NULL,
    requisition_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'Pending'
);

CREATE TABLE requisition_items (
    requisition_item_id BIGSERIAL PRIMARY KEY,
    requisition_id BIGINT REFERENCES ward_requisitions(requisition_id) ON DELETE CASCADE,
    drug_number TEXT REFERENCES pharmaceutical_supplies(drug_number) ON DELETE SET NULL,
    supply_number TEXT REFERENCES surgical_nonsurgical_supplies(supply_number) ON DELETE SET NULL,
    quantity INTEGER DEFAULT 0,
    cost_per_unit NUMERIC
);

CREATE INDEX idx_patient_lastname ON patients(last_name);
CREATE INDEX idx_staff_lastname ON staff(last_name);
CREATE INDEX idx_ward_name ON wards(ward_name);
CREATE INDEX idx_waiting_ward ON waiting_list(ward_number);
CREATE INDEX idx_inpatient_patient ON in_patients(patient_number);
CREATE INDEX idx_bill_patient ON bills(patient_number);

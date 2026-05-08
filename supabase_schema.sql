-- Wellmeadows Hospital fresh Supabase schema
-- Run this in the Supabase SQL editor or psql against your new Supabase database.

CREATE TABLE patients (
    patient_number TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    address TEXT,
    telephone TEXT,
    date_of_birth DATE,
    sex TEXT,
    marital_status TEXT,
    date_registered DATE DEFAULT CURRENT_DATE,
    referring_doctor TEXT
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
    ward_number INTEGER PRIMARY KEY,
    ward_name TEXT NOT NULL,
    location TEXT,
    total_beds INTEGER DEFAULT 0,
    charge_nurse_id TEXT REFERENCES staff(staff_number)
);

CREATE TABLE beds (
    bed_number INTEGER PRIMARY KEY,
    ward_number INTEGER REFERENCES wards(ward_number),
    bed_status TEXT DEFAULT 'Available'
);

CREATE TABLE waiting_list (
    waiting_id BIGSERIAL PRIMARY KEY,
    patient_number TEXT REFERENCES patients(patient_number),
    ward_number INTEGER REFERENCES wards(ward_number),
    priority_level INTEGER DEFAULT 1,
    date_placed DATE DEFAULT CURRENT_DATE
);

CREATE TABLE in_patients (
    admission_id BIGSERIAL PRIMARY KEY,
    patient_number TEXT REFERENCES patients(patient_number),
    ward_number INTEGER REFERENCES wards(ward_number),
    bed_number INTEGER REFERENCES beds(bed_number),
    date_placed DATE DEFAULT CURRENT_DATE,
    expected_duration INTEGER,
    admission_reason TEXT,
    actual_leave_date DATE
);

CREATE TABLE pharmaceutical_supplies (
    drug_number TEXT PRIMARY KEY,
    drug_name TEXT NOT NULL
);

CREATE TABLE patient_medications (
    medication_id BIGSERIAL PRIMARY KEY,
    patient_number TEXT REFERENCES patients(patient_number),
    drug_number TEXT REFERENCES pharmaceutical_supplies(drug_number),
    units_per_day INTEGER,
    method_of_admin TEXT,
    start_date DATE,
    finish_date DATE
);

CREATE TABLE appointments (
    appointment_number TEXT PRIMARY KEY,
    patient_number TEXT REFERENCES patients(patient_number),
    consultant_id TEXT REFERENCES staff(staff_number),
    appointment_date DATE,
    appointment_time TIME,
    examination_room TEXT,
    appointment_status TEXT DEFAULT 'Scheduled'
);

CREATE TABLE staff_allocations (
    allocation_id BIGSERIAL PRIMARY KEY,
    staff_number TEXT REFERENCES staff(staff_number),
    ward_number INTEGER REFERENCES wards(ward_number),
    shift_type TEXT,
    allocation_date DATE,
    week_starting DATE
);

CREATE TABLE qualifications (
    qualification_id BIGSERIAL PRIMARY KEY,
    staff_number TEXT REFERENCES staff(staff_number),
    qualification_type TEXT,
    qualification_date DATE,
    institution TEXT
);

CREATE TABLE work_experience (
    experience_id BIGSERIAL PRIMARY KEY,
    staff_number TEXT REFERENCES staff(staff_number),
    position TEXT,
    organization TEXT,
    start_date DATE,
    finish_date DATE
);

-- Optional indexes for common queries
CREATE INDEX idx_patients_lastname ON patients(last_name);
CREATE INDEX idx_beds_ward_status ON beds(ward_number, bed_status);
CREATE INDEX idx_waiting_list_ward ON waiting_list(ward_number);
CREATE INDEX idx_in_patients_current ON in_patients(patient_number) WHERE actual_leave_date IS NULL;

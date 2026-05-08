import { supabase } from './supabase.js';
import { formatDate, createId } from './supabase.js';

const app = document.getElementById('app');
const navLinks = Array.from(document.querySelectorAll('nav a'));

window.addEventListener('hashchange', renderRoute);
window.addEventListener('DOMContentLoaded', renderRoute);

function setActiveNav(route) {
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (route.startsWith('staff') && href === '#staff') {
      link.classList.add('active');
    } else {
      link.classList.toggle('active', href === `#${route}`);
    }
  });
}

function page(title, content, footer = '') {
  return `
    <section class="card">
      <div class="page-top">
        <h2>${title}</h2>
        ${footer}
      </div>
      ${content}
    </section>
  `;
}

function renderError(message) {
  return `<div class="message error">${message}</div>`;
}

function renderSuccess(message) {
  return `<div class="message success">${message}</div>`;
}

async function renderRoute() {
  const hash = location.hash.slice(1) || 'home';
  const [route, param] = hash.split('/');
  setActiveNav(route || 'home');

  switch (route) {
    case 'home': return await renderHome();
    case 'patients': return await renderPatients();
    case 'patient': return await renderPatientDetail(param);
    case 'register': return await renderRegister();
    case 'appointments': return await renderAppointments(param);
    case 'medications': return await renderMedications();
    case 'wards': return await renderWards();
    case 'staff': return param ? await renderStaffDetail(param) : await renderStaff();
    case 'schedule': return await renderSchedule();
    case 'dashboard': return await renderDashboard();
    default: return renderNotFound();
  }
}

async function fetchSummary() {
  const summary = {};
  const queries = [
    { key: 'total_patients', table: 'patients' },
    { key: 'in_patients', table: 'in_patients' },
    { key: 'appointments', table: 'appointments' },
    { key: 'staff', table: 'staff' },
    { key: 'medications', table: 'patient_medications' },
    { key: 'available_beds', table: 'beds', filter: row => row.bed_status === 'Available' }
  ];

  const requests = queries.map(async (query) => {
    let result;
    if (query.table === 'beds') {
      const { data, error } = await supabase.from(query.table).select('bed_status');
      if (error) throw error;
      summary[query.key] = data.filter(query.filter).length;
    } else {
      const { count, error } = await supabase.from(query.table).select('*', { count: 'exact', head: true });
      if (error) throw error;
      summary[query.key] = count || 0;
    }
  });

  await Promise.all(requests);
  return summary;
}

function renderNotFound() {
  app.innerHTML = page('Page not found', '<p>The requested view does not exist.</p>');
}

async function renderHome() {
  const summary = await fetchSummary().catch(() => null);
  const summaryHtml = summary ? `
    <div class="table-responsive">
      <table>
        <tbody>
          <tr><td>Total patients</td><td>${summary.total_patients}</td></tr>
          <tr><td>Current admissions</td><td>${summary.in_patients}</td></tr>
          <tr><td>Upcoming appointments</td><td>${summary.appointments}</td></tr>
          <tr><td>Available beds</td><td>${summary.available_beds}</td></tr>
          <tr><td>Staff count</td><td>${summary.staff}</td></tr>
          <tr><td>Active medications</td><td>${summary.medications}</td></tr>
        </tbody>
      </table>
    </div>
  ` : '<p>Unable to load dashboard summary.</p>';

  app.innerHTML = page(
    'Patient Search',
    `
      <p>Search patients by patient number and view records directly from Supabase.</p>
      <form id="searchForm">
        <label for="searchPatientNumber">Patient Number</label>
        <input id="searchPatientNumber" type="text" placeholder="e.g. PAT001" required>
        <button type="submit">Search</button>
      </form>
      <div id="searchResult"></div>
      <div class="footer-note">Use the navigation menu to browse wards, appointments, medications, staff, and dashboard data.</div>
    `,
    `<a class="button-link" href="#register">Register New Patient</a>`
  );

  document.getElementById('searchForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const patientNumber = document.getElementById('searchPatientNumber').value.trim();
    if (!patientNumber) return;
    const result = await fetchPatient(patientNumber);
    const container = document.getElementById('searchResult');
    if (result.error) {
      container.innerHTML = renderError(result.message);
      return;
    }
    container.innerHTML = `
      <div class="card">
        <h3>Patient Details</h3>
        <p><strong>Patient Number:</strong> ${result.patient.patient_number}</p>
        <p><strong>Name:</strong> ${result.patient.first_name} ${result.patient.last_name}</p>
        <p><strong>Address:</strong> ${result.patient.address || '-'}</p>
        <p><strong>Telephone:</strong> ${result.patient.telephone || '-'}</p>
        <p><strong>DOB:</strong> ${formatDate(result.patient.date_of_birth)}</p>
        <p><strong>Sex:</strong> ${result.patient.sex || '-'}</p>
        <p><strong>Marital status:</strong> ${result.patient.marital_status || '-'}</p>
        <p><strong>Referring doctor:</strong> ${result.patient.referring_doctor || '-'}</p>
        <a class="button-link" href="#patient/${result.patient.patient_number}">View full record</a>
      </div>
    `;
  });
}

async function fetchPatient(patientNumber) {
  const { data, error } = await supabase
    .from('patients')
    .select('patient_number,first_name,last_name,address,telephone,date_of_birth,sex,marital_status,date_registered,referring_doctor')
    .eq('patient_number', patientNumber)
    .single();

  if (error) {
    return { error: true, message: error.message };
  }
  return { error: false, patient: data };
}

async function renderPatients() {
  const patients = await supabase.from('patients').select('patient_number,first_name,last_name,telephone,date_of_birth,sex').order('last_name');
  if (patients.error) {
    app.innerHTML = page('Patients', renderError(patients.error.message));
    return;
  }

  const rows = patients.data.map(patient => `
    <tr>
      <td>${patient.patient_number}</td>
      <td><a href="#patient/${patient.patient_number}">${patient.first_name} ${patient.last_name}</a></td>
      <td>${patient.telephone || '-'}</td>
      <td>${formatDate(patient.date_of_birth)}</td>
      <td>${patient.sex || '-'}</td>
    </tr>
  `).join('');

  app.innerHTML = page('Patients', `
    <div class="table-responsive">
      <table>
        <thead>
          <tr><th>Patient #</th><th>Name</th><th>Telephone</th><th>DOB</th><th>Sex</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="footer-note">Click a patient record to view details, admit/discharge, or manage treatment.</div>
  `, '<a class="button-link" href="#register">Register New Patient</a>');
}

async function renderPatientDetail(patientNumber) {
  if (!patientNumber) {
    app.innerHTML = page('Patient Detail', renderError('Patient number is required in the URL.')); return;
  }

  const [{ data: patient, error: patientError }, { data: admission, error: admissionError }, { data: wards, error: wardsError }] = await Promise.all([
    supabase.from('patients').select('*').eq('patient_number', patientNumber).single(),
    supabase.from('in_patients').select('ward_number,bed_number,date_placed').eq('patient_number', patientNumber).is('actual_leave_date', null).single(),
    supabase.from('wards').select('ward_number,ward_name').order('ward_name')
  ]);

  if (patientError) {
    app.innerHTML = page('Patient Detail', renderError(patientError.message)); return;
  }
  if (admissionError && admissionError.code !== 'PGRST116') {
    app.innerHTML = page('Patient Detail', renderError(admissionError.message)); return;
  }
  if (wardsError) {
    app.innerHTML = page('Patient Detail', renderError(wardsError.message)); return;
  }

  const statusHtml = admission ? `
    <section class="card">
      <h3>Current Admission</h3>
      <p><strong>Ward:</strong> ${admission.ward_number}</p>
      <p><strong>Bed:</strong> ${admission.bed_number || '-'}</p>
      <p><strong>Admitted:</strong> ${formatDate(admission.date_placed)}</p>
      <form id="dischargeForm">
        <label>Actual leave date</label>
        <input type="date" name="actual_leave_date" required>
        <button type="submit">Discharge Patient</button>
      </form>
      <div id="dischargeMessage"></div>
    </section>
  ` : `
    <section class="card">
      <h3>Admit Patient</h3>
      <form id="admitForm">
        <label>Ward</label>
        <select name="ward_number" required>
          ${wards.data.map(ward => `<option value="${ward.ward_number}">${ward.ward_name}</option>`).join('')}
        </select>
        <label>Expected duration (days)</label>
        <input name="expected_duration" type="number" min="1" required>
        <label>Admission reason</label>
        <textarea name="admission_reason" rows="3" required></textarea>
        <button type="submit">Admit Patient</button>
      </form>
      <div id="admitMessage"></div>
    </section>
  `;

  app.innerHTML = page('Patient Detail', `
    <div class="card">
      <h3>General Information</h3>
      <p><strong>Patient Number:</strong> ${patient.patient_number}</p>
      <p><strong>Name:</strong> ${patient.first_name} ${patient.last_name}</p>
      <p><strong>Address:</strong> ${patient.address || '-'}</p>
      <p><strong>Telephone:</strong> ${patient.telephone || '-'}</p>
      <p><strong>DOB:</strong> ${formatDate(patient.date_of_birth)}</p>
      <p><strong>Sex:</strong> ${patient.sex || '-'}</p>
      <p><strong>Marital status:</strong> ${patient.marital_status || '-'}</p>
      <p><strong>Referring doctor:</strong> ${patient.referring_doctor || '-'}</p>
    </div>
    ${statusHtml}
  `, `<a class="button-link" href="#patients">Back to patients</a>`);

  if (!admission) {
    document.getElementById('admitForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.target;
      const values = Object.fromEntries(new FormData(form).entries());
      const { error } = await supabase.from('in_patients').insert([{ 
        patient_number: patient.patient_number,
        ward_number: Number(values.ward_number),
        bed_number: null,
        expected_duration: Number(values.expected_duration),
        admission_reason: values.admission_reason,
        actual_leave_date: null
      }]);
      const message = document.getElementById('admitMessage');
      if (error) {
        message.innerHTML = renderError(error.message);
      } else {
        message.innerHTML = renderSuccess('Patient admitted successfully. Refreshing page...');
        setTimeout(() => location.reload(), 1200);
      }
    });
  } else {
    document.getElementById('dischargeForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.target).entries());
      const { error } = await supabase.from('in_patients').update({ actual_leave_date: values.actual_leave_date }).eq('patient_number', patient.patient_number).is('actual_leave_date', null);
      const message = document.getElementById('dischargeMessage');
      if (error) {
        message.innerHTML = renderError(error.message);
      } else {
        message.innerHTML = renderSuccess('Patient discharged successfully. Refreshing page...');
        setTimeout(() => location.reload(), 1200);
      }
    });
  }
}

async function renderRegister() {
  app.innerHTML = page('Register Patient', `
    <form id="registerForm">
      <label>First name</label>
      <input name="first_name" required>
      <label>Last name</label>
      <input name="last_name" required>
      <label>Address</label>
      <textarea name="address" rows="3"></textarea>
      <label>Telephone</label>
      <input name="telephone" type="text">
      <label>Date of birth</label>
      <input name="date_of_birth" type="date">
      <label>Sex</label>
      <select name="sex"><option value="">Choose</option><option value="M">Male</option><option value="F">Female</option></select>
      <label>Marital status</label>
      <input name="marital_status" type="text">
      <label>Referring doctor</label>
      <input name="referring_doctor" type="text">
      <button type="submit">Register Patient</button>
    </form>
    <div id="registerMessage"></div>
  `, '<a class="button-link" href="#patients">Back to patients</a>');

  document.getElementById('registerForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.target).entries());
    const patient_number = createId('PAT');
    const { error } = await supabase.from('patients').insert([{
      patient_number,
      ...values
    }]);
    const message = document.getElementById('registerMessage');
    if (error) {
      message.innerHTML = renderError(error.message);
      return;
    }
    message.innerHTML = renderSuccess(`Patient ${patient_number} created successfully.`);
    setTimeout(() => location.hash = `#patient/${patient_number}`, 900);
  });
}

async function renderAppointments(param) {
  if (param === 'book') {
    return await renderBookAppointment();
  }

  const [appointmentsRes, patientsRes, staffRes] = await Promise.all([
    supabase.from('appointments').select('*').order('appointment_date', { ascending: true }),
    supabase.from('patients').select('patient_number,first_name,last_name'),
    supabase.from('staff').select('staff_number,first_name,last_name')
  ]);

  if (appointmentsRes.error || patientsRes.error || staffRes.error) {
    app.innerHTML = page('Appointments', renderError((appointmentsRes.error || patientsRes.error || staffRes.error).message));
    return;
  }

  const patientsById = Object.fromEntries(patientsRes.data.map(p => [p.patient_number, `${p.first_name} ${p.last_name}`]));
  const staffById = Object.fromEntries(staffRes.data.map(s => [s.staff_number, `${s.first_name} ${s.last_name}`]));

  const rows = appointmentsRes.data.map(a => `
    <tr>
      <td>${a.appointment_number}</td>
      <td>${patientsById[a.patient_number] || a.patient_number}</td>
        <td>${staffById[a.staff_number] || '-'}</td>
    </tr>
  `).join('');

  app.innerHTML = page('Appointments', `
    <div class="table-responsive">
      <table>
        <thead><tr><th>#</th><th>Patient</th><th>Consultant</th><th>Date</th><th>Time</th><th>Room</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="footer-note">Book a new appointment or review scheduled visits from Supabase.</div>
  `, '<a class="button-link" href="#appointments/book">Book Appointment</a>');
}

async function renderBookAppointment() {
  const [patientsRes, staffRes] = await Promise.all([
    supabase.from('patients').select('patient_number,first_name,last_name').order('last_name'),
    supabase.from('staff').select('staff_number,first_name,last_name').order('last_name')
  ]);
  if (patientsRes.error || staffRes.error) {
    app.innerHTML = page('Book Appointment', renderError((patientsRes.error || staffRes.error).message));
    return;
  }

  app.innerHTML = page('Book Appointment', `
    <form id="bookAppointmentForm">
      <label>Patient</label>
      <select name="patient_number" required>
        ${patientsRes.data.map(p => `<option value="${p.patient_number}">${p.first_name} ${p.last_name}</option>`).join('')}
      </select>
      <label>Consultant</label>
      <select name="staff_number" required>
        ${staffRes.data.map(s => `<option value="${s.staff_number}">${s.first_name} ${s.last_name}</option>`).join('')}
      </select>
      <label>Date</label>
      <input name="appointment_date" type="date" required>
      <label>Time</label>
      <input name="appointment_time" type="time" required>
      <label>Examination room</label>
      <input name="examination_room" type="text" required>
      <button type="submit">Book Appointment</button>
    </form>
    <div id="appointmentMessage"></div>
  `, '<a class="button-link" href="#appointments">Back to appointments</a>');

  document.getElementById('bookAppointmentForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.target).entries());
    const appointment_number = createId('APP');
    const { error } = await supabase.from('appointments').insert([{
      appointment_number,
      patient_number: values.patient_number,
      staff_number: values.staff_number,
      appointment_date: values.appointment_date,
      appointment_time: values.appointment_time,
      examination_room: values.examination_room,
      appointment_status: 'Scheduled'
    }]);
    const message = document.getElementById('appointmentMessage');
    if (error) {
      message.innerHTML = renderError(error.message);
    } else {
      message.innerHTML = renderSuccess(`Appointment ${appointment_number} created.`);
      setTimeout(() => location.hash = '#appointments', 900);
    }
  });
}

async function renderMedications() {
  const medsRes = await supabase.from('patient_medications').select('patient_medication_id,patient_number,drug_number,units_per_day,method_of_admin,start_date,finish_date');
  if (medsRes.error) { app.innerHTML = page('Medications', renderError(medsRes.error.message)); return; }

  const patientIds = [...new Set(medsRes.data.map(item => item.patient_number))];
  const drugIds = [...new Set(medsRes.data.map(item => item.drug_number))];

  const [patientsRes, drugsRes] = await Promise.all([
    supabase.from('patients').select('patient_number,first_name,last_name').in('patient_number', patientIds),
    supabase.from('pharmaceutical_supplies').select('drug_number,drug_name').in('drug_number', drugIds)
  ]);

  const patientsMap = Object.fromEntries(patientsRes.data.map(p => [p.patient_number, `${p.first_name} ${p.last_name}`]));
  const drugsMap = Object.fromEntries(drugsRes.data.map(d => [d.drug_number, d.drug_name]));

  const rows = medsRes.data.map(item => `
    <tr>
      <td>${patientsMap[item.patient_number] || item.patient_number}</td>
      <td>${drugsMap[item.drug_number] || item.drug_number}</td>
      <td>${item.units_per_day || '-'}</td>
      <td>${item.method_of_admin || '-'}</td>
      <td>${formatDate(item.start_date)}</td>
      <td>${formatDate(item.finish_date)}</td>
    </tr>
  `).join('');

  app.innerHTML = page('Medications', `
    <div class="table-responsive">
      <table>
        <thead><tr><th>Patient</th><th>Drug</th><th>Units/day</th><th>Method</th><th>Start</th><th>Finish</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `);
}

async function renderWards() {
  const [wardsRes, bedsRes, waitingRes] = await Promise.all([
    supabase.from('wards').select('*').order('ward_name'),
    supabase.from('beds').select('ward_number,bed_status'),
    supabase.from('waiting_list').select('ward_number')
  ]);
  if (wardsRes.error || bedsRes.error || waitingRes.error) {
    app.innerHTML = page('Wards', renderError((wardsRes.error || bedsRes.error || waitingRes.error).message)); return;
  }

  const waitingCounts = waitingRes.data.reduce((acc, row) => {
    acc[row.ward_number] = (acc[row.ward_number] || 0) + 1;
    return acc;
  }, {});

  const rows = wardsRes.data.map(ward => {
    const wardBeds = bedsRes.data.filter(b => b.ward_number === ward.ward_number);
    const available = wardBeds.filter(b => b.bed_status === 'Available').length;
    return `
      <tr>
        <td>${ward.ward_number}</td>
        <td>${ward.ward_name}</td>
        <td>${ward.location || '-'}</td>
        <td>${ward.total_beds || 0}</td>
        <td>${available}</td>
        <td>${waitingCounts[ward.ward_number] || 0}</td>
        <td>${ward.charge_nurse_id || '-'}</td>
      </tr>
    `;
  }).join('');

  app.innerHTML = page('Wards', `
    <div class="table-responsive">
      <table>
        <thead><tr><th>Ward #</th><th>Name</th><th>Location</th><th>Total beds</th><th>Available</th><th>Waiting</th><th>Charge nurse</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `);
}

async function renderStaff() {
  const staffRes = await supabase.from('staff').select('*').order('last_name');
  if (staffRes.error) { app.innerHTML = page('Staff', renderError(staffRes.error.message)); return; }

  const rows = staffRes.data.map(staff => `
    <tr>
      <td>${staff.staff_number}</td>
      <td><a href="#staff/${staff.staff_number}">${staff.first_name} ${staff.last_name}</a></td>
      <td>${staff.position || '-'}</td>
      <td>${staff.sex || '-'}</td>
      <td>${staff.telephone || '-'}</td>
      <td>${staff.current_salary || '-'}</td>
      <td>${staff.contract_type || '-'}</td>
    </tr>
  `).join('');

  app.innerHTML = page('Staff', `
    <div class="table-responsive">
      <table>
        <thead><tr><th>Staff #</th><th>Name</th><th>Position</th><th>Sex</th><th>Telephone</th><th>Salary</th><th>Contract</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `);
}

async function renderStaffDetail(staffNumber) {
  const [staffRes, qualificationsRes, experienceRes] = await Promise.all([
    supabase.from('staff').select('*').eq('staff_number', staffNumber).single(),
    supabase.from('qualifications').select('qualification_type,qualification_date,institution').eq('staff_number', staffNumber),
    supabase.from('work_experience').select('position,organization,start_date,finish_date').eq('staff_number', staffNumber)
  ]);

  if (staffRes.error) { app.innerHTML = page('Staff Profile', renderError(staffRes.error.message)); return; }
  if (qualificationsRes.error || experienceRes.error) {
    app.innerHTML = page('Staff Profile', renderError((qualificationsRes.error || experienceRes.error).message)); return; }

  const qualificationsRows = qualificationsRes.data.length
    ? qualificationsRes.data.map(q => `
      <tr>
        <td>${q.qualification_type || '-'}</td>
        <td>${formatDate(q.qualification_date)}</td>
        <td>${q.institution || '-'}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="3">No qualifications recorded.</td></tr>';

  const experienceRows = experienceRes.data.length
    ? experienceRes.data.map(e => `
      <tr>
        <td>${e.position || '-'}</td>
        <td>${e.organization || '-'}</td>
        <td>${formatDate(e.start_date)}</td>
        <td>${e.finish_date ? formatDate(e.finish_date) : 'Present'}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="4">No work history available.</td></tr>';

  app.innerHTML = page('Staff Profile', `
    <div class="card">
      <h3>Staff Information</h3>
      <p><strong>Staff Number:</strong> ${staffRes.data.staff_number}</p>
      <p><strong>Name:</strong> ${staffRes.data.first_name} ${staffRes.data.last_name}</p>
      <p><strong>Address:</strong> ${staffRes.data.address || '-'}</p>
      <p><strong>Telephone:</strong> ${staffRes.data.telephone || '-'}</p>
      <p><strong>Date of birth:</strong> ${formatDate(staffRes.data.date_of_birth)}</p>
      <p><strong>Sex:</strong> ${staffRes.data.sex || '-'}</p>
      <p><strong>Position:</strong> ${staffRes.data.position || '-'}</p>
      <p><strong>Current salary:</strong> ${staffRes.data.current_salary != null ? `₱${staffRes.data.current_salary}` : '-'}</p>
      <p><strong>Salary scale:</strong> ${staffRes.data.salary_scale || '-'}</p>
    </div>

    <div class="card">
      <h3>Qualifications</h3>
      <div class="table-responsive">
        <table>
          <thead><tr><th>Type</th><th>Date</th><th>Institution</th></tr></thead>
          <tbody>${qualificationsRows}</tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <h3>Work Experience</h3>
      <div class="table-responsive">
        <table>
          <thead><tr><th>Position</th><th>Organization</th><th>Start Date</th><th>Finish Date</th></tr></thead>
          <tbody>${experienceRows}</tbody>
        </table>
      </div>
    </div>

    <a class="button-link" href="#staff">← Back to Staff List</a>
  `);
}

async function renderSchedule() {
  const [scheduleRes, staffRes, departmentsRes] = await Promise.all([
    supabase.from('staff_department_assignments').select('*').order('start_date', { ascending: false }),
    supabase.from('staff').select('staff_number,first_name,last_name'),
    supabase.from('departments').select('department_id,name')
  ]);

  if (scheduleRes.error || staffRes.error || departmentsRes.error) {
    const error = scheduleRes.error || staffRes.error || departmentsRes.error;
    const message = error.message.includes('Could not find the table')
      ? 'Schedule data is unavailable. Create the public.table staff_department_assignments in Supabase or run the schema SQL script.'
      : error.message;
    app.innerHTML = page('Schedule', renderError(message));
    return;
  }

  const staffMap = Object.fromEntries(staffRes.data.map(s => [s.staff_number, `${s.first_name} ${s.last_name}`]));
  const departmentMap = Object.fromEntries(departmentsRes.data.map(d => [d.department_id, d.name]));

  const rows = scheduleRes.data.map(row => `
    <tr>
      <td>${row.staff_number}</td>
      <td>${staffMap[row.staff_number] || row.staff_number}</td>
      <td>${departmentMap[row.department_id] || row.department_id || '-'}</td>
      <td>${row.is_head ? 'Head' : 'Member'}</td>
      <td>${formatDate(row.start_date)}</td>
      <td>${row.end_date ? formatDate(row.end_date) : 'Present'}</td>
    </tr>
  `).join('');

  app.innerHTML = page('Staff Schedule', `
    <div class="table-responsive">
      <table>
        <thead><tr><th>Staff #</th><th>Name</th><th>Department</th><th>Role</th><th>Start</th><th>End</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `);
}

async function renderDashboard() {
  const summary = await fetchSummary().catch(error => ({ error }));
  if (summary.error) {
    app.innerHTML = page('Dashboard', renderError(summary.error.message || 'Unable to load summary')); return;
  }

  app.innerHTML = page('Dashboard', `
    <div class="table-responsive">
      <table>
        <tbody>
          <tr><td>Total patients</td><td>${summary.total_patients}</td></tr>
          <tr><td>Current admissions</td><td>${summary.in_patients}</td></tr>
          <tr><td>Upcoming appointments</td><td>${summary.appointments}</td></tr>
          <tr><td>Available beds</td><td>${summary.available_beds}</td></tr>
          <tr><td>Staff count</td><td>${summary.staff}</td></tr>
          <tr><td>Active medications</td><td>${summary.medications}</td></tr>
        </tbody>
      </table>
    </div>
  `);
}

from flask import Flask, render_template, request, redirect, url_for
import psycopg2

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from io import BytesIO
from flask import send_file
 



app = Flask(__name__)

# PostgreSQL settings
DB_CONFIG = {
    'dbname': 'wellmeadows',
    'user': 'postgres',
    'password': 'eartheurope',
    'host': 'localhost',
    'port': '5432'
}

# 🔹 Home page with search form
@app.route('/')
def home():
    return render_template('index.html')

# 🔹 POST handler for patient lookup (from search form)
@app.route('/patient', methods=['POST'])
def get_patient():
    patient_number = request.form['patient_number']
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        cur.execute("""
            SELECT patient_number, first_name, last_name, address, telephone,
                   date_of_birth, sex, marital_status, date_registered, referring_doctor
            FROM patients
            WHERE patient_number = %s
        """, (patient_number,))
        row = cur.fetchone()
        cur.close()
        conn.close()

        if row:
            patient = {
                'patient_number': row[0],
                'first_name': row[1],
                'last_name': row[2],
                'address': row[3],
                'telephone': row[4],
                'date_of_birth': row[5],
                'sex': row[6],
                'marital_status': row[7],
                'date_registered': row[8],
                'referring_doctor': row[9]
            }
            return render_template('index.html', patient=patient)
        else:
            return render_template('index.html', error='❌ Patient not found.')

    except Exception as e:
        return render_template('index.html', error=f'❌ Database error: {str(e)}')

# 🔹 Full patient list view
@app.route('/patients')
def patients():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        cur.execute("""
            SELECT 
                p.patient_number, p.first_name, p.last_name, p.telephone, 
                p.date_of_birth, p.sex,
                COALESCE(ip.ward_number, wl.ward_number) AS ward_number,
                w.ward_name,
                ip.bed_number,
                CASE 
                    WHEN ip.patient_number IS NOT NULL AND ip.actual_leave_date IS NULL THEN 'admitted'
                    WHEN wl.patient_number IS NOT NULL THEN 'waiting'
                    ELSE 'not_admitted'
                END AS status
            FROM patients p
            LEFT JOIN in_patients ip ON p.patient_number = ip.patient_number AND ip.actual_leave_date IS NULL
            LEFT JOIN waiting_list wl ON p.patient_number = wl.patient_number
            LEFT JOIN wards w ON w.ward_number = COALESCE(ip.ward_number, wl.ward_number)
            ORDER BY p.last_name, p.first_name;
        """)
        result = cur.fetchall()
        cur.close()
        conn.close()

        patients = [
            {
                'patient_number': r[0],
                'first_name': r[1],
                'last_name': r[2],
                'telephone': r[3],
                'date_of_birth': r[4],
                'sex': r[5],
                'ward_number': r[6],
                'ward_name': r[7],
                'bed_number': r[8],
                'status': r[9]
            }
            for r in result
        ]

        return render_template('patients.html', patients=patients)
    except Exception as e:
        return render_template('patients.html', patients=[], error=str(e))


@app.route('/export/patients/pdf')
def export_patients_pdf():
    try:
        # Fetch data
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        cur.execute("SELECT patient_number, first_name, last_name, date_of_birth, telephone FROM patients")
        patients = cur.fetchall()
        cur.close()
        conn.close()

        # Create PDF in memory
        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter

        pdf.setFont("Helvetica-Bold", 16)
        pdf.drawString(200, height - 40, "Patient Report")

        pdf.setFont("Helvetica", 10)
        y = height - 70
        pdf.drawString(50, y, "Patient Number | First Name | Last Name | Date of Birth | Telephone")
        y -= 15

        for row in patients:
            row_str = f"{row[0]:<15} {row[1]:<12} {row[2]:<12} {row[3]} {row[4]}"
            pdf.drawString(50, y, row_str)
            y -= 15
            if y < 40:
                pdf.showPage()
                y = height - 40

        pdf.save()
        buffer.seek(0)

        return send_file(
            buffer,
            as_attachment=True,
            download_name="patients.pdf",
            mimetype='application/pdf'
        )

    except Exception as e:
        return f"<h2>PDF export failed: {str(e)}</h2>"


# 🔹 Placeholder routes
@app.route('/appointments')
def appointments():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        cur.execute("""
            SELECT a.appointment_number, 
                   p.first_name || ' ' || p.last_name AS patient_name,
                   s.first_name || ' ' || s.last_name AS consultant_name,
                   a.appointment_date,
                   a.appointment_time,
                   a.examination_room,
                   a.appointment_status
            FROM appointments a
            JOIN patients p ON a.patient_number = p.patient_number
            JOIN staff s ON a.consultant_id = s.staff_number
            ORDER BY a.appointment_date, a.appointment_time;
        """)
        appointments = cur.fetchall()
        cur.close()
        conn.close()
        return render_template('appointments.html', appointments=appointments)
    except Exception as e:
        return render_template('appointments.html', appointments=[], error=str(e))


@app.route('/wards')
def wards():
    message = request.args.get('message')  # ✅ for displaying success/failure

    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()

        cur.execute("""
            SELECT
                w.ward_number,
                w.ward_name,
                w.location,
                w.total_beds,
                COUNT(b.bed_status) FILTER (WHERE b.bed_status = 'Available') AS available_beds,
                (
                  SELECT COUNT(*) 
                  FROM waiting_list wl 
                  WHERE wl.ward_number = w.ward_number
                ) AS waiting_count,
                CONCAT(s.first_name, ' ', s.last_name) AS charge_nurse
            FROM wards w
            LEFT JOIN beds b ON w.ward_number = b.ward_number
            LEFT JOIN staff s ON w.charge_nurse_id = s.staff_number
            GROUP BY w.ward_number, w.ward_name, w.location, w.total_beds, s.first_name, s.last_name
            ORDER BY w.ward_number
        """)

        ward_data = cur.fetchall()
        cur.close()
        conn.close()

        wards = [
            {
                'ward_number': row[0],
                'ward_name': row[1],
                'location': row[2],
                'total_beds': row[3],
                'available_beds': row[4],
                'waiting_count': row[5],
                'charge_nurse': row[6]
            }
            for row in ward_data
        ]

        return render_template('wards.html', wards=wards, message=message)

    except Exception as e:
        return render_template('wards.html', wards=[], message=f"Error loading wards: {str(e)}")


@app.route('/medications')
def medications():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        cur.execute("""
            SELECT p.first_name || ' ' || p.last_name AS patient_name,
                   d.drug_name,
                   pm.units_per_day,
                   pm.method_of_admin,
                   pm.start_date,
                   pm.finish_date,
                   CASE 
                       WHEN pm.finish_date IS NULL OR pm.finish_date >= CURRENT_DATE THEN 'Active'
                       ELSE 'Completed'
                   END AS status
            FROM patient_medications pm
            JOIN patients p ON pm.patient_number = p.patient_number
            JOIN pharmaceutical_supplies d ON pm.drug_number = d.drug_number
            ORDER BY p.last_name, p.first_name;
        """)
        meds = cur.fetchall()
        cur.close()
        conn.close()
        return render_template('medications.html', meds=meds)
    except Exception as e:
        return render_template('medications.html', meds=[], error=str(e))
@app.route('/staff')
def staff():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        cur.execute("""
            SELECT staff_number, first_name, last_name, position, sex, telephone, current_salary, contract_type
            FROM staff
            ORDER BY last_name, first_name;
        """)
        staff = cur.fetchall()
        cur.close()
        conn.close()
        return render_template('staff.html', staff=staff)
    except Exception as e:
        return render_template('staff.html', staff=[], error=str(e))
@app.route('/dashboard')
def dashboard():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()

        cur.execute("SELECT COUNT(*) FROM patients")
        total_patients = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM in_patients WHERE actual_leave_date IS NULL")
        in_patients = cur.fetchone()[0]

        cur.execute("SELECT COUNT(DISTINCT patient_number) FROM out_patients")
        out_patients = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM beds WHERE bed_status = 'Available'")
        available_beds = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM staff")
        staff = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM patient_medications WHERE finish_date IS NULL OR finish_date >= CURRENT_DATE")
        medications = cur.fetchone()[0]

        cur.close()
        conn.close()

        stats = {
            'total_patients': total_patients,
            'in_patients': in_patients,
            'out_patients': out_patients,
            'available_beds': available_beds,
            'staff': staff,
            'medications': medications
        }

        return render_template('dashboard.html', stats=stats)

    except Exception as e:
        return f"<h2>Error loading dashboard: {str(e)}</h2>"
@app.route('/patients/<patient_number>')
def patient_detail(patient_number):
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()

        # Get patient info
        cur.execute("SELECT * FROM patients WHERE patient_number = %s", (patient_number,))
        patient = cur.fetchone()

        if not patient:
            return "<h2>Patient not found.</h2>"

        patient_dict = {
            'patient_number': patient[0],
            'first_name': patient[1],
            'last_name': patient[2],
            'address': patient[3],
            'telephone': patient[4],
            'date_of_birth': patient[5],
            'sex': patient[6]
        }

        # Get current admission status
        cur.execute("""
            SELECT ward_number, bed_number, date_placed
            FROM in_patients
            WHERE patient_number = %s AND actual_leave_date IS NULL
        """, (patient_number,))
        admission = cur.fetchone()

        is_admitted = admission is not None

        # Get wards for admission dropdown
        cur.execute("""
            SELECT ward_number, ward_name,
                   (SELECT COUNT(*) FROM beds WHERE ward_number = w.ward_number AND bed_status = 'Available') AS available_beds
            FROM wards w
        """)
        wards = [{'ward_number': w[0], 'ward_name': w[1], 'available_beds': w[2]} for w in cur.fetchall()]

        cur.close()
        conn.close()

        return render_template(
            "patient_detail.html",
            patient=patient_dict,
            wards=wards,
            is_admitted=is_admitted,
            admission=admission  # optionally pass ward/bed info
        )

    except Exception as e:
        return f"<h2>Error: {str(e)}</h2>"
    
@app.route('/admit', methods=['POST'])
def admit_patient_route():
    data = request.form
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        cur.callproc("admit_patient", (
            data['patient_number'],
            int(data['ward_number']),
            int(data['expected_duration']),
            data['admission_reason']
        ))
        conn.commit()
        cur.close()
        conn.close()
        return redirect(f"/patients/{data['patient_number']}")
    except Exception as e:
        return f"<h2>Admit failed: {str(e)}</h2>"
@app.route('/discharge', methods=['POST'])
def discharge_patient_route():
    data = request.form
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        cur.callproc("discharge_patient", (
            data['patient_number'],
            data['actual_leave_date']
        ))
        conn.commit()
        cur.close()
        conn.close()
        return redirect(f"/patients/{data['patient_number']}")
    except Exception as e:
        return f"<h2>Discharge failed: {str(e)}</h2>"
@app.route('/appointments/book', methods=['GET'])
def show_appointment_form():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()

        cur.execute("SELECT patient_number, first_name, last_name FROM patients ORDER BY last_name")
        patients = cur.fetchall()

        cur.execute("""
            SELECT staff_number, first_name, last_name, position 
            FROM staff 
            WHERE position ILIKE '%consultant%' 
            ORDER BY last_name
        """)
        consultants = cur.fetchall()

        cur.close()
        conn.close()

        return render_template('book_appointment.html', patients=patients, consultants=consultants)
    except Exception as e:
        return f"<h2>Error loading form: {str(e)}</h2>"
@app.route('/appointments/book', methods=['POST'])
def book_appointment():
    try:
        data = request.form
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()

        # Generate appointment number (e.g., APP013)
        cur.execute("SELECT COUNT(*) FROM appointments")
        count = cur.fetchone()[0] + 1
        appointment_number = f"APP{count:03}"

        cur.execute("""
            INSERT INTO appointments (
                appointment_number, patient_number, consultant_id,
                appointment_date, appointment_time, examination_room
            ) VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            appointment_number,
            data['patient_number'],
            data['consultant_id'],
            data['appointment_date'],
            data['appointment_time'],
            data['examination_room']
        ))

        conn.commit()
        cur.close()
        conn.close()
        return redirect('/appointments')
    except Exception as e:
        return f"<h2>Failed to book appointment: {str(e)}</h2>"
@app.route('/patients/register', methods=['GET'])
def show_register_patient():
    return render_template('register_patient.html')
@app.route('/patients/register', methods=['POST'])
def register_patient():
    try:
        data = request.form
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()

        # Generate patient number (e.g., PAT013)
        cur.execute("SELECT COUNT(*) FROM patients")
        count = cur.fetchone()[0] + 1
        patient_number = f"PAT{count:03}"

        cur.execute("""
            INSERT INTO patients (
                patient_number, first_name, last_name, address, telephone,
                date_of_birth, sex, marital_status, referring_doctor
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            patient_number,
            data['first_name'],
            data['last_name'],
            data['address'],
            data['telephone'],
            data['date_of_birth'],
            data['sex'],
            data['marital_status'],
            data['referring_doctor']
        ))

        conn.commit()
        cur.close()
        conn.close()
        return redirect('/patients')

    except Exception as e:
        return f"<h2>Registration failed: {str(e)}</h2>"
@app.route('/wards/<int:ward_number>/process_waiting', methods=['POST'])
def process_waiting(ward_number):
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()

        # Get top patient BEFORE processing
        cur.execute("""
            SELECT patient_number
            FROM waiting_list
            WHERE ward_number = %s
            ORDER BY priority_level ASC, date_placed ASC
            LIMIT 1;
        """, (ward_number,))
        row = cur.fetchone()
        patient_number = row[0] if row else None

        cur.execute("CALL process_waiting_list(%s);", (ward_number,))
        conn.commit()
        cur.close()
        conn.close()

        if patient_number:
            return redirect(url_for('wards', message=f"✅ Patient {patient_number} was admitted to Ward {ward_number}."))
        else:
            return redirect(url_for('wards', message=f"⚠️ No patients were on the waiting list for Ward {ward_number}."))

    except Exception as e:
        return redirect(url_for('wards', message=f"❌ Error processing waiting list: {str(e)}"))

@app.route('/wards/<int:ward_number>/schedule', methods=['POST'])
def create_schedule(ward_number):
    week_starting = request.form['week_starting']

    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        cur.execute("CALL create_staff_schedule(%s, %s);", (ward_number, week_starting))
        conn.commit()
        cur.close()
        conn.close()

        return redirect(url_for('wards', message=f"✅ Schedule created for Ward {ward_number} (Week of {week_starting})."))
    except Exception as e:
        return redirect(url_for('wards', message=f"❌ Failed to create schedule: {str(e)}"))
@app.route('/staff/schedule')
def staff_schedule():
    week_starting = request.args.get('week_starting')

    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()

        if week_starting:
            cur.execute("""
                SELECT s.staff_number, s.first_name || ' ' || s.last_name AS name,
                       w.ward_name, a.shift_type, a.allocation_date, a.week_starting
                FROM staff_allocations a
                JOIN staff s ON a.staff_number = s.staff_number
                LEFT JOIN wards w ON a.ward_number = w.ward_number
                WHERE a.week_starting = %s
                ORDER BY s.last_name, a.allocation_date
            """, (week_starting,))
        else:
            cur.execute("""
                SELECT s.staff_number, s.first_name || ' ' || s.last_name AS name,
                       w.ward_name, a.shift_type, a.allocation_date, a.week_starting
                FROM staff_allocations a
                JOIN staff s ON a.staff_number = s.staff_number
                LEFT JOIN wards w ON a.ward_number = w.ward_number
                ORDER BY a.week_starting DESC, s.last_name
                LIMIT 100
            """)

        results = cur.fetchall()
        cur.close()
        conn.close()

        return render_template("staff_schedule.html", schedule=results, week_starting=week_starting)

    except Exception as e:
        return render_template("staff_schedule.html", schedule=[], error=str(e))

@app.route('/staff/<staff_number>')
def staff_detail(staff_number):
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()

        # Get main staff info
        cur.execute("""
            SELECT staff_number, first_name, last_name, address, telephone,
                   date_of_birth, sex, position, current_salary, salary_scale
            FROM staff
            WHERE staff_number = %s
        """, (staff_number,))
        staff = cur.fetchone()

        # Get qualifications
        cur.execute("""
            SELECT qualification_type, qualification_date, institution
            FROM qualifications
            WHERE staff_number = %s
            ORDER BY qualification_date DESC
        """, (staff_number,))
        qualifications = cur.fetchall()

        # Get work experience
        cur.execute("""
            SELECT position, organization, start_date, finish_date
            FROM work_experience
            WHERE staff_number = %s
            ORDER BY start_date DESC
        """, (staff_number,))
        experience = cur.fetchall()

        cur.close()
        conn.close()

        return render_template('staff_detail.html', staff=staff, qualifications=qualifications, experience=experience)

    except Exception as e:
        return f"<h2>Error loading staff profile: {str(e)}</h2>"


if __name__ == '__main__':
    app.run(debug=True)
// manage_employees.js
const SUPABASE_URL = 'https://yqlyxzowfbowznpzapxf.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxbHl4em93ZmJvd3pucHphcHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMTc3NDEsImV4cCI6MjA3ODU5Mzc0MX0.ZhJAq0mt3LAamCZlBGux_fwhyQIlOab_0BFsaWubHko';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

window.onload = loadAllEmployees;

// 1. โหลดข้อมูลพนักงาน + แสดงสินทรัพย์ปัจจุบัน
async function loadAllEmployees() {
    const table = document.getElementById('employeeListBody');
    table.innerHTML = '<tr><td colspan="6" style="text-align:center">กำลังโหลดข้อมูล...</td></tr>';

    try {
        const { data, error } = await supabaseClient
            .from('employees')
            .select(`*, computers(computer_id, spec), printers(printer_id, model)`)
            .order('employee_id');

        if (error) throw error;

        table.innerHTML = '';
        data.forEach(e => {
            const com = e.computers.length > 0 
                ? `<span class="status-badge status-in-use">${e.computers[0].computer_id}</span>` 
                : '<span style="color:#ccc">-</span>';
            
            const prn = e.printers.length > 0 
                ? `<span class="status-badge status-in-use">${e.printers[0].printer_id}</span>`
                : '<span style="color:#ccc">-</span>';

            table.innerHTML += `
                <tr>
                    <td><b>${e.employee_id}</b></td>
                    <td>${e.name}</td>
                    <td>${e.department || '-'}</td>
                    <td>${com}</td>
                    <td>${prn}</td>
                    <td>
                        <button onclick="openModal('update', '${e.employee_id}')">แก้ไข</button>
                        <button onclick="deleteEmployee('${e.employee_id}', '${e.name}')" class="btn-delete">ลบ</button>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error(err);
        table.innerHTML = `<tr><td colspan="6" style="color:red">Error: ${err.message}</td></tr>`;
    }
}

// 2. เตรียม Dropdown เลือกของ (Logic: เอาของว่าง + ของตัวเอง)
async function populateAssets(currentOwnerId = null) {
    const comSel = document.getElementById('formComputer');
    const prnSel = document.getElementById('formPrinter');
    
    comSel.innerHTML = '<option>Loading...</option>';
    prnSel.innerHTML = '<option>Loading...</option>';

    // ดึงคอม/ปริ้นเตอร์ทั้งหมด
    const { data: computers } = await supabaseClient.from('computers').select('computer_id, user_id, spec, loan_borrower_name').order('computer_id');
    const { data: printers } = await supabaseClient.from('printers').select('printer_id, user_id, model').order('printer_id');

    // สร้างตัวเลือก Computer
    comSel.innerHTML = '<option value="">-- ไม่ระบุ / คืนเครื่อง --</option>';
    computers.forEach(c => {
        // เงื่อนไข: (ว่าง และ ไม่ได้ถูกยืมชั่วคราว) หรือ (เป็นเจ้าของเดิม)
        const isFree = (c.user_id === null && c.loan_borrower_name === null);
        const isMine = (c.user_id === currentOwnerId);

        if (isFree || isMine) {
            const selected = isMine ? 'selected' : '';
            if (isMine) document.getElementById('oldComputerId').value = c.computer_id; // จำเครื่องเดิม
            
            comSel.insertAdjacentHTML('beforeend', 
                `<option value="${c.computer_id}" ${selected}>${c.computer_id} (${c.spec || ''})</option>`
            );
        }
    });

    // สร้างตัวเลือก Printer
    prnSel.innerHTML = '<option value="">-- ไม่ระบุ / คืนเครื่อง --</option>';
    printers.forEach(p => {
        const isFree = (p.user_id === null);
        const isMine = (p.user_id === currentOwnerId);

        if (isFree || isMine) {
            const selected = isMine ? 'selected' : '';
            if (isMine) document.getElementById('oldPrinterId').value = p.printer_id; // จำเครื่องเดิม
            
            prnSel.insertAdjacentHTML('beforeend', 
                `<option value="${p.printer_id}" ${selected}>${p.printer_id} (${p.model || ''})</option>`
            );
        }
    });
}

// 3. เปิด Modal
window.openModal = async function(mode, id = null) {
    document.getElementById('employeeForm').reset();
    document.getElementById('formMode').value = mode;
    document.getElementById('oldComputerId').value = ""; // Reset ค่าจำ
    document.getElementById('oldPrinterId').value = "";

    if (mode === 'create') {
        document.getElementById('formEmployeeId').readOnly = false;
        await populateAssets(null);
    } else {
        document.getElementById('formEmployeeId').readOnly = true;
        document.getElementById('editEmployeeId').value = id;
        
        // ดึงข้อมูลเก่า
        const { data } = await supabaseClient.from('employees').select('*').eq('employee_id', id).single();
        if (data) {
            document.getElementById('formEmployeeId').value = data.employee_id;
            document.getElementById('formName').value = data.name;
            document.getElementById('formDepartment').value = data.department;
            document.getElementById('formPosition').value = data.position;
            document.getElementById('formEmail').value = data.email;
            document.getElementById('formDeskPhone').value = data.desk_phone;
            
            // โหลด Dropdown โดยส่ง ID ไปเพื่อติ๊กถูกของที่ถืออยู่
            await populateAssets(id);
        }
    }
    document.getElementById('modalBackdrop').style.display = 'block';
}

// 4. บันทึกข้อมูล (Logic สลับเครื่องอยู่ที่นี่)
async function handleEmployeeSubmit() {
    const mode = document.getElementById('formMode').value;
    const empId = mode === 'create' 
        ? document.getElementById('formEmployeeId').value 
        : document.getElementById('editEmployeeId').value;
    
    if(!empId) return alert('กรุณาระบุรหัสพนักงาน');

    // A. ข้อมูลพนักงาน
    const empData = {
        employee_id: empId,
        name: document.getElementById('formName').value,
        department: document.getElementById('formDepartment').value,
        position: document.getElementById('formPosition').value,
        email: document.getElementById('formEmail').value,
        desk_phone: document.getElementById('formDeskPhone').value
    };

    try {
        // 1. บันทึกตาราง Employee
        if (mode === 'create') {
            const { error } = await supabaseClient.from('employees').insert([empData]);
            if (error) throw error;
        } else {
            const { error } = await supabaseClient.from('employees').update(empData).eq('employee_id', empId);
            if (error) throw error;
        }

        // 2. จัดการ Asset (ตรวจสอบการเปลี่ยนแปลง)
        const newCom = document.getElementById('formComputer').value;
        const oldCom = document.getElementById('oldComputerId').value;
        const newPrn = document.getElementById('formPrinter').value;
        const oldPrn = document.getElementById('oldPrinterId').value;

        // -- Logic Computer Swap --
        if (newCom !== oldCom) {
            // ถ้ามีเครื่องเก่า -> ปลดออก (Set null)
            if (oldCom) await supabaseClient.from('computers').update({ user_id: null }).eq('computer_id', oldCom);
            // ถ้าเลือกเครื่องใหม่ -> ใส่ชื่อเรา (Set user_id)
            if (newCom) await supabaseClient.from('computers').update({ user_id: empId, loan_borrower_name: null }).eq('computer_id', newCom);
        }

        // -- Logic Printer Swap --
        if (newPrn !== oldPrn) {
            if (oldPrn) await supabaseClient.from('printers').update({ user_id: null }).eq('printer_id', oldPrn);
            if (newPrn) await supabaseClient.from('printers').update({ user_id: empId }).eq('printer_id', newPrn);
        }

        alert('บันทึกข้อมูลสำเร็จ!');
        closeModal();
        loadAllEmployees();

    } catch (err) {
        alert('เกิดข้อผิดพลาด: ' + err.message);
    }
}

// 5. ลบพนักงาน (ต้องคืนของก่อนลบ)
window.deleteEmployee = async function(id, name) {
    if (!confirm(`ยืนยันลบพนักงาน: ${name} ?\n(ทรัพย์สินจะถูกปลดออกและสถานะเป็น "ว่าง" อัตโนมัติ)`)) return;

    try {
        // 1. ปลดคอมทั้งหมดของคนนี้
        await supabaseClient.from('computers').update({ user_id: null }).eq('user_id', id);
        // 2. ปลดปริ้นเตอร์ทั้งหมด
        await supabaseClient.from('printers').update({ user_id: null }).eq('user_id', id);
        // 3. ลบคน
        const { error } = await supabaseClient.from('employees').delete().eq('employee_id', id);
        
        if (error) throw error;
        alert('ลบเรียบร้อย');
        loadAllEmployees();
    } catch (err) {
        alert('ลบไม่สำเร็จ: ' + err.message);
    }
}

window.closeModal = function() {
    document.getElementById('modalBackdrop').style.display = 'none';
}

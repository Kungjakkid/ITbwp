const SUPABASE_URL = 'https://yqlyxzowfbowznpzapxf.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxbHl4em93ZmJvd3pucHphcHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMTc3NDEsImV4cCI6MjA3ODU5Mzc0MX0.ZhJAq0mt3LAamCZlBGux_fwhyQIlOab_0BFsaWubHko';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

window.onload = loadAllEmployees;

// โหลดรายชื่อพนักงาน + แสดงว่าใครถือคอมเครื่องไหนอยู่
async function loadAllEmployees() {
    const table = document.getElementById('employeeListBody'); 
    table.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';
    
    // ดึงข้อมูลพนักงาน พร้อม join ตารางคอมและปริ้นเตอร์มาดูด้วย
    const { data } = await supabaseClient
        .from('employees')
        .select(`*, computers(computer_id), printers(printer_id)`)
        .order('employee_id');

    table.innerHTML = '';
    data.forEach(e => {
        // เช็คว่าถือของอะไรอยู่บ้าง
        const com = e.computers.length > 0 ? `<span class="status-badge status-in-use">${e.computers[0].computer_id}</span>` : '-';
        const prn = e.printers.length > 0 ? e.printers[0].printer_id : '-';

        table.innerHTML += `
            <tr>
                <td><b>${e.employee_id}</b></td>
                <td>${e.name}</td>
                <td>${e.department||'-'}</td>
                <td>${com}</td> <td>${e.position||'-'}</td>
                <td>
                    <button onclick="openEmployeeModal('update','${e.employee_id}')">แก้ไข/เปลี่ยนเครื่อง</button>
                    <button onclick="deleteEmployee('${e.employee_id}','${e.name}')" class="btn-delete">ลาออก/ลบ</button>
                </td>
            </tr>`;
    });
}

// ฟังก์ชันโหลดตัวเลือก Asset (คอม/ปริ้นเตอร์) ลง Dropdown
async function populateAssetDropdowns(currentOwnerId = null) {
    const comSel = document.getElementById('formComputer');
    const prnSel = document.getElementById('formPrinter');
    
    comSel.innerHTML = '<option>Loading...</option>';
    prnSel.innerHTML = '<option>Loading...</option>';

    // ดึงคอมที่ "ว่าง" หรือ "เป็นของคนนี้อยู่แล้ว"
    const {data: computers} = await supabaseClient.from('computers').select('computer_id, user_id, spec');
    const {data: printers} = await supabaseClient.from('printers').select('printer_id, user_id, model');

    // สร้างตัวเลือก Computer
    comSel.innerHTML = '<option value="">-- ไม่ใช้งาน / คืนเครื่อง --</option>';
    computers.forEach(c => {
        // เงื่อนไข: เอาที่ว่าง (user_id=null) หรือ เป็นของคนนี้ (user_id=currentOwnerId)
        if (c.user_id === null || c.user_id === currentOwnerId) {
            const isSelected = c.user_id === currentOwnerId;
            // ถ้าเป็นของคนนี้ ให้จำค่าเดิมใส่ Hidden Input ไว้เช็คตอน Save
            if (isSelected) document.getElementById('originalComputerId').value = c.computer_id;
            
            comSel.add(new Option(`${c.computer_id} (${c.spec||'-'})`, c.computer_id, false, isSelected));
        }
    });

    // สร้างตัวเลือก Printer
    prnSel.innerHTML = '<option value="">-- ไม่ใช้งาน / คืนเครื่อง --</option>';
    printers.forEach(p => {
        if (p.user_id === null || p.user_id === currentOwnerId) {
            const isSelected = p.user_id === currentOwnerId;
            if (isSelected) document.getElementById('originalPrinterId').value = p.printer_id;
            
            prnSel.add(new Option(`${p.printer_id} (${p.model||'-'})`, p.printer_id, false, isSelected));
        }
    });
}

async function openEmployeeModal(mode, id=null) {
    document.getElementById('employeeForm').reset(); 
    document.getElementById('formMode').value = mode;
    document.getElementById('originalComputerId').value = ""; // รีเซ็ตค่าเดิม
    document.getElementById('originalPrinterId').value = "";

    if(mode === 'create') {
        document.getElementById('formEmployeeId').readOnly = false;
        await populateAssetDropdowns(null); // โหลดของว่าง
    } else {
        document.getElementById('formEmployeeId').readOnly = true; 
        document.getElementById('editEmployeeId').value = id;
        
        // ดึงข้อมูลพนักงาน
        const { data } = await supabaseClient.from('employees').select('*').eq('employee_id', id).single();
        document.getElementById('formEmployeeId').value = data.employee_id;
        document.getElementById('formName').value = data.name;
        document.getElementById('formDepartment').value = data.department;
        document.getElementById('formPosition').value = data.position;
        document.getElementById('formEmail').value = data.email;
        document.getElementById('formDeskPhone').value = data.desk_phone;

        // โหลด Asset และติ๊กเลือกอันที่ใช้อยู่ให้อัตโนมัติ
        await populateAssetDropdowns(id);
    }
    document.getElementById('modalBackdrop').style.display = 'block';
}

// 🔥 ไฮไลท์: ฟังก์ชันบันทึกที่แก้ Bug เรื่องเปลี่ยนเครื่อง
async function handleEmployeeSubmit() {
    const mode = document.getElementById('formMode').value;
    const empId = mode === 'create' ? document.getElementById('formEmployeeId').value : document.getElementById('editEmployeeId').value;
    
    // 1. บันทึกข้อมูลพื้นฐานพนักงาน (เหมือนเดิม)
    const payload = {
        employee_id: document.getElementById('formEmployeeId').value,
        name: document.getElementById('formName').value,
        department: document.getElementById('formDepartment').value,
        position: document.getElementById('formPosition').value,
        email: document.getElementById('formEmail').value,
        desk_phone: document.getElementById('formDeskPhone').value
    };

    if (mode === 'create') {
        await supabaseClient.from('employees').insert([payload]);
    } else {
        delete payload.employee_id;
        await supabaseClient.from('employees').update(payload).eq('employee_id', empId);
    }

    // 2. จัดการ Asset (ส่วนที่เพิ่มใหม่)
    const newComputer = document.getElementById('formComputer').value;
    const oldComputer = document.getElementById('originalComputerId').value;
    const newPrinter = document.getElementById('formPrinter').value;
    const oldPrinter = document.getElementById('originalPrinterId').value;

    // --- Logic จัดการคอมพิวเตอร์ ---
    // ถ้ามีการเปลี่ยน (เลือกใหม่ ไม่ตรงกับของเดิม)
    if (newComputer !== oldComputer) {
        // A. ถ้าเดิมมีเครื่องอยู่ -> ปลดเครื่องเก่าให้ว่าง (user_id = null)
        if (oldComputer) {
            await supabaseClient.from('computers').update({ user_id: null }).eq('computer_id', oldComputer);
        }
        // B. ถ้าเลือกเครื่องใหม่ -> ผูกกับคนนี้ (user_id = empId)
        if (newComputer) {
            await supabaseClient.from('computers').update({ user_id: empId, loan_borrower_name: null }).eq('computer_id', newComputer);
        }
    }

    // --- Logic จัดการปริ้นเตอร์ ---
    if (newPrinter !== oldPrinter) {
        if (oldPrinter) {
            await supabaseClient.from('printers').update({ user_id: null }).eq('printer_id', oldPrinter);
        }
        if (newPrinter) {
            await supabaseClient.from('printers').update({ user_id: empId }).eq('printer_id', newPrinter);
        }
    }

    alert('บันทึกสำเร็จ'); 
    closeModal(); 
    loadAllEmployees();
}

// ฟังก์ชันลบพนักงาน (ลาออก)
async function deleteEmployee(id, name) {
    if(!confirm(`ต้องการลบ ${name} และปลดทรัพย์สินทั้งหมดใช่ไหม?`)) return;
    
    // ปลด Asset ทั้งหมดให้อัตโนมัติ
    await supabaseClient.from('computers').update({user_id: null}).eq('user_id', id);
    await supabaseClient.from('printers').update({user_id: null}).eq('user_id', id);
    
    // ลบ User
    await supabaseClient.from('employees').delete().eq('employee_id', id);
    
    alert('ลบเรียบร้อย ทรัพย์สินทั้งหมดคืนสถานะ "ว่าง"'); 
    loadAllEmployees();
}

function closeModal() { 
    document.getElementById('modalBackdrop').style.display = 'none'; 
}

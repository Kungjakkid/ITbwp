// manage_employees.js
// ไม่ต้องประกาศ Supabase ซ้ำ เพราะใช้จาก config.js แล้ว

let allEmployees = [];

window.onload = loadEmployees;

// 1. โหลดข้อมูลพนักงาน
async function loadEmployees() {
    const table = document.getElementById('employeeListBody');
    if (!table) return console.error("หาตารางไม่เจอ!"); // กันเหนียว

    table.innerHTML = '<tr><td colspan="5" style="text-align:center;">กำลังโหลดข้อมูล...</td></tr>';

    // ดึงข้อมูลพนักงาน + ทรัพย์สินที่ถือ
    const { data, error } = await supabaseClient
        .from('employees')
        .select(`*, computers(computer_id), printers(printer_id)`)
        .order('employee_id');

    if (error) return alert('Error: ' + error.message);

    allEmployees = data;
    renderTable(allEmployees);
}

// 2. วาดตาราง (Render Table)
function renderTable(data) {
    const table = document.getElementById('employeeListBody');
    table.innerHTML = '';

    if (data.length === 0) {
        table.innerHTML = '<tr><td colspan="5" style="text-align:center;">ไม่พบข้อมูล</td></tr>';
        return;
    }

    data.forEach(e => {
        // เช็คทรัพย์สิน
        let assets = [];
        if (e.computers.length > 0) assets.push(`<span class="status-badge status-in-use"><i class="fas fa-laptop"></i> ${e.computers[0].computer_id}</span>`);
        if (e.printers.length > 0) assets.push(`<span class="status-badge status-loaned"><i class="fas fa-print"></i> ${e.printers[0].printer_id}</span>`);
        
        const assetHtml = assets.length > 0 ? assets.join(' ') : '<span style="color:#cbd5e1">-</span>';

        // สร้างแถว
        const row = `
            <tr>
                <td style="font-weight:600; color:#1e293b;">${e.employee_id}</td>
                <td>${e.name}</td>
                <td>${e.department || '-'}</td>
                <td>${assetHtml}</td>
                <td>
                    <button onclick="openEmployeeModal('update', '${e.employee_id}')" class="btn btn-primary" style="padding:6px 12px; font-size:0.85rem;">แก้ไข</button>
                    <button onclick="deleteEmployee('${e.employee_id}', '${e.name}')" class="btn btn-danger" style="padding:6px 12px; font-size:0.85rem;">ลบ</button>
                </td>
            </tr>
        `;
        table.innerHTML += row;
    });
}

// 3. เตรียม Dropdown เลือกของ
async function populateAssetDropdowns(currentOwnerId = null) {
    const comSel = document.getElementById('formComputer');
    const prnSel = document.getElementById('formPrinter');
    
    comSel.innerHTML = '<option>Loading...</option>';
    prnSel.innerHTML = '<option>Loading...</option>';

    const { data: computers } = await supabaseClient.from('computers').select('computer_id, user_id, spec, loan_borrower_name');
    const { data: printers } = await supabaseClient.from('printers').select('printer_id, user_id, model');

    // ตัวเลือก Computer
    comSel.innerHTML = '<option value="">-- ไม่ระบุ / คืนเครื่อง --</option>';
    computers.forEach(c => {
        if ((!c.user_id && !c.loan_borrower_name) || c.user_id === currentOwnerId) {
            const isSelected = c.user_id === currentOwnerId;
            if(isSelected) document.getElementById('oldCom').value = c.computer_id; // จำค่าเก่า
            comSel.add(new Option(`${c.computer_id} (${c.spec||''})`, c.computer_id, false, isSelected));
        }
    });

    // ตัวเลือก Printer
    prnSel.innerHTML = '<option value="">-- ไม่ระบุ / คืนเครื่อง --</option>';
    printers.forEach(p => {
        if (!p.user_id || p.user_id === currentOwnerId) {
            const isSelected = p.user_id === currentOwnerId;
            if(isSelected) document.getElementById('oldPrn').value = p.printer_id; // จำค่าเก่า
            prnSel.add(new Option(`${p.printer_id}`, p.printer_id, false, isSelected));
        }
    });
}

// 4. เปิด Modal
window.openEmployeeModal = async function(mode, id = null) {
    document.getElementById('employeeForm').reset();
    document.getElementById('formMode').value = mode;
    document.getElementById('oldCom').value = "";
    document.getElementById('oldPrn').value = "";

    if (mode === 'create') {
        document.getElementById('formEmployeeId').readOnly = false;
        await populateAssetDropdowns(null);
    } else {
        document.getElementById('formEmployeeId').readOnly = true;
        document.getElementById('editEmployeeId').value = id;
        
        // ดึงข้อมูลเก่ามาใส่
        const { data } = await supabaseClient.from('employees').select('*').eq('employee_id', id).single();
        document.getElementById('formEmployeeId').value = data.employee_id;
        document.getElementById('formName').value = data.name;
        document.getElementById('formDepartment').value = data.department;
        document.getElementById('formPosition').value = data.position;
        document.getElementById('formEmail').value = data.email;
        document.getElementById('formDeskPhone').value = data.desk_phone;

        await populateAssetDropdowns(id);
    }
    document.getElementById('modalBackdrop').style.display = 'flex';
}

// 5. บันทึกข้อมูล (Save)
window.handleEmployeeSubmit = async function() {
    const mode = document.getElementById('formMode').value;
    const id = mode === 'create' ? document.getElementById('formEmployeeId').value : document.getElementById('editEmployeeId').value;
    
    if(!id) return alert("กรุณาระบุรหัสพนักงาน");

    const empData = {
        employee_id: id,
        name: document.getElementById('formName').value,
        department: document.getElementById('formDepartment').value,
        position: document.getElementById('formPosition').value,
        email: document.getElementById('formEmail').value,
        desk_phone: document.getElementById('formDeskPhone').value
    };

    // A. บันทึกข้อมูลคน
    if (mode === 'create') {
        const { error } = await supabaseClient.from('employees').insert([empData]);
        if(error) return alert('รหัสซ้ำ หรือ เกิดข้อผิดพลาด');
    } else {
        delete empData.employee_id;
        await supabaseClient.from('employees').update(empData).eq('employee_id', id);
    }

    // B. สลับเครื่อง (Asset Swap Logic)
    const newCom = document.getElementById('formComputer').value;
    const oldCom = document.getElementById('oldCom').value;
    const newPrn = document.getElementById('formPrinter').value;
    const oldPrn = document.getElementById('oldPrn').value;

    if (newCom !== oldCom) {
        if (oldCom) await supabaseClient.from('computers').update({ user_id: null }).eq('computer_id', oldCom);
        if (newCom) await supabaseClient.from('computers').update({ user_id: id, loan_borrower_name: null }).eq('computer_id', newCom);
    }

    if (newPrn !== oldPrn) {
        if (oldPrn) await supabaseClient.from('printers').update({ user_id: null }).eq('printer_id', oldPrn);
        if (newPrn) await supabaseClient.from('printers').update({ user_id: id }).eq('printer_id', newPrn);
    }

    alert('บันทึกเรียบร้อย');
    closeModal();
    loadEmployees();
}

// 6. ลบพนักงาน
window.deleteEmployee = async function(id, name) {
    if (!confirm(`ต้องการลบ ${name} ?\n(ทรัพย์สินจะถูกปลดออกอัตโนมัติ)`)) return;

    await supabaseClient.from('computers').update({ user_id: null }).eq('user_id', id);
    await supabaseClient.from('printers').update({ user_id: null }).eq('user_id', id);
    await supabaseClient.from('employees').delete().eq('employee_id', id);

    alert('ลบเรียบร้อย');
    loadEmployees();
}

window.closeModal = function() {
    document.getElementById('modalBackdrop').style.display = 'none';
}
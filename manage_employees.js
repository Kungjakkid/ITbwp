let allEmployees = [];
let currentEmpId = null;

window.onload = loadEmployees;

// 1. โหลดข้อมูลพนักงาน + ทรัพย์สินที่เขาถือ
async function loadEmployees() {
    document.getElementById('employeeGrid').innerHTML = '<div style="grid-column:1/-1; text-align:center; color:#64748b;">กำลังโหลดข้อมูล...</div>';
    
    // Join ตารางคอมพิวเตอร์และปริ้นเตอร์
    const { data, error } = await supabaseClient
        .from('employees')
        .select(`*, computers(computer_id, spec), printers(printer_id, model)`)
        .order('employee_id');

    if (error) return alert('Error: ' + error.message);

    allEmployees = data;
    document.getElementById('totalCount').innerText = allEmployees.length;
    renderGrid(allEmployees);
}

// 2. แสดงผลแบบการ์ด Grid
function renderGrid(data) {
    const grid = document.getElementById('employeeGrid');
    grid.innerHTML = '';

    data.forEach(emp => {
        // เช็คว่ามีของไหม
        let badges = '';
        if (emp.computers && emp.computers.length > 0) {
            badges += `<span class="status-badge status-in-use" style="margin-right:5px;"><i class="fas fa-laptop"></i> ${emp.computers[0].computer_id}</span>`;
        }
        if (emp.printers && emp.printers.length > 0) {
            badges += `<span class="status-badge status-loaned"><i class="fas fa-print"></i> ${emp.printers[0].printer_id}</span>`;
        }
        if (badges === '') badges = '<span style="color:#ccc; font-size:0.8rem;">- ไม่มีทรัพย์สิน -</span>';

        const card = document.createElement('div');
        card.className = 'asset-card';
        card.onclick = () => openDetail(emp.employee_id);

        card.innerHTML = `
            <div class="card-header">
                <div class="card-icon"><i class="fas fa-user"></i></div>
                <div style="font-weight:bold; color:#64748b;">${emp.employee_id}</div>
            </div>
            <h3 class="card-title">${emp.name}</h3>
            <p class="card-subtitle">${emp.department || '-'} • ${emp.position || '-'}</p>
            <div style="margin-top:15px; padding-top:15px; border-top:1px solid #f1f5f9;">
                ${badges}
            </div>
        `;
        grid.appendChild(card);
    });
}

// 3. เปิดหน้าต่างแก้ไข (Detail Modal)
async function openDetail(id) {
    currentEmpId = id;
    const emp = allEmployees.find(e => e.employee_id === id);

    // ใส่ข้อมูลลงฟอร์ม
    document.getElementById('viewName').innerText = emp.name;
    document.getElementById('viewId').innerText = emp.employee_id;
    document.getElementById('editName').value = emp.name;
    document.getElementById('editDept').value = emp.department || '';
    document.getElementById('editPos').value = emp.position || '';
    document.getElementById('editPhone').value = emp.desk_phone || '';
    document.getElementById('editEmail').value = emp.email || '';

    // โหลด Dropdown Assets
    await loadAssetDropdowns(id);

    document.getElementById('detailModal').style.display = 'block';
}

// 4. โหลดตัวเลือกคอม/ปริ้นเตอร์ (เอาเฉพาะที่ว่าง หรือที่เป็นของคนนี้อยู่แล้ว)
async function loadAssetDropdowns(ownerId) {
    const comSel = document.getElementById('editComputer');
    const prnSel = document.getElementById('editPrinter');
    
    comSel.innerHTML = '<option>Loading...</option>';
    prnSel.innerHTML = '<option>Loading...</option>';

    const { data: computers } = await supabaseClient.from('computers').select('computer_id, user_id, spec, loan_borrower_name');
    const { data: printers } = await supabaseClient.from('printers').select('printer_id, user_id, model');

    // สร้างตัวเลือก Computer
    comSel.innerHTML = '<option value="">-- ไม่ระบุ / คืนเครื่อง --</option>';
    computers.forEach(c => {
        // เงื่อนไข: (ว่าง AND ไม่ติดยืม) OR (เป็นของคนนี้)
        if ((c.user_id === null && c.loan_borrower_name === null) || c.user_id === ownerId) {
            const isSelected = c.user_id === ownerId;
            comSel.add(new Option(`${c.computer_id} (${c.spec||'-'})`, c.computer_id, false, isSelected));
        }
    });

    // สร้างตัวเลือก Printer
    prnSel.innerHTML = '<option value="">-- ไม่ระบุ / คืนเครื่อง --</option>';
    printers.forEach(p => {
        if (p.user_id === null || p.user_id === ownerId) {
            const isSelected = p.user_id === ownerId;
            prnSel.add(new Option(`${p.printer_id} (${p.model||'-'})`, p.printer_id, false, isSelected));
        }
    });
}

// 5. บันทึกข้อมูล (แก้ไข + สลับของ)
async function saveChanges() {
    const name = document.getElementById('editName').value;
    const dept = document.getElementById('editDept').value;
    
    // 1. อัปเดตข้อมูลคน
    await supabaseClient.from('employees').update({
        name: name,
        department: dept,
        position: document.getElementById('editPos').value,
        desk_phone: document.getElementById('editPhone').value,
        email: document.getElementById('editEmail').value
    }).eq('employee_id', currentEmpId);

    // 2. จัดการ Asset Swap (คอมพิวเตอร์)
    // หาคอมเดิมของคนนี้
    const empData = allEmployees.find(e => e.employee_id === currentEmpId);
    const oldComId = empData.computers[0]?.computer_id || "";
    const newComId = document.getElementById('editComputer').value;

    if (newComId !== oldComId) {
        // ถ้าเดิมมีเครื่อง -> ปลดออก
        if (oldComId) await supabaseClient.from('computers').update({ user_id: null }).eq('computer_id', oldComId);
        // ถ้าเลือกเครื่องใหม่ -> ใส่ชื่อ
        if (newComId) await supabaseClient.from('computers').update({ user_id: currentEmpId, loan_borrower_name: null }).eq('computer_id', newComId);
    }

    // 3. จัดการ Asset Swap (ปริ้นเตอร์)
    const oldPrnId = empData.printers[0]?.printer_id || "";
    const newPrnId = document.getElementById('editPrinter').value;

    if (newPrnId !== oldPrnId) {
        if (oldPrnId) await supabaseClient.from('printers').update({ user_id: null }).eq('printer_id', oldPrnId);
        if (newPrnId) await supabaseClient.from('printers').update({ user_id: currentEmpId }).eq('printer_id', newPrnId);
    }

    alert('บันทึกเรียบร้อย');
    closeDetailModal();
    loadEmployees();
}

// 6. เพิ่มพนักงานใหม่
async function createNewEmployee() {
    const id = document.getElementById('newId').value;
    const name = document.getElementById('newName').value;
    const dept = document.getElementById('newDept').value;

    if (!id || !name) return alert('กรุณากรอกรหัสและชื่อพนักงาน');

    const { error } = await supabaseClient.from('employees').insert([{
        employee_id: id,
        name: name,
        department: dept
    }]);

    if (error) alert('Error: ' + error.message);
    else {
        alert('เพิ่มพนักงานสำเร็จ');
        document.getElementById('createModal').style.display = 'none';
        loadEmployees();
    }
}

// 7. ลบพนักงาน (สำคัญ: ต้องปลดของก่อนลบ)
async function deleteCurrentEmployee() {
    if (!confirm(`ยืนยันลบพนักงาน ${currentEmpId}? \n(ทรัพย์สินทั้งหมดจะถูกปลดออกอัตโนมัติ)`)) return;

    // 1. ปลดคอม
    await supabaseClient.from('computers').update({ user_id: null }).eq('user_id', currentEmpId);
    // 2. ปลดปริ้นเตอร์
    await supabaseClient.from('printers').update({ user_id: null }).eq('user_id', currentEmpId);
    // 3. ลบคน
    const { error } = await supabaseClient.from('employees').delete().eq('employee_id', currentEmpId);

    if (error) alert('ลบไม่สำเร็จ: ' + error.message);
    else {
        alert('ลบเรียบร้อย');
        closeDetailModal();
        loadEmployees();
    }
}

function filterEmployees() {
    const txt = document.getElementById('searchInput').value.toLowerCase();
    const filtered = allEmployees.filter(e => 
        e.name.toLowerCase().includes(txt) || 
        e.employee_id.toLowerCase().includes(txt) || 
        (e.department||'').toLowerCase().includes(txt)
    );
    renderGrid(filtered);
}

function openCreateModal() { document.getElementById('createModal').style.display='block'; }
function closeDetailModal() { document.getElementById('detailModal').style.display='none'; }
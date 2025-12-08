// 🔴 ใส่ URL และ Key ของคุณ (คัดลอกจาก app.js มา) 🔴
const SUPABASE_URL = 'https://yqlyxzowfbowznpzapxf.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxbHl4em93ZmJvd3pucHphcHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMTc3NDEsImV4cCI6MjA3ODU5Mzc0MX0.ZhJAq0mt3LAamCZlBGux_fwhyQIlOab_0BFsaWubHko';

// 🌟 แก้ไข: เปลี่ยนชื่อตัวแปรเป็น supabaseClient (เพื่อไม่ให้ชนกับ Library หลัก)
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const notebookSelect = document.getElementById('notebookSelect');
const borrowerNameInput = document.getElementById('borrowerName');
const borrowerDeptInput = document.getElementById('borrowerDept');

// --- สั่งให้โหลด Notebook ที่ว่างทันทีที่เปิดหน้า ---
window.onload = loadAvailableNotebooks;

async function loadAvailableNotebooks() {
    notebookSelect.innerHTML = '<option value="">-- กำลังโหลด... --</option>';

    // 🌟 แก้ไข: ใช้ supabaseClient
    const { data, error } = await supabaseClient
        .from('computers')
        .select('computer_id, spec')
        .eq('asset_type', 'Notebook')
        .is('user_id', null)
        .is('loan_borrower_name', null)
        .order('computer_id');

    if (error) {
        notebookSelect.innerHTML = '<option value="">เกิดข้อผิดพลาดในการโหลด</option>';
        alert(error.message);
        return;
    }

    if (data.length === 0) {
        notebookSelect.innerHTML = '<option value="">-- ไม่มี Notebook ว่างในขณะนี้ --</option>';
        return;
    }

    notebookSelect.innerHTML = '<option value="">-- กรุณาเลือกเครื่อง --</option>';
    data.forEach(com => {
        const option = document.createElement('option');
        option.value = com.computer_id;
        option.textContent = `${com.computer_id} (${com.spec || 'N/A'})`;
        notebookSelect.appendChild(option);
    });
}

// --- ฟังก์ชันยืนยันการยืม ---
async function submitLoan() {
    const selectedComputerId = notebookSelect.value;
    const borrowerName = borrowerNameInput.value.trim();
    const borrowerDept = borrowerDeptInput.value.trim();

    // ตรวจสอบข้อมูล
    if (!selectedComputerId) {
        alert('กรุณาเลือก Notebook ที่ต้องการยืม');
        return;
    }
    if (!borrowerName || !borrowerDept) {
        alert('กรุณากรอกชื่อและแผนกของผู้ยืม');
        return;
    }

    if (!confirm(`คุณ ${borrowerName} (${borrowerDept}) \nต้องการยืมเครื่อง ${selectedComputerId} ใช่หรือไม่?`)) {
        return;
    }

    // สร้างข้อความที่จะเก็บลงฐานข้อมูล
    const loanInfo = `${borrowerName} (${borrowerDept}) - Loaned ${new Date().toLocaleDateString('en-US')}`;

    try {
        // 1. อัปเดตตาราง computers
        // 🌟 แก้ไข: ใช้ supabaseClient
        const { error: comError } = await supabaseClient
            .from('computers')
            .update({ loan_borrower_name: loanInfo })
            .eq('computer_id', selectedComputerId);

        if (comError) throw comError;

        // 2. เพิ่ม Log ประวัติการยืม (ถ้ามีตาราง loan_logs แล้ว)
        // 🌟 แก้ไข: ใช้ supabaseClient
        await supabaseClient.from('loan_logs').insert([{
            computer_id: selectedComputerId,
            borrower_name: borrowerName,
            borrower_dept: borrowerDept,
            status: 'Borrowed'
        }]);

        // ถ้ายืมสำเร็จ: ซ่อนฟอร์ม และแสดงข้อความขอบคุณ
        document.getElementById('loanFormArea').style.display = 'none';
        document.getElementById('borrowedAssetId').textContent = selectedComputerId;
        document.getElementById('successMessage').style.display = 'block';

    } catch (error) {
        alert('เกิดข้อผิดพลาดในการบันทึก: ' + error.message);
    }
}

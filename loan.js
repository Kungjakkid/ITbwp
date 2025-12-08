// 🔴 ใส่ URL และ Key ของคุณ 🔴
const SUPABASE_URL = 'https://yqlyxzowfbowznpzapxf.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxbHl4em93ZmJvd3pucHphcHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMTc3NDEsImV4cCI6MjA3ODU5Mzc0MX0.ZhJAq0mt3LAamCZlBGux_fwhyQIlOab_0BFsaWubHko';

// 🌟 แก้ไขจุดที่ Error: เปลี่ยนชื่อตัวแปรเป็น supabaseClient
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let verifiedUser = null; 
const notebookSelect = document.getElementById('notebookSelect');
const inputEmpId = document.getElementById('inputEmpId'); // เพิ่มตัวแปรนี้ให้ชัดเจน

// เริ่มทำงาน
window.onload = async () => { await loadNotebooks(); };

// 1. โหลด Notebook ว่าง
async function loadNotebooks() {
    notebookSelect.innerHTML = '<option>Loading...</option>';
    
    // ใช้ supabaseClient แทน supabase
    const { data, error } = await supabaseClient
        .from('computers')
        .select('computer_id, spec')
        .eq('asset_type', 'Notebook')
        .is('user_id', null)
        .is('loan_borrower_name', null)
        .order('computer_id');

    if (error) {
        console.error(error);
        return alert('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    }

    if (!data || data.length === 0) {
        notebookSelect.innerHTML = '<option value="">-- ไม่มีเครื่องว่าง --</option>';
    } else {
        notebookSelect.innerHTML = '<option value="">-- กรุณาเลือกเครื่อง --</option>';
        data.forEach(c => {
            const opt = document.createElement('option'); 
            opt.value = c.computer_id; 
            opt.text = `${c.computer_id} (${c.spec || '-'})`; 
            notebookSelect.appendChild(opt);
        });
    }
}

// 2. ตรวจสอบพนักงาน
async function verifyEmployee() {
    const id = inputEmpId.value.trim(); 
    
    if(!id) return alert('กรุณากรอกรหัสพนักงาน');

    // ใช้ supabaseClient
    const { data, error } = await supabaseClient
        .from('employees')
        .select('name, department, position')
        .eq('employee_id', id)
        .single();

    if (error || !data) { 
        alert('❌ ไม่พบข้อมูลพนักงานรหัสนี้'); 
        document.getElementById('userInfo').style.display='none'; 
        verifiedUser = null; 
    } else {
        document.getElementById('showName').innerText = data.name;
        document.getElementById('showDept').innerText = data.department || '-';
        document.getElementById('showPos').innerText = data.position || '-'; // เพิ่มตำแหน่ง
        document.getElementById('userInfo').style.display='block';
        verifiedUser = { id: id, ...data };
    }
}

// 3. บันทึกการยืม
async function submitLoan() {
    const assetId = notebookSelect.value;
    
    if(!assetId || assetId === "") return alert('กรุณาเลือกเครื่องที่ต้องการยืม');
    if(!verifiedUser) return alert('กรุณาตรวจสอบรหัสพนักงานก่อน');

    if(!confirm(`ยืนยันการยืมเครื่อง ${assetId} \nโดยคุณ ${verifiedUser.name}?`)) return;

    const info = `${verifiedUser.name} (${verifiedUser.department}) - Loaned ${new Date().toLocaleDateString('en-US')}`;

    try {
        // ใช้ supabaseClient
        const { error: err1 } = await supabaseClient
            .from('computers')
            .update({ loan_borrower_name: info })
            .eq('computer_id', assetId);
            
        if(err1) throw err1;

        // ใช้ supabaseClient
        const { error: err2 } = await supabaseClient
            .from('loan_logs')
            .insert([{ 
                computer_id: assetId, 
                borrower_name: verifiedUser.name, 
                borrower_dept: verifiedUser.department, 
                status: 'Borrowed' 
            }]);

        if(err2) throw err2;

        // สำเร็จ
        document.getElementById('formArea').style.display='none';
        document.getElementById('successAssetId').innerText=assetId;
        document.getElementById('successView').style.display='block';

    } catch(e) { 
        alert('เกิดข้อผิดพลาด: ' + e.message); 
    }
}

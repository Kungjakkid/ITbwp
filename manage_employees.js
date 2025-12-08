const SUPABASE_URL = 'https://yqlyxzowfbowznpzapxf.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxbHl4em93ZmJvd3pucHphcHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMTc3NDEsImV4cCI6MjA3ODU5Mzc0MX0.ZhJAq0mt3LAamCZlBGux_fwhyQIlOab_0BFsaWubHko';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

window.onload = loadAllEmployees;

async function loadAllEmployees() {
    const table = document.getElementById('employeeListBody'); table.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
    const { data } = await supabaseClient.from('employees').select('*').order('employee_id');
    table.innerHTML = '';
    data.forEach(e => {
        table.innerHTML += `<tr><td><b>${e.employee_id}</b></td><td>${e.name}</td><td>${e.department||'-'}</td><td>${e.position||'-'}</td><td><button onclick="openEmployeeModal('update','${e.employee_id}')">แก้ไข</button><button onclick="deleteEmployee('${e.employee_id}','${e.name}')" class="btn-delete">ลบ</button></td></tr>`;
    });
}
async function openEmployeeModal(mode, id=null) {
    document.getElementById('employeeForm').reset(); document.getElementById('formMode').value=mode;
    if(mode==='create') document.getElementById('formEmployeeId').readOnly=false;
    else {
        document.getElementById('formEmployeeId').readOnly=true; document.getElementById('editEmployeeId').value=id;
        const {data}=await supabaseClient.from('employees').select('*').eq('employee_id',id).single();
        document.getElementById('formEmployeeId').value=data.employee_id; document.getElementById('formName').value=data.name; document.getElementById('formDepartment').value=data.department; document.getElementById('formPosition').value=data.position; document.getElementById('formEmail').value=data.email; document.getElementById('formDeskPhone').value=data.desk_phone;
    }
    document.getElementById('modalBackdrop').style.display='block';
}
async function handleEmployeeSubmit() {
    const mode=document.getElementById('formMode').value;
    const payload={employee_id: document.getElementById('formEmployeeId').value, name: document.getElementById('formName').value, department: document.getElementById('formDepartment').value, position: document.getElementById('formPosition').value, email: document.getElementById('formEmail').value, desk_phone: document.getElementById('formDeskPhone').value};
    if(mode==='create') await supabaseClient.from('employees').insert([payload]);
    else { delete payload.employee_id; await supabaseClient.from('employees').update(payload).eq('employee_id', document.getElementById('editEmployeeId').value); }
    alert('สำเร็จ'); closeModal(); loadAllEmployees();
}
async function deleteEmployee(id, name) {
    if(!confirm(`ลบ ${name}?`)) return;
    await supabaseClient.from('computers').update({user_id:null}).eq('user_id',id);
    await supabaseClient.from('printers').update({user_id:null}).eq('user_id',id);
    await supabaseClient.from('employees').delete().eq('employee_id',id);
    alert('ลบแล้ว'); loadAllEmployees();
}
function closeModal() { document.getElementById('modalBackdrop').style.display='none'; }
const SUPABASE_URL = 'https://yqlyxzowfbowznpzapxf.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxbHl4em93ZmJvd3pucHphcHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMTc3NDEsImV4cCI6MjA3ODU5Mzc0MX0.ZhJAq0mt3LAamCZlBGux_fwhyQIlOab_0BFsaWubHko';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let allEmployeesCache = [];

window.onload = () => {
    loadAllComputers();
    document.getElementById('filterOwner').addEventListener('input', (e) => {
        renderOwnerDropdown(allEmployeesCache.filter(em => em.name.toLowerCase().includes(e.target.value.toLowerCase()) || em.employee_id.toLowerCase().includes(e.target.value.toLowerCase())), document.getElementById('formOwner').value);
    });
};

async function loadAllComputers() {
    const table = document.getElementById('computerListBody');
    table.innerHTML = '<tr><td colspan="7">Loading...</td></tr>';
    const { data } = await supabaseClient.from('computers').select(`*, employees(employee_id, name)`).order('computer_id');
    table.innerHTML = '';
    data.forEach(c => {
        let st='<span class="status-badge status-available">ว่าง</span>', usr='-';
        if(c.user_id) { st='<span class="status-badge status-in-use">ใช้งาน</span>'; usr=`<b>${c.employees.employee_id}</b> - ${c.employees.name}`; }
        else if(c.loan_borrower_name) { st='<span class="status-badge status-loaned">ถูกยืม</span>'; usr=c.loan_borrower_name; }
        table.innerHTML += `<tr><td>${c.computer_id}</td><td>${c.asset_type||'-'}</td><td>${c.spec||'-'}</td><td>${st}</td><td>${usr}</td><td style="color:#666">${c.remarks||'-'}</td><td><button onclick="openComputerModal('update','${c.computer_id}')">แก้</button><button onclick="deleteComputer('${c.computer_id}','${c.user_id||'null'}','${c.loan_borrower_name||'null'}')" class="btn-delete">ลบ</button></td></tr>`;
    });
}
async function loadEmployeesForDropdown(selId) {
    if(!allEmployeesCache.length) { const {data}=await supabaseClient.from('employees').select('employee_id,name').order('name'); allEmployeesCache=data; }
    renderOwnerDropdown(allEmployeesCache, selId);
}
function renderOwnerDropdown(list, selId) {
    const sel = document.getElementById('formOwner'); sel.innerHTML = '<option value="">-- ว่าง --</option>';
    list.forEach(e => sel.add(new Option(`${e.employee_id} - ${e.name}`, e.employee_id)));
    if(selId) sel.value = selId;
}
async function openComputerModal(mode, id=null) {
    document.getElementById('computerForm').reset(); document.getElementById('formMode').value=mode;
    await loadEmployeesForDropdown(null);
    if(mode==='create') { document.getElementById('formComputerId').readOnly=false; }
    else {
        document.getElementById('formComputerId').readOnly=true; document.getElementById('editComputerId').value=id;
        const {data} = await supabaseClient.from('computers').select('*').eq('computer_id',id).single();
        document.getElementById('formComputerId').value=data.computer_id; document.getElementById('formAssetType').value=data.asset_type;
        document.getElementById('formSpec').value=data.spec; document.getElementById('formRepairHistory').value=data.repair_history;
        document.getElementById('formRemarks').value=data.remarks; await loadEmployeesForDropdown(data.user_id);
    }
    document.getElementById('modalBackdrop').style.display='block';
}
async function handleComputerSubmit() {
    const mode=document.getElementById('formMode').value, owner=document.getElementById('formOwner').value;
    const payload = {
        computer_id: document.getElementById('formComputerId').value, asset_type: document.getElementById('formAssetType').value,
        spec: document.getElementById('formSpec').value, repair_history: document.getElementById('formRepairHistory').value,
        remarks: document.getElementById('formRemarks').value, user_id: owner||null, loan_borrower_name: owner?null:undefined
    };
    if(payload.loan_borrower_name===undefined) delete payload.loan_borrower_name;
    if(mode==='create') await supabaseClient.from('computers').insert([payload]);
    else await supabaseClient.from('computers').update(payload).eq('computer_id', document.getElementById('editComputerId').value);
    alert('สำเร็จ'); document.getElementById('modalBackdrop').style.display='none'; loadAllComputers();
}
async function deleteComputer(id, uid, loan) {
    if(uid!=='null'||loan!=='null') return alert('ลบไม่ได้: ไม่ว่าง');
    if(confirm(`ลบ ${id}?`)) { await supabaseClient.from('computers').delete().eq('computer_id', id); loadAllComputers(); }
}
function closeModal() { document.getElementById('modalBackdrop').style.display='none'; }
function goToLoanPage() { window.location.href = 'loan.html'; }
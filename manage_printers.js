const SUPABASE_URL = 'https://yqlyxzowfbowznpzapxf.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxbHl4em93ZmJvd3pucHphcHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMTc3NDEsImV4cCI6MjA3ODU5Mzc0MX0.ZhJAq0mt3LAamCZlBGux_fwhyQIlOab_0BFsaWubHko';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

window.onload = loadAllPrinters;

async function loadAllPrinters() {
    const table = document.getElementById('printerListBody'); table.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
    const { data } = await supabaseClient.from('printers').select(`printer_id, model, user_id, employees(name, employee_id)`).order('printer_id');
    table.innerHTML = '';
    data.forEach(p => {
        let u = '<span style="color:#ccc">-</span>';
        if(p.employees) u = `<b>${p.employees.employee_id}</b> - ${p.employees.name}`;
        table.innerHTML += `<tr><td>${p.printer_id}</td><td>${p.model||'-'}</td><td>${u}</td><td><button onclick="openPrinterModal('update','${p.printer_id}')">แก้</button><button onclick="deletePrinter('${p.printer_id}','${p.user_id||'null'}')" class="btn-delete">ลบ</button></td></tr>`;
    });
}
async function loadEmployeesForDropdown(selId) {
    const sel = document.getElementById('formOwner'); sel.innerHTML='<option value="">-- ว่าง --</option>';
    const {data}=await supabaseClient.from('employees').select('employee_id,name').order('name');
    data.forEach(e => sel.add(new Option(`${e.employee_id} - ${e.name}`, e.employee_id)));
    if(selId) sel.value=selId;
}
async function openPrinterModal(mode, id=null) {
    document.getElementById('printerForm').reset(); document.getElementById('formMode').value=mode;
    await loadEmployeesForDropdown(null);
    if(mode==='create') document.getElementById('formPrinterId').readOnly=false;
    else {
        document.getElementById('formPrinterId').readOnly=true; document.getElementById('editPrinterId').value=id;
        const {data}=await supabaseClient.from('printers').select('*').eq('printer_id',id).single();
        document.getElementById('formPrinterId').value=data.printer_id; document.getElementById('formModel').value=data.model; await loadEmployeesForDropdown(data.user_id);
    }
    document.getElementById('modalBackdrop').style.display='block';
}
async function handlePrinterSubmit() {
    const mode=document.getElementById('formMode').value, o=document.getElementById('formOwner').value;
    const d={printer_id:document.getElementById('formPrinterId').value, model:document.getElementById('formModel').value, user_id:o||null};
    if(mode==='create') await supabaseClient.from('printers').insert([d]);
    else { delete d.printer_id; await supabaseClient.from('printers').update(d).eq('printer_id',document.getElementById('editPrinterId').value); }
    alert('สำเร็จ'); closeModal(); loadAllPrinters();
}
async function deletePrinter(id, uid) {
    if(uid!=='null') return alert('ไม่ว่าง');
    if(confirm(`ลบ ${id}?`)) { await supabaseClient.from('printers').delete().eq('printer_id',id); loadAllPrinters(); }
}
function closeModal() { document.getElementById('modalBackdrop').style.display='none'; }
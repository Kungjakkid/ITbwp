const SUPABASE_URL = 'https://yqlyxzowfbowznpzapxf.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxbHl4em93ZmJvd3pucHphcHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMTc3NDEsImV4cCI6MjA3ODU5Mzc0MX0.ZhJAq0mt3LAamCZlBGux_fwhyQIlOab_0BFsaWubHko';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let verifiedUser = null; const notebookSelect = document.getElementById('notebookSelect');
window.onload = async () => { await loadNotebooks(); };
async function loadNotebooks() {
    notebookSelect.innerHTML = '<option>Loading...</option>';
    const { data, error } = await supabase.from('computers').select('computer_id, spec').eq('asset_type', 'Notebook').is('user_id', null).is('loan_borrower_name', null).order('computer_id');
    if (error) return alert('Error');
    if (!data.length) notebookSelect.innerHTML = '<option value="">-- ไม่ว่าง --</option>';
    else { notebookSelect.innerHTML = '<option value="">-- เลือก --</option>'; data.forEach(c => { notebookSelect.add(new Option(`${c.computer_id} (${c.spec})`, c.computer_id)); }); }
}
async function verifyEmployee() {
    const id = document.getElementById('inputEmpId').value.trim(); if(!id) return alert('กรอกรหัส');
    const { data } = await supabase.from('employees').select('name, department').eq('employee_id', id).single();
    if (!data) { alert('ไม่พบข้อมูล'); document.getElementById('userInfo').style.display='none'; }
    else { document.getElementById('showName').innerText = data.name; document.getElementById('showDept').innerText = data.department||'-'; document.getElementById('userInfo').style.display='block'; verifiedUser = { id: id, ...data }; }
}
async function submitLoan() {
    const assetId = notebookSelect.value; if(!assetId || !verifiedUser) return alert('ข้อมูลไม่ครบ');
    if(!confirm(`ยืนยันยืม ${assetId}?`)) return;
    const info = `${verifiedUser.name} (${verifiedUser.department}) - Loaned ${new Date().toLocaleDateString('en-US')}`;
    try {
        await supabase.from('computers').update({ loan_borrower_name: info }).eq('computer_id', assetId);
        await supabase.from('loan_logs').insert([{ computer_id: assetId, borrower_name: verifiedUser.name, borrower_dept: verifiedUser.department, status: 'Borrowed' }]);
        document.getElementById('formArea').style.display='none'; document.getElementById('successAssetId').innerText=assetId; document.getElementById('successView').style.display='block';
    } catch(e) { alert(e.message); }
}
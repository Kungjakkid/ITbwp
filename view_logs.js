const SUPABASE_URL = 'https://yqlyxzowfbowznpzapxf.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxbHl4em93ZmJvd3pucHphcHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMTc3NDEsImV4cCI6MjA3ODU5Mzc0MX0.ZhJAq0mt3LAamCZlBGux_fwhyQIlOab_0BFsaWubHko';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

window.onload = async () => {
    const table = document.getElementById('logListBody'); table.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';
    const { data } = await supabaseClient.from('loan_logs').select('*').order('borrow_date', { ascending: false });
    table.innerHTML = '';
    data.forEach(l => {
        const st = l.status==='Borrowed' ? '<span class="status-badge status-loaned">กำลังยืม</span>' : '<span class="status-badge status-available">คืนแล้ว</span>';
        const ret = l.return_date ? new Date(l.return_date).toLocaleString('th-TH') : '-';
        table.innerHTML += `<tr><td>${new Date(l.borrow_date).toLocaleString('th-TH')}</td><td><b>${l.computer_id}</b></td><td>${l.borrower_name}</td><td>${l.borrower_dept||'-'}</td><td>${ret}</td><td>${st}</td></tr>`;
    });
};
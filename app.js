let globalData = [], filterType = 'all';
window.onload = async () => {
    document.getElementById('resBody').innerHTML = '<tr><td colspan="6" style="text-align:center">Loading...</td></tr>';
    const { data } = await supabaseClient.from('computers').select(`*, employees(name, department)`).order('computer_id');
    globalData = data; calculateStats(); applyFilter();
};
function calculateStats() {
    let nb=0, pc=0, use=0, loan=0;
    globalData.forEach(c => {
        if(c.user_id) use++; else if(c.loan_borrower_name) loan++; else c.asset_type==='Notebook'?nb++:pc++;
    });
    document.getElementById('st-nb').innerText=nb; document.getElementById('st-pc').innerText=pc;
    document.getElementById('st-use').innerText=use; document.getElementById('st-loan').innerText=loan;
}
window.setFilter = (t, card) => {
    document.querySelectorAll('.stat-card').forEach(e=>e.classList.remove('active-filter'));
    if(filterType===t) { filterType='all'; } else { filterType=t; card.classList.add('active-filter'); }
    applyFilter();
};
window.applyFilter = () => {
    const txt = document.getElementById('search').value.toLowerCase();
    const res = globalData.filter(c => {
        let pass = true;
        if(filterType==='nb_free') pass = !c.user_id && !c.loan_borrower_name && c.asset_type==='Notebook';
        else if(filterType==='pc_free') pass = !c.user_id && !c.loan_borrower_name && c.asset_type!=='Notebook';
        else if(filterType==='in_use') pass = !!c.user_id;
        else if(filterType==='loaned') pass = !!c.loan_borrower_name;
        return pass && (c.computer_id.toLowerCase().includes(txt) || (c.employees?.name||'').toLowerCase().includes(txt));
    });
    const tb = document.getElementById('resBody'); tb.innerHTML='';
    if(res.length===0) return tb.innerHTML='<tr><td colspan="6" style="text-align:center">- ไม่พบข้อมูล -</td></tr>';
    res.forEach(c => {
        let st='<span class="status-badge status-available">ว่าง</span>', u='-', d='-';
        if(c.user_id){st='<span class="status-badge status-in-use">ใช้งาน</span>'; u=`<b>${c.employees.name}</b>`; d=c.employees.department;}
        else if(c.loan_borrower_name){st='<span class="status-badge status-loaned">ถูกยืม</span>'; u=c.loan_borrower_name;}
        tb.innerHTML += `<tr><td><b>${c.computer_id}</b></td><td>${c.asset_type}</td><td>${st}</td><td>${u}</td><td>${d}</td><td style="color:#64748b">${c.spec||'-'}</td></tr>`;
    });
};
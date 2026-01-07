let globalData = [], filterType = 'all', chart1, chart2;
window.onload = async () => {
    document.getElementById('resBody').innerHTML = '<tr><td colspan="6" style="text-align:center">Loading...</td></tr>';
    const { data } = await supabaseClient.from('computers').select(`*, employees(name, department)`).order('computer_id');
    globalData = data; calculateStats(); applyFilter(); renderCharts();
};
function calculateStats() {
    let nb=0, pc=0, use=0, loan=0;
    globalData.forEach(c => {
        if(c.user_id) use++; else if(c.loan_borrower_name) loan++; else c.asset_type==='Notebook'?nb++:pc++;
    });
    document.getElementById('st-nb').innerText=nb; document.getElementById('st-pc').innerText=pc;
    document.getElementById('st-use').innerText=use; document.getElementById('st-loan').innerText=loan;
}
function renderCharts() {
    const stC = {av:0, us:0, lo:0}, tyC = {};
    globalData.forEach(c => {
        if(c.user_id) stC.us++; else if(c.loan_borrower_name) stC.lo++; else stC.av++;
        tyC[c.asset_type||'Unknown'] = (tyC[c.asset_type||'Unknown']||0)+1;
    });
    const ctx1=document.getElementById('statusChart').getContext('2d');
    if(chart1)chart1.destroy();
    chart1=new Chart(ctx1,{type:'doughnut',data:{labels:['ว่าง','ใช้งาน','ยืม'],datasets:[{data:[stC.av,stC.us,stC.lo],backgroundColor:['#dcfce7','#dbeafe','#fef9c3']}]},options:{responsive:true,maintainAspectRatio:false}});
    const ctx2=document.getElementById('typeChart').getContext('2d');
    if(chart2)chart2.destroy();
    chart2=new Chart(ctx2,{type:'bar',data:{labels:Object.keys(tyC),datasets:[{label:'จำนวน',data:Object.values(tyC),backgroundColor:'#4f46e5',borderRadius:5}]},options:{responsive:true,maintainAspectRatio:false}});
}
window.setFilter=(t,c)=>{ document.querySelectorAll('.stat-card').forEach(e=>e.classList.remove('active-filter')); if(filterType===t){filterType='all';}else{filterType=t;c.classList.add('active-filter');} applyFilter(); };
window.applyFilter=()=>{
    const txt=document.getElementById('search')?.value.toLowerCase()||'';
    const res=globalData.filter(c=>{
        let p=true;
        if(filterType==='nb_free') p=!c.user_id&&!c.loan_borrower_name&&c.asset_type==='Notebook';
        else if(filterType==='pc_free') p=!c.user_id&&!c.loan_borrower_name&&c.asset_type!=='Notebook';
        else if(filterType==='in_use') p=!!c.user_id;
        else if(filterType==='loaned') p=!!c.loan_borrower_name;
        return p && (c.computer_id.toLowerCase().includes(txt)||c.employees?.name.toLowerCase().includes(txt));
    });
    const tb=document.getElementById('resBody'); tb.innerHTML='';
    res.forEach(c=>{
        let st='<span class="status-badge status-available">ว่าง</span>', u='-', d='-';
        if(c.user_id){st='<span class="status-badge status-in-use">ใช้งาน</span>';u=`<b>${c.employees.name}</b>`;d=c.employees.department;}
        else if(c.loan_borrower_name){st='<span class="status-badge status-loaned">ถูกยืม</span>';u=c.loan_borrower_name;}
        tb.innerHTML+=`<tr><td><b>${c.computer_id}</b></td><td>${c.asset_type}</td><td>${st}</td><td>${u}</td><td>${d}</td><td style="color:#64748b">${c.spec||'-'}</td></tr>`;
    });
};
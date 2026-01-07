window.onload=async()=>{
    const t=document.getElementById('list'); t.innerHTML='Loading...';
    const {data}=await supabaseClient.from('loan_logs').select('*').order('borrow_date',{ascending:false});
    t.innerHTML='';
    data.forEach(l=>{
        const st=l.status==='Borrowed'?'<span class="status-badge status-loaned">กำลังยืม</span>':'<span class="status-badge status-available">คืนแล้ว</span>';
        const rd=l.return_date?new Date(l.return_date).toLocaleString('th-TH'):'-';
        t.innerHTML+=`<tr><td>${new Date(l.borrow_date).toLocaleString('th-TH')}</td><td><b>${l.computer_id}</b></td><td>${l.borrower_name}</td><td>${l.borrower_dept}</td><td>${rd}</td><td>${st}</td></tr>`;
    });
};
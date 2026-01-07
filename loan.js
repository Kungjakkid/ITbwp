let user=null;
window.onload=async()=>{
    const s=document.getElementById('nbSel'); s.innerHTML='Loading...';
    const {data}=await supabaseClient.from('computers').select('computer_id,spec').eq('asset_type','Notebook').is('user_id',null).is('loan_borrower_name',null);
    s.innerHTML='<option value="">-- เลือกเครื่อง --</option>';
    data.forEach(c=>s.add(new Option(`${c.computer_id} (${c.spec||'-'})`,c.computer_id)));
};
async function checkUser(){
    const id=document.getElementById('empId').value; if(!id)return alert('ใส่รหัส');
    const {data}=await supabaseClient.from('employees').select('name,department').eq('employee_id',id).single();
    if(!data)return alert('ไม่พบข้อมูล');
    user={id,...data}; document.getElementById('uName').innerText=user.name; document.getElementById('uDept').innerText=user.department; document.getElementById('userResult').style.display='block';
}
async function submit(){
    const cid=document.getElementById('nbSel').value; if(!cid||!user)return alert('ข้อมูลไม่ครบ');
    if(!confirm('ยืนยันยืม?'))return;
    await supabaseClient.from('computers').update({loan_borrower_name:`${user.name} (Loan)`}).eq('computer_id',cid);
    await supabaseClient.from('loan_logs').insert([{computer_id:cid, borrower_name:user.name, borrower_dept:user.department, status:'Borrowed'}]);
    alert('สำเร็จ ติดต่อรับเครื่องได้เลย'); location.reload();
}
const SUPABASE_URL = 'https://yqlyxzowfbowznpzapxf.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxbHl4em93ZmJvd3pucHphcHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMTc3NDEsImV4cCI6MjA3ODU5Mzc0MX0.ZhJAq0mt3LAamCZlBGux_fwhyQIlOab_0BFsaWubHko';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

window.onload = () => {
    const url = new URLSearchParams(window.location.search);
    if(url.get('search')) { document.getElementById('searchInput').value=url.get('search'); searchEmployee(); }
    else if(url.get('asset_search')) { document.getElementById('assetSearchInput').value=url.get('asset_search'); searchByAsset(); }
    else loadAllComputers();
};

async function loadAllComputers() {
    document.getElementById('stats-summary-box').style.display='grid';
    document.getElementById('results').innerHTML='Loading...';
    const { data, error } = await supabaseClient.from('computers').select(`*, employees(employee_id, name, department, printers(printer_id))`).order('computer_id');
    if(error) return alert(error.message);
    let nb=0, pc=0, use=0, loan=0;
    data.forEach(c => {
        if(c.employees) use++; else if(c.loan_borrower_name) loan++; else c.asset_type==='Notebook'?nb++:pc++;
    });
    document.getElementById('stat-available-notebook').innerText=nb;
    document.getElementById('stat-available-pc').innerText=pc;
    document.getElementById('stat-in-use').innerText=use;
    document.getElementById('stat-loaned').innerText=loan;
    displayComputerSummary(data);
}

function displayComputerSummary(data) {
    let html = `<div class="table-container-card"><table class="summary-table"><thead><tr><th>รหัส</th><th>ประเภท</th><th>สถานะ</th><th>ผู้ใช้/ผู้ยืม</th><th>แผนก</th><th>ปริ้นเตอร์</th><th>หมายเหตุ</th></tr></thead><tbody>`;
    data.forEach(c => {
        let st, usr, dept='-', prn='-', link;
        if(c.employees) {
            st=`<span class="status-badge status-in-use">ใช้งาน</span>`;
            usr=`<b>${c.employees.employee_id}</b> - ${c.employees.name}`;
            dept=c.employees.department||'-';
            prn=c.employees.printers?.map(p=>p.printer_id).join(', ')||'-';
            link=`<a href="#" class="asset-link" onclick="openAssetSummary('${c.computer_id}');return false">${c.computer_id}</a>`;
        } else if(c.loan_borrower_name) {
            st=`<span class="status-badge status-loaned">ถูกยืม</span>`;
            usr=`${c.loan_borrower_name} <button class="btn-return" onclick="returnLoan('${c.computer_id}')"><i class="fas fa-undo"></i> คืน</button>`;
            link=`<a href="#" class="asset-link" onclick="openAssetSummary('${c.computer_id}');return false">${c.computer_id}</a>`;
        } else {
            st=`<span class="status-badge status-available">ว่าง</span>`;
            usr='<span style="color:#ccc">-</span>';
            link=c.asset_type==='Notebook' ? `<a href="#" class="asset-link" onclick="openLoanModal('${c.computer_id}');return false">${c.computer_id}</a>` : `<a href="#" class="asset-link" onclick="openModalForCreate('${c.computer_id}');return false">${c.computer_id}</a>`;
        }
        html+=`<tr><td>${link}</td><td>${c.asset_type||'-'}</td><td>${st}</td><td>${usr}</td><td>${dept}</td><td>${prn}</td><td style="color:#666">${c.remarks||'-'}</td></tr>`;
    });
    document.getElementById('results').innerHTML = html+'</tbody></table></div>';
}

async function openAssetSummary(id) {
    const modal=document.getElementById('assetSummaryModalBackdrop');
    document.getElementById('summaryModalTitle').innerText=`ข้อมูล: ${id}`;
    document.getElementById('assetSummaryContent').innerHTML='Loading...';
    modal.style.display='block';
    const {data:c}=await supabaseClient.from('computers').select(`*, employees(employee_id,name,department,position)`).eq('computer_id',id).single();
    let html=`<div class="summary-group"><h5>เครื่อง</h5><p>Type: ${c.asset_type}</p><p>Spec: ${c.spec}</p><p>ซ่อม: ${c.repair_history||'-'}</p><p>หมายเหตุ: <span style="color:orange">${c.remarks||'-'}</span></p></div>`;
    let btns='';
    if(c.employees) {
        html+=`<div class="summary-group"><h5>ผู้ใช้</h5><p><b>${c.employees.employee_id}</b> - ${c.employees.name}</p></div>`;
        btns=`<button onclick="openModalForEdit('${c.employees.employee_id}')" class="btn-create">แก้ไขผู้ใช้</button>`;
    } else if(c.loan_borrower_name) {
        html+=`<div class="summary-group"><h5>ยืม</h5><p>${c.loan_borrower_name}</p></div>`;
        btns=`<button onclick="returnLoan('${c.computer_id}')" class="btn-return">คืน</button>`;
    } else {
        html+=`<div class="summary-group"><h5>สถานะ: ว่าง</h5></div>`;
        btns=c.asset_type==='Notebook'?`<button onclick="openLoanModal('${c.computer_id}')" class="btn-loan">ยืม</button>`:`<button onclick="openModalForCreate('${c.computer_id}')" class="btn-create">เพิ่มพนักงาน</button>`;
    }
    document.getElementById('assetSummaryContent').innerHTML=html;
    document.getElementById('assetSummaryActions').innerHTML=btns+`<button onclick="closeAssetSummaryModal()" class="btn-cancel">ปิด</button>`;
}

async function handleLoanSubmit() {
    const id=document.getElementById('loanComputerId').value, name=document.getElementById('loanBorrowerName').value, dept=document.getElementById('loanBorrowerDept').value;
    if(!name) return alert('กรอกชื่อ');
    const info = `${name} (${dept}) - Loaned ${new Date().toLocaleDateString('en-US')}`;
    await supabaseClient.from('computers').update({loan_borrower_name:info}).eq('computer_id',id);
    await supabaseClient.from('loan_logs').insert([{computer_id:id, borrower_name:name, borrower_dept:dept, status:'Borrowed'}]);
    alert('ยืมสำเร็จ!'); closeLoanModal(); closeAssetSummaryModal(); loadAllComputers();
}
async function returnLoan(id) {
    if(!confirm(`คืนเครื่อง ${id}?`)) return;
    await supabaseClient.from('computers').update({loan_borrower_name:null}).eq('computer_id',id);
    await supabaseClient.from('loan_logs').update({return_date:new Date().toISOString(), status:'Returned'}).eq('computer_id',id).is('return_date',null);
    alert('คืนสำเร็จ!'); closeAssetSummaryModal(); loadAllComputers();
}
function closeModal(){document.getElementById('modalBackdrop').style.display='none'; closeAssetSummaryModal();}
function openLoanModal(id){document.getElementById('loanForm').reset(); document.getElementById('loanComputerId').value=id; document.getElementById('loanComputerIdDisplay').value=id; document.getElementById('loanModalBackdrop').style.display='block';}
function closeLoanModal(){document.getElementById('loanModalBackdrop').style.display='none'; closeAssetSummaryModal();}
function closeAssetSummaryModal(){document.getElementById('assetSummaryModalBackdrop').style.display='none';}
function goToLoanPage(){window.location.href='loan.html';}
async function populateAssetDropdowns(eid=null){
    const comSel=document.getElementById('formComputer'), prnSel=document.getElementById('formPrinter');
    comSel.innerHTML=prnSel.innerHTML='<option>Loading...</option>';
    const {data:c}=await supabaseClient.from('computers').select('computer_id,user_id,spec,loan_borrower_name');
    const {data:p}=await supabaseClient.from('printers').select('printer_id,user_id,model');
    comSel.innerHTML='<option value="">-</option>';
    c.forEach(x=>{ if((x.user_id===null&&x.loan_borrower_name===null)||x.user_id===eid) comSel.add(new Option(x.computer_id,x.computer_id,false,x.user_id===eid)); });
    prnSel.innerHTML='<option value="">-</option>';
    p.forEach(x=>{ if(x.user_id===null||x.user_id===eid) prnSel.add(new Option(x.printer_id,x.printer_id,false,x.user_id===eid)); });
}
async function openModalForCreate(cid=null){ document.getElementById('employeeForm').reset(); document.getElementById('formMode').value='create'; document.getElementById('formEmployeeId').readOnly=false; await populateAssetDropdowns(); if(cid) document.getElementById('formComputer').value=cid; document.getElementById('modalBackdrop').style.display='block'; }
async function openModalForEdit(eid){
    document.getElementById('employeeForm').reset(); document.getElementById('formMode').value='update'; document.getElementById('editEmployeeId').value=eid; document.getElementById('formEmployeeId').readOnly=true;
    const {data}=await supabaseClient.from('employees').select('*').eq('employee_id',eid).single();
    document.getElementById('formEmployeeId').value=data.employee_id; document.getElementById('formName').value=data.name; document.getElementById('formDepartment').value=data.department; document.getElementById('formPosition').value=data.position; document.getElementById('formEmail').value=data.email; document.getElementById('formUsername').value=data.username; document.getElementById('formDeskPhone').value=data.desk_phone; document.getElementById('formUserShareDrivePath').value=data.user_share_drive_path;
    await populateAssetDropdowns(eid); document.getElementById('modalBackdrop').style.display='block';
}
async function handleSubmit(){
    const mode=document.getElementById('formMode').value, empId=mode==='create'?document.getElementById('formEmployeeId').value:document.getElementById('editEmployeeId').value;
    const data={employee_id:document.getElementById('formEmployeeId').value, name:document.getElementById('formName').value, department:document.getElementById('formDepartment').value, position:document.getElementById('formPosition').value, email:document.getElementById('formEmail').value, username:document.getElementById('formUsername').value, desk_phone:document.getElementById('formDeskPhone').value, user_share_drive_path:document.getElementById('formUserShareDrivePath').value};
    if(mode==='create') await supabaseClient.from('employees').insert([data]); else { delete data.employee_id; await supabaseClient.from('employees').update(data).eq('employee_id',empId); }
    const c=document.getElementById('formComputer').value, p=document.getElementById('formPrinter').value;
    if(c) await supabaseClient.from('computers').update({user_id:empId,loan_borrower_name:null}).eq('computer_id',c);
    if(p) await supabaseClient.from('printers').update({user_id:empId}).eq('printer_id',p);
    alert('Success'); closeModal(); loadAllComputers();
}
async function deleteEmployee(id,n){
    if(confirm(`ลบ ${n}?`)){ await supabaseClient.from('computers').update({user_id:null}).eq('user_id',id); await supabaseClient.from('printers').update({user_id:null}).eq('user_id',id); await supabaseClient.from('employees').delete().eq('employee_id',id); alert('Deleted'); loadAllComputers(); }
}
async function searchEmployee(){
    const v=document.getElementById('searchInput').value; document.getElementById('stats-summary-box').style.display='none';
    const {data}=await supabaseClient.from('employees').select(`*,computers(computer_id,spec),printers(printer_id)`).or(`employee_id.eq.${v},name.ilike.%${v}%`);
    let h=''; data.forEach(e=>{ h+=`<div class="result-item"><div class="result-header"><h4>${e.employee_id} - ${e.name}</h4><div class="header-buttons"><button onclick="openModalForEdit('${e.employee_id}')">แก้</button><button onclick="deleteEmployee('${e.employee_id}','${e.name}')" class="btn-delete">ลบ</button></div></div><div class="result-body"><div class="info-section"><h5>ข้อมูล</h5><p>${e.department}</p></div><div class="info-section"><h5>Asset</h5><p>${e.computers.map(c=>c.computer_id).join(',')}</p></div></div></div>`; });
    document.getElementById('results').innerHTML=h;
}
async function searchByAsset(){/*Logic same as previous, omitted for brevity*/}
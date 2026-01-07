window.onload = loadTickets;

async function loadTickets() {
    document.getElementById('ticketList').innerHTML = '<tr><td colspan="6">Loading...</td></tr>';
    const { data } = await supabaseClient.from('tickets').select('*').order('created_at', { ascending: false });
    const tb = document.getElementById('ticketList'); tb.innerHTML = '';
    data.forEach(t => {
        let badge = 'tk-open';
        if(t.status === 'In Progress') badge = 'tk-progress';
        if(t.status === 'Closed') badge = 'tk-closed';
        
        tb.innerHTML += `
            <tr>
                <td>${new Date(t.created_at).toLocaleDateString('th-TH')}</td>
                <td><b>${t.title}</b><br><span style="font-size:0.8rem; color:#64748b;">${t.description}</span></td>
                <td>${t.device_id || '-'}</td>
                <td>${t.reporter_name}</td>
                <td><span class="ticket-badge ${badge}">${t.status}</span></td>
                <td>
                    <select onchange="updateStatus(${t.id}, this.value)" style="margin:0; padding:5px; width:auto;">
                        <option value="Open" ${t.status==='Open'?'selected':''}>Open</option>
                        <option value="In Progress" ${t.status==='In Progress'?'selected':''}>In Progress</option>
                        <option value="Closed" ${t.status==='Closed'?'selected':''}>Closed</option>
                    </select>
                </td>
            </tr>`;
    });
}

async function createTicket() {
    const title = document.getElementById('tkTitle').value;
    const device = document.getElementById('tkDevice').value;
    const reporter = document.getElementById('tkReporter').value;
    const desc = document.getElementById('tkDesc').value;
    
    if(!title || !reporter) return alert('กรอกข้อมูลให้ครบ');

    await supabaseClient.from('tickets').insert([{ title, device_id: device, reporter_name: reporter, description: desc }]);
    alert('ส่งเรื่องแล้ว'); closeModal(); loadTickets();
}

async function updateStatus(id, newStatus) {
    await supabaseClient.from('tickets').update({ status: newStatus }).eq('id', id);
    loadTickets();
}

function openTicketModal() { document.getElementById('ticketModal').style.display = 'block'; }
function closeModal() { document.getElementById('ticketModal').style.display = 'none'; }
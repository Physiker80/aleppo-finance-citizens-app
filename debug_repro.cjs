
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:4010';

async function run() {
    console.log('--- Debugging 403 Issue ---');

    // 1. Create a ticket (Public)
    console.log('\n1. Creating Public Ticket...');
    const ticketPayload = {
        departmentId: 'cml2j9jgf0000tnaxt5kgq35a', // Ensure this ID exists or use a robust fetch first
        citizenName: 'تجربة مستخدم',
        citizenNationalId: '',
        type: 'شكوى عامة',
        details: 'تفاصيل تجربة رقم 1'
    };
    
    // Fetch departments first to get a valid ID if needed, but assuming hardcoded for now or fetch
    let deptId = 'cml2j9jgf0000tnaxt5kgq35a'; // Fallback
    try {
        const dRes = await fetch(`${BASE_URL}/api/departments`);
        const dJson = await dRes.json();
        if (dJson.departments && dJson.departments.length > 0) {
            deptId = dJson.departments[0].id;
            ticketPayload.departmentId = deptId;
        }
    } catch(e) { console.log('Dept fetch failed', e.message); }

    const res1 = await fetch(`${BASE_URL}/api/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketPayload)
    });
    
    if (!res1.ok) {
        const txt = await res1.text();
        console.log('Create Failed:', res1.status, txt);
        return;
    }
    
    const json1 = await res1.json();
    const ticketId = json1.ticketId || json1.ticket?.id;
    console.log('Ticket Created:', ticketId);

    if (!ticketId) return;

    // 2. Fetch Responses (Public/Guest)
    console.log('\n2. Fetching Responses (Guest)...');
    const res2 = await fetch(`${BASE_URL}/api/tickets/${ticketId}/responses`);
    console.log(`GET /api/tickets/${ticketId}/responses -> Status:`, res2.status);
    if (!res2.ok) {
        console.log('Body:', await res2.text());
    } else {
        console.log('Body:', await res2.json());
    }

    // 3. What if ticket ID is weird?
    console.log('\n3. Fetching Responses (Invalid ID)...');
    const res3 = await fetch(`${BASE_URL}/api/tickets/invalid-id/responses`);
    console.log(`GET (Invalid ID) -> Status:`, res3.status);

}

run().catch(console.error);

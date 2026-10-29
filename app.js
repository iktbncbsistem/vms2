// ==========================================
// 1. INISIALISASI SUPABASE
// ==========================================
const supabaseUrl = 'https://eazdfwzifcsfayapyshv.supabase.co';
const supabaseKey = 'sb_publishable_IVJA3hCseLo_d39XX9RzMg_Nz4p8az2';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null;
let userProfile = null;

// Utility functions untuk DOM
const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);

// ==========================================
// 2. FUNGSI LOG MASUK & PENGESAHAN PERANAN
// ==========================================
async function loginGoogle() {
    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
    });
    if (error) alert("Ralat log masuk Google: " + error.message);
}

window.onload = async function() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        currentUser = session.user;
        semakPeranan();
    }
};

async function semakPeranan() {
    const { data, error } = await supabaseClient
        .from('profil')
        .select('*')
        .eq('id', currentUser.id)
        .single();

    if (data) {
        userProfile = data;
        $('#login-section').classList.add('hidden');
        
        // Sembunyikan semua dashboard dulu
        $('#dashboard-pemohon').classList.add('hidden');
        $('#dashboard-urusetia').classList.add('hidden');
        $('#dashboard-pelulus').classList.add('hidden');

        // Paparkan dashboard mengikut peranan
        if (data.peranan === 'pemohon') {
            $('#dashboard-pemohon').classList.remove('hidden');
            if($('#sumName')) $('#sumName').textContent = data.nama; 
            if($('#applicantName')) $('#applicantName').value = data.nama;
            initBorangPremium(); // Aktifkan fungsi borang
        } else if (data.peranan === 'urusetia') {
            $('#dashboard-urusetia').classList.remove('hidden');
            muatSenaraiUrusetia();
        } else if (data.peranan === 'pelulus') {
            $('#dashboard-pelulus').classList.remove('hidden');
            muatSenaraiPelulus();
        }
    } else {
        alert("Profil tidak dijumpai. Sila pastikan admin telah set peranan anda dalam database.");
    }
}

async function logout() {
    await supabaseClient.auth.signOut();
    location.reload();
}

// ==========================================
// 3. FUNGSI BORANG PREMIUM (PEMOHON)
// ==========================================
function initBorangPremium() {
    const trashIcon = `<svg style="width:16px;height:16px;fill:white;" viewBox="0 0 24 24"><path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z"/></svg>`;

    function updateRowNumbers(tbodyId) {
        $$(`#${tbodyId} tr`).forEach((row, index) => { row.querySelector('.row-num').textContent = index + 1; });
    }

    function addPassengerRow() {
        const tbody = $('#tblPassengers tbody');
        if(!tbody) return;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="row-num" style="text-align:center; font-weight:600; color:#64748b;"></td>
            <td><input type="text" placeholder="Nama penuh"></td>
            <td><input type="text" placeholder="No. K/P"></td>
            <td><input type="tel" placeholder="No. Telefon"></td>
            <td><input type="text" placeholder="Bahagian"></td>
            <td style="text-align:center;"><button type="button" class="btn-delete" title="Padam">${trashIcon}</button></td>
        `;
        tr.querySelector('.btn-delete').addEventListener('click', function() { tr.remove(); updateRowNumbers('tblPassengers tbody'); });
        tbody.appendChild(tr); updateRowNumbers('tblPassengers tbody');
    }

    function addEquipmentRow() {
        const tbody = $('#tblEquipment tbody');
        if(!tbody) return;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="row-num" style="text-align:center; font-weight:600; color:#64748b;"></td>
            <td><input type="text" placeholder="Nama Kelengkapan"></td>
            <td><input type="number" placeholder="Kuantiti"></td>
            <td><input type="text" placeholder="Unit"></td>
            <td><input type="text" placeholder="Catatan"></td>
            <td style="text-align:center;"><button type="button" class="btn-delete" title="Padam">${trashIcon}</button></td>
        `;
        tr.querySelector('.btn-delete').addEventListener('click', function() { tr.remove(); updateRowNumbers('tblEquipment tbody'); });
        tbody.appendChild(tr); updateRowNumbers('tblEquipment tbody');
    }

    // Set baris asas
    if($('#tblPassengers tbody').children.length === 0) {
        for(let i=0; i<3; i++) addPassengerRow();
        for(let i=0; i<2; i++) addEquipmentRow();
    }

    if($('#btnAddPassenger')) $('#btnAddPassenger').addEventListener('click', addPassengerRow);
    if($('#btnAddEquipment')) $('#btnAddEquipment').addEventListener('click', addEquipmentRow);

    if($('#fileUpload')) {
        $('#fileUpload').addEventListener('change', function(e) {
            if(e.target.files.length > 0) {
                $('#fileNameDisplay').textContent = "Fail dipilih: " + e.target.files[0].name;
            }
        });
    }

    function updateSummary() {
        if(!$('#sumName')) return;
        $('#sumName').textContent = $('#applicantName').value.trim() || '-';
        $('#sumDept').textContent = $('#department').value || '-';
        $('#sumPurpose').textContent = $('#purpose').value || '-';
        const tripDate = $('#tripDate').value;
        $('#sumDate').textContent = tripDate ? new Date(tripDate).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
        $('#sumCount').textContent = $('#passengerCount').value ? `${$('#passengerCount').value} orang` : '-';
    }

    ['applicantName', 'department', 'purpose', 'tripDate', 'passengerCount'].forEach(id => {
        if($(`#${id}`)) {
            $(`#${id}`).addEventListener('input', updateSummary);
            $(`#${id}`).addEventListener('change', updateSummary);
        }
    });

    // Penghantaran Borang
    const form = $('#vehicleForm');
    if(form) {
        // Buang listener lama jika ada (mengelakkan duplicate)
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);
        
        $('#vehicleForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const btnSubmit = $('#btnSubmit');
            const originalText = btnSubmit.innerHTML;
            btnSubmit.innerHTML = '⏳ Sedang Menghantar...';
            btnSubmit.disabled = true;

            try {
                const fileUpload = $('#fileUpload').files[0];
                let fileUrl = null;

                if (fileUpload) {
                    const fileExt = fileUpload.name.split('.').pop();
                    const fileName = `surat_${Date.now()}.${fileExt}`;
                    const { error: uploadError } = await supabaseClient.storage.from('dokumen_sokongan').upload(fileName, fileUpload);
                    if (uploadError) throw uploadError;
                    const { data: publicUrlData } = supabaseClient.storage.from('dokumen_sokongan').getPublicUrl(fileName);
                    fileUrl = publicUrlData.publicUrl;
                }

                const passengers = [];
                $$('#tblPassengers tbody tr').forEach(tr => {
                    const inputs = tr.querySelectorAll('input');
                    if(inputs[0].value.trim() !== '') passengers.push({ nama: inputs[0].value, kp: inputs[1].value, telefon: inputs[2].value, bahagian: inputs[3].value });
                });

                const equipments = [];
                $$('#tblEquipment tbody tr').forEach(tr => {
                    const inputs = tr.querySelectorAll('input');
                    if(inputs[0].value.trim() !== '') equipments.push({ nama: inputs[0].value, kuantiti: inputs[1].value, unit: inputs[2].value, catatan: inputs[3].value });
                });

                const driverWaitVal = $('input[name="driver"]:checked').value;

                const { error: insertError } = await supabaseClient.from('tempahan').insert([{
                    id_pemohon: currentUser.id,
                    nama_pemohon: $('#applicantName').value,
                    no_telefon: $('#phone').value,
                    bahagian: $('#department').value,
                    tujuan: $('#purpose').value,
                    tarikh_pergi: $('#tripDate').value,
                    masa_bertolak: $('#departTime').value,
                    masa_balik: $('#returnTime').value,
                    lokasi: $('#location').value,
                    urusan_perjalanan: $('#tripPurpose').value,
                    pemandu_tunggu: driverWaitVal,
                    bilangan_penumpang: $('#passengerCount').value,
                    fail_surat: fileUrl,
                    senarai_penumpang: passengers,
                    senarai_peralatan: equipments,
                    status: 'Menunggu Semakan'
                }]);

                if (insertError) throw insertError;

                alert("Berjaya! Permohonan anda telah selamat dihantar ke Supabase.");
                $('#vehicleForm').reset();
                $('#fileNameDisplay').textContent = '';
                updateSummary();

            } catch (error) {
                console.error(error);
                alert("Ralat semasa menghantar: " + error.message);
            } finally {
                btnSubmit.innerHTML = originalText;
                btnSubmit.disabled = false;
            }
        });
    }
}

// ==========================================
// 4. FUNGSI URUSETIA
// ==========================================
async function muatSenaraiUrusetia() {
    const div = document.getElementById('senarai-tempahan-urusetia');
    div.innerHTML = "Memuatkan data...";

    const { data: tempahan, error } = await supabaseClient
        .from('tempahan')
        .select('*')
        .in('status', ['Menunggu Semakan', 'Lulus']);

    if (error) { div.innerHTML = "Ralat: " + error.message; return; }
    if (tempahan.length === 0) { div.innerHTML = "<p>Tiada tempahan baru.</p>"; return; }

    const { data: kenderaan } = await supabaseClient.from('kenderaan').select('*');

    let html = `<table><tr><th>Pemohon</th><th>Destinasi</th><th>Tarikh</th><th>Status</th><th>Tindakan</th></tr>`;
    
    tempahan.forEach(t => {
        // Pautan surat jika wujud
        const suratLink = t.fail_surat ? `<br><a href="${t.fail_surat}" target="_blank" style="color:blue; font-size:12px;">📄 Lihat Surat</a>` : '';
        
        html += `<tr>
            <td>${t.nama_pemohon || 'Tiada Nama'} <br><small>${t.bahagian || ''}</small>${suratLink}</td>
            <td>${t.lokasi || t.destinasi || ''} <br><small>${t.urusan_perjalanan || t.tujuan || ''}</small></td>
            <td>${t.tarikh_pergi}</td>
            <td><strong>${t.status}</strong></td>
            <td>`;

        if (t.status === 'Menunggu Semakan') {
            html += `<button class="btn btn-outline" onclick="hantarKePelulus(${t.id})">Hantar ke Pelulus</button>`;
        } else if (t.status === 'Lulus') {
            html += `<select id="kenderaan-${t.id}" style="margin-bottom:5px; padding:5px;">
                        <option value="">Pilih Kenderaan...</option>`;
            kenderaan.forEach(k => {
                html += `<option value="${k.id}">${k.no_plat} - ${k.model}</option>`;
            });
            html += `</select><br>
                     <button class="btn btn-success" onclick="agihKenderaan(${t.id})">Agihkan</button>`;
        }
        html += `</td></tr>`;
    });
    html += `</table>`;
    div.innerHTML = html;
}

async function hantarKePelulus(idTempahan) {
    const { error } = await supabaseClient.from('tempahan').update({ status: 'Menunggu Kelulusan' }).eq('id', idTempahan);
    if (!error) { alert("Dihantar kepada Pelulus."); muatSenaraiUrusetia(); }
}

async function agihKenderaan(idTempahan) {
    const idKenderaan = document.getElementById(`kenderaan-${idTempahan}`).value;
    if (!idKenderaan) return alert("Sila pilih kenderaan!");

    const { error } = await supabaseClient.from('tempahan').update({ id_kenderaan: idKenderaan, status: 'Selesai Diagih' }).eq('id', idTempahan);
    if (!error) { alert("Kenderaan berjaya diagihkan!"); muatSenaraiUrusetia(); }
}

// ==========================================
// 5. FUNGSI PELULUS
// ==========================================
async function muatSenaraiPelulus() {
    const div = document.getElementById('senarai-tempahan-pelulus');
    div.innerHTML = "Memuatkan data...";

    const { data: tempahan, error } = await supabaseClient
        .from('tempahan')
        .select('*')
        .eq('status', 'Menunggu Kelulusan');

    if (error) return div.innerHTML = "Ralat: " + error.message;
    if (tempahan.length === 0) return div.innerHTML = "<p>Tiada permohonan untuk diluluskan.</p>";

    let html = `<table><tr><th>Pemohon</th><th>Destinasi</th><th>Tarikh</th><th>Tindakan</th></tr>`;
    tempahan.forEach(t => {
        const suratLink = t.fail_surat ? `<br><a href="${t.fail_surat}" target="_blank" style="color:blue; font-size:12px;">📄 Lihat Surat</a>` : '';
        html += `<tr>
            <td>${t.nama_pemohon || 'Tiada Nama'} <br><small>${t.bahagian || ''}</small>${suratLink}</td>
            <td>${t.lokasi || t.destinasi || ''}</td>
            <td>${t.tarikh_pergi}</td>
            <td>
                <button onclick="sahkanStatus(${t.id}, 'Lulus')" style="background:green; color:white; padding:6px 12px; border:none; border-radius:4px; cursor:pointer;">Lulus</button>
                <button onclick="sahkanStatus(${t.id}, 'Tolak')" style="background:red; color:white; padding:6px 12px; border:none; border-radius:4px; cursor:pointer; margin-left:5px;">Tolak</button>
            </td>
        </tr>`;
    });
    html += `</table>`;
    div.innerHTML = html;
}

async function sahkanStatus(idTempahan, statusBaru) {
    if(!confirm(`Adakah anda pasti untuk ${statusBaru} permohonan ini?`)) return;
    const { error } = await supabaseClient.from('tempahan').update({ status: statusBaru }).eq('id', idTempahan);
    if (!error) { alert("Permohonan telah di" + statusBaru.toLowerCase()); muatSenaraiPelulus(); }
}

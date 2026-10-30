// GUNA KUNCI SUPABASE BOS
const supabaseUrl = 'https://eazdfwzifcsfayapyshv.supabase.co';
const supabaseKey = 'sb_publishable_IVJA3hCseLo_d39XX9RzMg_Nz4p8az2';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null;
let cacheUrusetia = []; // Untuk simpan data permohonan modal

// Utility tambah baris jadual pemohon
function tambahBaris(tableId) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    const tr = tbody.querySelector('tr').cloneNode(true);
    tr.querySelectorAll('input').forEach(input => input.value = '');
    tbody.appendChild(tr);
}

// ==========================================
// PENGURUSAN SESI LOG MASUK & PERANAN
// ==========================================
async function loginGoogle() {
    await supabaseClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
}

async function logout() {
    await supabaseClient.auth.signOut();
    location.reload();
}

window.onload = async function() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        currentUser = session.user;
        document.getElementById('btnLogout').classList.remove('hidden');
        semakPeranan();
    }
};

async function semakPeranan() {
    const { data, error } = await supabaseClient.from('profil').select('peranan, nama').eq('id', currentUser.id).single();
    if (data) {
        document.getElementById('login-section').classList.add('hidden');
        if (data.peranan === 'pemohon') {
            document.getElementById('dashboard-pemohon').classList.remove('hidden');
            document.getElementById('applicantName').value = data.nama;
        } else if (data.peranan === 'urusetia') {
            document.getElementById('dashboard-urusetia').classList.remove('hidden');
            muatSenaraiUrusetia();
        } else if (data.peranan === 'pelulus') {
            document.getElementById('dashboard-pelulus').classList.remove('hidden');
            muatSenaraiPelulus();
        }
    } else {
        alert("Profil anda tiada dalam pangkalan data. Sila hubungi Admin.");
    }
}

// ==========================================
// PEMOHON: HANTAR BORANG KE SUPABASE
// ==========================================
const vehicleForm = document.getElementById('vehicleForm');
if(vehicleForm) {
    vehicleForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const btnSubmit = document.getElementById('btnSubmit');
        const originalText = btnSubmit.innerHTML;
        btnSubmit.innerHTML = '⏳ Menghantar...';
        btnSubmit.disabled = true;

        try {
            // Upload Fail Surat
            const fileUpload = document.getElementById('fileUpload').files[0];
            let fileUrl = null;
            if (fileUpload) {
                const fileName = `surat_${Date.now()}.${fileUpload.name.split('.').pop()}`;
                const { error: uploadError } = await supabaseClient.storage.from('dokumen_sokongan').upload(fileName, fileUpload);
                if (uploadError) throw uploadError;
                fileUrl = supabaseClient.storage.from('dokumen_sokongan').getPublicUrl(fileName).data.publicUrl;
            }

            // Kumpul Data Penumpang & Peralatan (JSON)
            const passengers = [];
            document.querySelectorAll('#tblPassengers tbody tr').forEach(tr => {
                const inputs = tr.querySelectorAll('input');
                if (inputs[0].value.trim()) passengers.push({ nama: inputs[0].value, kp: inputs[1].value, bahagian: inputs[2].value });
            });
            const equipments = [];
            document.querySelectorAll('#tblEquipment tbody tr').forEach(tr => {
                const inputs = tr.querySelectorAll('input');
                if (inputs[0].value.trim()) equipments.push({ nama: inputs[0].value, kuantiti: inputs[1].value, catatan: inputs[2].value });
            });

            // Hantar ke Database
            const { error: insertError } = await supabaseClient.from('tempahan').insert([{
                id_pemohon: currentUser.id,
                nama_pemohon: document.getElementById('applicantName').value,
                no_telefon: document.getElementById('phone').value,
                bahagian: document.getElementById('department').value,
                tujuan: document.getElementById('purpose').value,
                destinasi: document.getElementById('location').value,
                lokasi: document.getElementById('location').value, // backup column
                tarikh_pergi: document.getElementById('tripDate').value,
                tarikh_balik: document.getElementById('tripDate').value,
                masa_bertolak: document.getElementById('departTime').value,
                masa_balik: document.getElementById('returnTime').value,
                fail_surat: fileUrl,
                senarai_penumpang: passengers,
                senarai_peralatan: equipments,
                status: 'Menunggu Semakan'
            }]);

            if (insertError) throw insertError;
            alert("Permohonan berjaya dihantar!");
            vehicleForm.reset();

        } catch (error) {
            alert("Ralat menghantar permohonan: " + error.message);
        } finally {
            btnSubmit.innerHTML = originalText;
            btnSubmit.disabled = false;
        }
    });
}

// ==========================================
// URUSETIA: PAPAR & AGIH KENDERAAN
// ==========================================
async function muatSenaraiUrusetia() {
    const div = document.getElementById('senarai-tempahan-urusetia');
    div.innerHTML = "Memuatkan data...";

    const { data: tempahan, error } = await supabaseClient.from('tempahan').select('*').in('status', ['Menunggu Semakan', 'Lulus']).order('id', {ascending: false});
    if (error) return div.innerHTML = "Ralat: " + error.message;
    if (!tempahan || tempahan.length === 0) return div.innerHTML = "<p>Tiada permohonan baharu.</p>";

    cacheUrusetia = tempahan; // Simpan untuk modal
    const { data: kenderaanList } = await supabaseClient.from('kenderaan').select('*');

    let html = `<table><tr><th>Pemohon & Lokasi</th><th>Tarikh Perjalanan</th><th>Status</th><th>Tindakan Urusetia</th></tr>`;
    
    tempahan.forEach((t, index) => {
        html += `<tr>
            <td><strong>${t.nama_pemohon}</strong><br><small>${t.destinasi || t.lokasi}</small></td>
            <td>${t.tarikh_pergi}</td>
            <td><strong style="color:var(--primary);">${t.status}</strong></td>
            <td>
                <button class="btn btn-light" onclick="paparButiran(${index})" style="margin-bottom:5px;">🔍 Butiran Penuh</button><br>
        `;

        if (t.status === 'Menunggu Semakan') {
            html += `<button class="btn btn-primary" onclick="updateStatus(${t.id}, 'Menunggu Kelulusan')">Hantar ke Pelulus</button>`;
        } else if (t.status === 'Lulus') {
            html += `<select id="kenderaan-${t.id}" style="margin-bottom:5px;">
                        <option value="">-- Pilih Kenderaan --</option>`;
            kenderaanList.forEach(k => html += `<option value="${k.id}">${k.no_plat} - ${k.model}</option>`);
            html += `</select><br><button class="btn btn-success" onclick="agihKenderaan(${t.id})">Sahkan Agihan</button>`;
        }
        html += `</td></tr>`;
    });
    div.innerHTML = html + `</table>`;
}

function paparButiran(index) {
    const t = cacheUrusetia[index];
    const failHtml = t.fail_surat ? `<a href="${t.fail_surat}" target="_blank" style="color:blue;">📎 Muat Turun Surat Rasmi</a>` : 'Tiada fail dilampirkan.';
    
    document.getElementById('isiModalUrusetia').innerHTML = `
        <p><strong>Nama:</strong> ${t.nama_pemohon} (${t.no_telefon})</p>
        <p><strong>Destinasi:</strong> ${t.destinasi || t.lokasi}</p>
        <p><strong>Masa Bertolak:</strong> ${t.masa_bertolak}</p>
        <p><strong>Dokumen:</strong> ${failHtml}</p>
        <hr style="border:1px solid #eee; margin:15px 0;">
        <p><strong>Senarai Penumpang:</strong><br><pre style="font-family:inherit; background:#f4f7f6; padding:10px;">${JSON.stringify(t.senarai_penumpang, null, 2)}</pre></p>
    `;
    document.getElementById('modalUrusetia').classList.remove('hidden');
}

async function agihKenderaan(id) {
    const idK = document.getElementById(`kenderaan-${id}`).value;
    if (!idK) return alert("Sila pilih kenderaan.");
    await supabaseClient.from('tempahan').update({ id_kenderaan: idK, status: 'Selesai Diagih' }).eq('id', id);
    alert("Berjaya diagihkan!"); muatSenaraiUrusetia();
}

// ==========================================
// PELULUS: LULUS ATAU TOLAK
// ==========================================
async function muatSenaraiPelulus() {
    const div = document.getElementById('senarai-tempahan-pelulus');
    const { data: tempahan } = await supabaseClient.from('tempahan').select('*').eq('status', 'Menunggu Kelulusan');
    if (!tempahan || tempahan.length === 0) return div.innerHTML = "<p>Tiada kelulusan diperlukan.</p>";

    let html = `<table><tr><th>Pemohon & Destinasi</th><th>Tarikh</th><th>Tindakan</th></tr>`;
    tempahan.forEach(t => {
        html += `<tr>
            <td><strong>${t.nama_pemohon}</strong><br><small>${t.destinasi || t.lokasi}</small></td>
            <td>${t.tarikh_pergi}</td>
            <td>
                <button class="btn btn-success" onclick="updateStatus(${t.id}, 'Lulus')">Lulus</button>
                <button class="btn btn-danger" onclick="updateStatus(${t.id}, 'Tolak')">Tolak</button>
            </td>
        </tr>`;
    });
    div.innerHTML = html + `</table>`;
}

async function updateStatus(id, statusBaru) {
    if(!confirm(`Pasti untuk ${statusBaru} permohonan ini?`)) return;
    await supabaseClient.from('tempahan').update({ status: statusBaru }).eq('id', id);
    alert(`Permohonan dikemas kini kepada: ${statusBaru}`);
    if(currentUser) semakPeranan(); // Refresh dashboard masing-masing
}

// ==========================================
// FUNGSI SEJARAH PEMOHON
// ==========================================
async function muatSejarahPemohon() {
    const tbody = document.getElementById('isiSejarahPemohon');
    if(!tbody) return;

    // Tarik data hanya untuk pengguna yang sedang log masuk
    const { data: sejarah, error } = await supabaseClient
        .from('tempahan')
        .select('id, tarikh_pergi, destinasi, lokasi, status')
        .eq('id_pemohon', currentUser.id)
        .order('id', { ascending: false });

    if (error) { tbody.innerHTML = `<tr><td colspan="4" style="color:red;">Ralat: ${error.message}</td></tr>`; return; }
    if (!sejarah || sejarah.length === 0) { tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Tiada rekod permohonan setakat ini. Sila isi borang di bawah untuk permohonan baharu.</td></tr>`; return; }

    let html = '';
    sejarah.forEach(t => {
        let badge = ``;
        // Warna label status ikut keadaan
        if(t.status === 'Menunggu Semakan') badge = `<span style="background:#fef3c7; color:#92400e; padding:4px 10px; border-radius:12px; font-size:12px; font-weight:600;">Menunggu Semakan</span>`;
        else if(t.status === 'Menunggu Kelulusan') badge = `<span style="background:#e0e7ff; color:#3730a3; padding:4px 10px; border-radius:12px; font-size:12px; font-weight:600;">Menunggu Kelulusan</span>`;
        else if(t.status === 'Lulus') badge = `<span style="background:#dcfce7; color:#15803d; padding:4px 10px; border-radius:12px; font-size:12px; font-weight:600;">Lulus</span>`;
        else if(t.status === 'Tolak') badge = `<span style="background:#fee2e2; color:#b91c1c; padding:4px 10px; border-radius:12px; font-size:12px; font-weight:600;">Ditolak</span>`;
        else if(t.status === 'Selesai Diagih') badge = `<span style="background:#dcfce7; color:#15803d; padding:4px 10px; border-radius:12px; font-size:12px; font-weight:600;">Kenderaan Diagih</span>`;
        else badge = `<span>${t.status}</span>`;

        // Format nombor rujukan cth: VMS-0045
        const noRujukan = `VMS-${t.id.toString().padStart(4, '0')}`;

        html += `<tr>
            <td><strong>${noRujukan}</strong></td>
            <td>${t.destinasi || t.lokasi || '-'}</td>
            <td>${t.tarikh_pergi}</td>
            <td style="text-align: right;">${badge}</td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

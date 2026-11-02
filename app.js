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
            muatSejarahPemohon();
        } 
        
        else if (data.peranan === 'urusetia') {
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
            muatSejarahPemohon();

        } catch (error) {
            alert("Ralat menghantar permohonan: " + error.message);
        } finally {
            btnSubmit.innerHTML = originalText;
            btnSubmit.disabled = false;
        }
    });
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
        else if(t.status === 'Selesai Diagih') badge = `<span style="background:#dcfce7; color:#

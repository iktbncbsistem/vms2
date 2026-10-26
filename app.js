// GUNA URL & KEY BOSS SENDIRI (Dari gambar yang boss tunjuk tadi)
const supabaseUrl = 'https://eazdfwzifcsfayapyshv.supabase.co';
const supabaseKey = 'sb_publishable_IVJA3hCseLo_d39XX9RzMg_Nz4p8az2';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null;
let userProfile = null;

// Fungsi Log Masuk
async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        alert("Ralat log masuk: " + error.message);
    } else {
        currentUser = data.user;
        semakPeranan();
    }
}

// Fungsi Semak Peranan & Tunjuk Dashboard
async function semakPeranan() {
    const { data, error } = await supabase
        .from('profil')
        .select('*')
        .eq('id', currentUser.id)
        .single();

    if (data) {
        userProfile = data;
        document.getElementById('login-section').classList.add('hidden');
        
        // Sembunyikan semua dashboard dulu
        document.getElementById('dashboard-pemohon').classList.add('hidden');
        document.getElementById('dashboard-urusetia').classList.add('hidden');
        document.getElementById('dashboard-pelulus').classList.add('hidden');

        if (data.peranan === 'pemohon') {
            document.getElementById('dashboard-pemohon').classList.remove('hidden');
            document.getElementById('nama-pemohon').innerText = data.nama;
        } else if (data.peranan === 'urusetia') {
            document.getElementById('dashboard-urusetia').classList.remove('hidden');
            muatSenaraiUrusetia();
        } else if (data.peranan === 'pelulus') {
            document.getElementById('dashboard-pelulus').classList.remove('hidden');
            muatSenaraiPelulus();
        }
    } else {
        alert("Profil tidak dijumpai. Sila pastikan admin telah set peranan anda dalam database.");
    }
}

// ================= FUNGSI PEMOHON =================
async function hantarTempahan(e) {
    e.preventDefault();
    const destinasi = document.getElementById('destinasi').value;
    const tujuan = document.getElementById('tujuan').value;
    const tarikh_pergi = document.getElementById('tarikh_pergi').value;
    const tarikh_balik = document.getElementById('tarikh_balik').value;

    const { error } = await supabase.from('tempahan').insert([
        { id_pemohon: currentUser.id, destinasi, tujuan, tarikh_pergi, tarikh_balik }
    ]);

    if (error) alert("Gagal: " + error.message);
    else {
        alert("Tempahan dihantar! Status: Menunggu Semakan.");
        document.getElementById('form-tempahan').reset();
    }
}

// ================= FUNGSI URUSETIA =================
async function muatSenaraiUrusetia() {
    const div = document.getElementById('senarai-tempahan-urusetia');
    div.innerHTML = "Memuatkan data...";

    // Ambil tempahan yang belum disemak ATAU yang dah lulus (untuk agih kenderaan)
    const { data: tempahan, error } = await supabase
        .from('tempahan')
        .select('*, profil(nama)')
        .in('status', ['Menunggu Semakan', 'Lulus']);

    if (error) {
        div.innerHTML = "Ralat: " + error.message;
        return;
    }

    if (tempahan.length === 0) {
        div.innerHTML = "<p>Tiada tempahan baru.</p>";
        return;
    }

    // Ambil senarai kenderaan
    const { data: kenderaan } = await supabase.from('kenderaan').select('*');

    let html = `<table><tr><th>Pemohon</th><th>Destinasi</th><th>Tarikh</th><th>Status</th><th>Tindakan</th></tr>`;
    
    tempahan.forEach(t => {
        html += `<tr>
            <td>${t.profil.nama}</td>
            <td>${t.destinasi} (${t.tujuan})</td>
            <td>${t.tarikh_pergi} hingga ${t.tarikh_balik}</td>
            <td><strong>${t.status}</strong></td>
            <td>`;

        if (t.status === 'Menunggu Semakan') {
            html += `<button onclick="hantarKePelulus(${t.id})">Hantar ke Pelulus</button>`;
        } else if (t.status === 'Lulus') {
            // Dropdown untuk pilih kenderaan
            html += `<select id="kenderaan-${t.id}">
                        <option value="">Pilih Kenderaan...</option>`;
            kenderaan.forEach(k => {
                html += `<option value="${k.id}">${k.no_plat} - ${k.model}</option>`;
            });
            html += `</select>
                     <button onclick="agihKenderaan(${t.id})">Agihkan</button>`;
        }
        
        html += `</td></tr>`;
    });
    html += `</table>`;
    div.innerHTML = html;
}

async function hantarKePelulus(idTempahan) {
    const { error } = await supabase
        .from('tempahan')
        .update({ status: 'Menunggu Kelulusan' })
        .eq('id', idTempahan);
    
    if (!error) {
        alert("Dihantar kepada Pelulus.");
        muatSenaraiUrusetia(); // Refresh jadual
    }
}

async function agihKenderaan(idTempahan) {
    const idKenderaan = document.getElementById(`kenderaan-${idTempahan}`).value;
    if (!idKenderaan) return alert("Sila pilih kenderaan!");

    const { error } = await supabase
        .from('tempahan')
        .update({ id_kenderaan: idKenderaan, status: 'Selesai Diagih' })
        .eq('id', idTempahan);
    
    if (!error) {
        alert("Kenderaan berjaya diagihkan!");
        muatSenaraiUrusetia();
    }
}

// ================= FUNGSI PELULUS =================
async function muatSenaraiPelulus() {
    const div = document.getElementById('senarai-tempahan-pelulus');
    div.innerHTML = "Memuatkan data...";

    const { data: tempahan, error } = await supabase
        .from('tempahan')
        .select('*, profil(nama)')
        .eq('status', 'Menunggu Kelulusan');

    if (error) return div.innerHTML = "Ralat: " + error.message;
    if (tempahan.length === 0) return div.innerHTML = "<p>Tiada permohonan untuk diluluskan.</p>";

    let html = `<table><tr><th>Pemohon</th><th>Destinasi</th><th>Tarikh</th><th>Tindakan</th></tr>`;
    tempahan.forEach(t => {
        html += `<tr>
            <td>${t.profil.nama}</td>
            <td>${t.destinasi}</td>
            <td>${t.tarikh_pergi} hingga ${t.tarikh_balik}</td>
            <td>
                <button onclick="sahkanStatus(${t.id}, 'Lulus')" style="background:green">Lulus</button>
                <button onclick="sahkanStatus(${t.id}, 'Tolak')" style="background:red">Tolak</button>
            </td>
        </tr>`;
    });
    html += `</table>`;
    div.innerHTML = html;
}

async function sahkanStatus(idTempahan, statusBaru) {
    const { error } = await supabase
        .from('tempahan')
        .update({ status: statusBaru })
        .eq('id', idTempahan);
    
    if (!error) {
        alert("Permohonan telah di" + statusBaru.toLowerCase());
        muatSenaraiPelulus();
    }
}

// ================= UMUM =================
async function logout() {
    await supabase.auth.signOut();
    location.reload();
}

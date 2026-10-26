// Inisialisasi Supabase
const supabaseUrl = 'https://eazdfwzifcsfayapyshv.supabase.co';
const supabaseKey = 'sb_publishable_IVJA3hCseLo_d39XX9RzMg_Nz4p8az2';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null;
let userProfile = null;

// Fungsi Log Masuk
async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        alert("Ralat log masuk: " + error.message);
    } else {
        currentUser = data.user;
        semakPeranan();
    }
}

// Fungsi Semak Peranan (Pemohon, Urusetia, Pelulus)
async function semakPeranan() {
    const { data, error } = await supabase
        .from('profil')
        .select('*')
        .eq('id', currentUser.id)
        .single();

    if (data) {
        userProfile = data;
        document.getElementById('login-section').classList.add('hidden');

        // Buka dashboard ikut peranan
        if (data.peranan === 'pemohon') {
            document.getElementById('dashboard-pemohon').classList.remove('hidden');
            document.getElementById('nama-pemohon').innerText = data.nama;
        } else if (data.peranan === 'urusetia') {
            document.getElementById('dashboard-urusetia').classList.remove('hidden');
        }
        // Tambah logik untuk pelulus dan pemandu di sini kelak
    }
}

// Fungsi Hantar Tempahan (Untuk Pemohon)
async function hantarTempahan(e) {
    e.preventDefault();

    const destinasi = document.getElementById('destinasi').value;
    const tujuan = document.getElementById('tujuan').value;
    const tarikh_pergi = document.getElementById('tarikh_pergi').value;
    const tarikh_balik = document.getElementById('tarikh_balik').value;

    const { data, error } = await supabase
        .from('tempahan')
        .insert([
            { 
                id_pemohon: currentUser.id, 
                destinasi: destinasi, 
                tujuan: tujuan, 
                tarikh_pergi: tarikh_pergi, 
                tarikh_balik: tarikh_balik 
            }
        ]);

    if (error) {
        alert("Gagal hantar tempahan.");
    } else {
        alert("Tempahan berjaya dihantar! Status: Menunggu Semakan Urusetia.");
        document.getElementById('form-tempahan').reset();
    }
}

// Fungsi Log Keluar
async function logout() {
    await supabase.auth.signOut();
    location.reload(); // Refresh muka surat
}

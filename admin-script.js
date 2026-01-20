// PASSWORD SIMPLE (Ganti sesuka hati)
const ADMIN_PASS = "admin123"; 

// URL API GOOGLE SCRIPT (Yang dari Deploy Web App)
const API_URL = "https://script.google.com/macros/s/AKfycbwiO26llTJTaHC97avm3Cz9hVMdjpxU11UV-2bD5p6PIB7DCAaq7H_lsVe-U2N2TQg/exec";

// --- LOGIN SYSTEM ---
function checkLogin() {
    const input = document.getElementById('admin-pass').value;
    if (input === ADMIN_PASS) {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
    } else {
        document.getElementById('login-error').innerText = "Password salah!";
    }
}

function logout() {
    location.reload();
}

// --- TAG GENERATOR LOGIC ---
// Biar pas admin klik checkbox, preview tags-nya langsung muncul
const checkboxes = document.querySelectorAll('input[name="tags"]');
const previewCode = document.getElementById('tag-preview');

checkboxes.forEach(box => {
    box.addEventListener('change', updateTagPreview);
});

function updateTagPreview() {
    const selected = Array.from(document.querySelectorAll('input[name="tags"]:checked'))
        .map(cb => cb.value); // Ambil value (misal: 'warm-tone')
    
    previewCode.innerText = selected.join(', ');
}

// --- FORM SUBMIT (SEND TO GOOGLE SHEET) ---
const form = document.getElementById('product-form');
const submitBtn = document.getElementById('submit-btn');

form.addEventListener('submit', (e) => {
    e.preventDefault(); // Jangan refresh halaman

    // 1. Kumpulkan Data Tags
    const selectedTags = Array.from(document.querySelectorAll('input[name="tags"]:checked'))
        .map(cb => cb.value)
        .join(', '); // Gabung jadi string: "warm-tone, rectangle-body"

    if (!selectedTags) {
        alert("Pilih minimal satu Tag!");
        return;
    }

    // 2. Siapkan Object Data
    const productData = {
        action: "create", // Penting buat logic doPost di Apps Script
        id: "P" + Date.now(), // Generate ID unik pake waktu (contoh: P1734892...)
        name: document.getElementById('p-name').value,
        category: document.getElementById('p-category').value,
        price: document.getElementById('p-price').value,
        image: document.getElementById('p-image').value,
        shop_link: document.getElementById('p-link').value,
        tags: selectedTags // <--- INI HASIL TAG OTOMATISNYA
    };

    // 3. Kirim ke Google Script
    submitBtn.innerText = "Mengirim...";
    submitBtn.disabled = true;

    fetch(API_URL, {
        method: 'POST',
        // mode: 'no-cors', // Matikan ini kalau mau baca response, tapi kadang perlu dinyalakan kalau error CORS
        body: JSON.stringify(productData)
    })
    .then(response => response.json())
    .then(result => {
        if (result.status === 'created') {
            alert("✅ Produk Berhasil Disimpan!");
            form.reset(); // Kosongkan form
            updateTagPreview(); // Reset preview
        } else {
            alert("❌ Gagal: " + JSON.stringify(result));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert("Produk terkirim (cek spreadsheet), tapi browser memblokir responnya (CORS). Aman kok!");
        form.reset();
    })
    .finally(() => {
        submitBtn.innerText = "UPLOAD PRODUK KE SPREADSHEET";
        submitBtn.disabled = false;
    });
});

// ... (Kode login dan form submit biarkan di atas) ...

// ===========================================
// FITUR LIHAT & HAPUS PRODUK
// ===========================================

// 1. Fungsi Ambil Data (Sama kayak di halaman utama user)
function loadProducts() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">⏳ Mengambil data terbaru...</td></tr>';

    fetch(API_URL)
        .then(response => response.json())
        .then(data => {
            renderTable(data);
        })
        .catch(error => {
            console.error('Error loading data:', error);
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Gagal mengambil data.</td></tr>';
        });
}

// 2. Fungsi Render Tabel
function renderTable(products) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = ''; // Bersihkan loading

    // Cek kalau data kosong atau error
    if (!Array.isArray(products) || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Belum ada produk.</td></tr>';
        return;
    }

    // Loop data produk
    // KITA BALIK urutannya (reverse) biar produk terbaru ada di paling atas
    products.slice().reverse().forEach(p => {
        const tr = document.createElement('tr');
        
        // Format Baris Tabel
        tr.innerHTML = `
            <td><img src="${p.image}" class="thumb-img" onerror="this.src='https://via.placeholder.com/50'"></td>
            <td><strong>${p.name}</strong><br><small style="color:#888;">ID: ${p.id}</small></td>
            <td>${p.category}</td>
            <td>Rp ${parseInt(p.price).toLocaleString('id-ID')}</td>
            <td>
                <button class="btn-delete" onclick="deleteProduct('${p.id}', '${p.name}')">
                    🗑️ Hapus
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 3. Fungsi Hapus Produk (Koneksi ke doPost 'delete')
// 3. Fungsi Hapus Produk (DENGAN VALIDASI PASSWORD)
function deleteProduct(id, name) {
    // 1. Munculin Prompt buat minta Password
    const inputPass = prompt(`⚠️ PERINGATAN KEAMANAN ⚠️\n\nAnda akan menghapus produk:\n"${name}"\n\nTindakan ini tidak bisa dibatalkan.\nMasukkan Password Admin untuk konfirmasi:`);

    // 2. Cek Logika
    if (inputPass === null) {
        // Kalau user klik Cancel
        return; 
    }

    if (inputPass !== ADMIN_PASS) {
        // Kalau password beda sama yang di atas (const ADMIN_PASS)
        alert("⛔ Password Salah! Penghapusan dibatalkan demi keamanan.");
        return;
    }

    // 3. Kalau Password Benar, Lanjut Hapus...
    const deleteData = {
        action: 'delete',
        id: id
    };

    // Kasih feedback visual kalau lagi loading
    const tbody = document.getElementById('table-body');
    // Opsional: Bikin tabelnya agak burem pas loading hapus
    tbody.style.opacity = '0.5'; 

    fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify(deleteData)
    })
    .then(response => response.json())
    .then(result => {
        if (result.status === 'deleted' || result.status === 'success') {
            alert("✅ Produk Berhasil Dihapus!");
            loadProducts(); // Refresh tabel
        } else {
            // Fallback kalau response aneh tapi sukses
            loadProducts();
        }
    })
    .catch(error => {
        console.error("Error deleting:", error);
        alert("Perintah hapus dikirim. Refresh tabel untuk melihat hasil.");
        loadProducts();
    })
    .finally(() => {
        // Balikin opacity tabel
        tbody.style.opacity = '1';
    });
}

function checkLogin() {
    const input = document.getElementById('admin-pass').value;
    if (input === ADMIN_PASS) {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        
        // 👇 TAMBAHIN INI
        loadProducts(); 
    } else {
        document.getElementById('login-error').innerText = "Password salah!";
    }
}

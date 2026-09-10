// ==========================================
// إعدادات قاعدة البيانات
// ==========================================
const URL = "https://xcdfzfeezdmgwzdmulrv.supabase.co";
const KEY = "sb_publishable_1dvVf-7uEHl7VaOntKLyfA_sK7VK3bi";
const db = supabase.createClient(URL, KEY);
const ADMIN_PASS = "20012001";

// ==========================================
// البيانات الأساسية
// ==========================================
const cats = [
  "الكل", "مطاعم", "اسواق", "ملابس", "اكسسوارات", 
  "تلفونات", "اجهزة الكترونية", "بايسلات", "مواد انشائية", 
  "اقمشة", "اجهزة منزلية"
];

const cities = [
  "كربلاء المقدسة", "بغداد", "النجف الأشرف", "بابل", "الديوانية", 
  "واسط", "البصرة", "أربيل", "الموصل", "جميع المحافظات"
];

let allProducts = [], activeCat = "الكل", isAdmin = false;
let selectedImageFile = null;

// ==========================================
// دوال مساعدة
// ==========================================
const esc = x => String(x ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

const formatPrice = x => {
  if (!x || x === "0") return "💰 تواصل معنا للسعر";
  return Number(x).toLocaleString("ar-IQ") + " دينار";
};

function getCatIcon(cat) {
  const icons = {
    "مطاعم": "🍽️", "اسواق": "🛒", "ملابس": "👗", "اكسسوارات": "💎",
    "تلفونات": "📱", "اجهزة الكترونية": "💻", "بايسلات": "🚲", "مواد انشائية": "🏗️",
    "اقمشة": "🧵", "اجهزة منزلية": "🏠"
  };
  return icons[cat] || "📦";
}

// ==========================================
// معاينة الصورة المختارة
// ==========================================
document.addEventListener("DOMContentLoaded", function() {
  const imageInput = document.getElementById("productImageFile");
  const previewImg = document.getElementById("imagePreview");
  
  if (imageInput) {
    imageInput.addEventListener("change", function(e) {
      selectedImageFile = e.target.files[0];
      if (selectedImageFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
          previewImg.src = e.target.result;
          previewImg.style.display = "block";
        };
        reader.readAsDataURL(selectedImageFile);
      } else {
        previewImg.style.display = "none";
        selectedImageFile = null;
      }
    });
  }
});

// ==========================================
// رفع الصورة إلى التخزين
// ==========================================
async function uploadProductImage(file) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(6)}.${fileExt}`;
  
  const { data, error } = await db.storage
    .from('products')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });
  
  if (error) throw error;
  
  const { data: { publicUrl } } = db.storage
    .from('products')
    .getPublicUrl(fileName);
    
  return publicUrl;
}

// ==========================================
// بناء واجهة التصنيفات
// ==========================================
function renderCategories() {
  const container = document.getElementById("categories");
  container.innerHTML = cats.map(cat => `
    <button class="category-btn ${activeCat === cat ? "active" : ""}" 
            onclick="switchCategory('${cat}')">
      ${cat === "الكل" ? "🏠" : getCatIcon(cat)} ${cat}
    </button>
  `).join("");
  
  document.getElementById("productCategory").innerHTML = cats.slice(1).map(c => `<option>${c}</option>`).join("");
  document.getElementById("productCity").innerHTML = cities.map(c => `<option>${c}</option>`).join("");
}

function switchCategory(cat) {
  activeCat = cat;
  renderCategories();
  renderProducts();
}

// ==========================================
// عرض المنتجات
// ==========================================
function renderProducts() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase().trim();
  
  const filtered = allProducts.filter(p => {
    const matchCat = activeCat === "الكل" || p.category === activeCat;
    const matchSearch = !searchTerm || 
      p.name.toLowerCase().includes(searchTerm) ||
      (p.description || "").toLowerCase().includes(searchTerm) ||
      p.city.toLowerCase().includes(searchTerm);
    return matchCat && matchSearch;
  });

  const container = document.getElementById("productsContainer");
  
  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>لا توجد منتجات متاحة</h3>
        <p>حاول تغيير التصنيف أو كلمة البحث</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(p => `
    <div class="product-card">
      <div class="product-image-wrapper">
        <img src="${esc(p.image_url || "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=500&h=400&fit=crop")}" 
             alt="${esc(p.name)}" loading="lazy">
        <div class="product-city">📍 ${esc(p.city)}</div>
      </div>
      <div class="product-content">
        <h3 class="product-name">${esc(p.name)}</h3>
        <div class="product-price">${formatPrice(p.price)}</div>
        <div class="product-meta">
          <span class="category-tag">${getCatIcon(p.category)} ${esc(p.category)}</span>
        </div>
        ${p.description ? `<p class="product-desc">${esc(p.description.substring(0, 45))}${p.description.length > 45 ? "..." : ""}</p>` : ""}
        <div class="product-actions">
          <a href="tel:${esc(p.phone)}" class="btn call-btn">📞 اتصال مباشر</a>
          <a href="https://wa.me/${String(p.phone).replace(/\D/g, "")}" target="_blank" class="btn whatsapp-btn">💬 واتساب</a>
        </div>
      </div>
    </div>
  `).join("");
}

// ==========================================
// تحميل البيانات من قاعدة البيانات
// ==========================================
async function loadProducts() {
  const container = document.getElementById("productsContainer");
  container.innerHTML = `
    <div class="loading-state">
      <div class="loader"></div>
      <p>جاري تحميل المنتجات...</p>
    </div>
  `;

  const { data, error } = await db
    .from("products")
    .select("*")
    .eq("approved", true)
    .order("created_at", { ascending: false });

  if (error) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>خطأ في التحميل</h3>
        <p>${error.message}</p>
        <button onclick="loadProducts()" class="submit-btn mt-3">إعادة المحاولة</button>
      </div>
    `;
    return;
  }

  allProducts = data || [];
  renderProducts();
  loadPendingProducts();
}

// ==========================================
// لوحة تحكم المدير
// ==========================================
async function loadPendingProducts() {
  if (!isAdmin) return;
  
  const { data, error } = await db
    .from("products")
    .select("*")
    .eq("approved", false)
    .order("created_at", { ascending: false });

  const list = document.getElementById("pendingList");
  
  if (!data || !data.length) {
    list.innerHTML = `<p class="no-pending">✅ لا توجد منتجات بانتظار الموافقة</p>`;
    return;
  }

  list.innerHTML = data.map(p => `
    <div class="pending-item">
      <img src="${esc(p.image_url || "https://via.placeholder.com/60x60/e5e7eb/6b7280?text=📷")}" alt="">
      <div class="pending-info">
        <div class="pending-name">${esc(p.name)}</div>
        <div class="pending-meta">${esc(p.category)} · ${esc(p.phone)}</div>
      </div>
      <div class="pending-actions">
        <button class="approve-btn" onclick="approveProduct('${p.id}')">✅ موافق</button>
        <button class="reject-btn" onclick="deleteProduct('${p.id}')">🗑️ حذف</button>
      </div>
    </div>
  `).join("");
}

async function approveProduct(id) {
  if (!confirm("✅ الموافقة على هذا المنتج؟ سيظهر للجميع فوراً")) return;
  const { error } = await db.from("products").update({ approved: true }).eq("id", id);
  if (error) alert("❌ خطأ: " + error.message);
  else { alert("✅ تمت الموافقة!"); loadProducts(); }
}

async function deleteProduct(id) {
  if (!confirm("❌ حذف نهائي؟ لا يمكن التراجع")) return;
  const { error } = await db.from("products").delete().eq("id", id);
  if (error) alert("❌ خطأ: " + error.message);
  else { alert("✅ تم الحذف"); loadProducts(); }
}

function openAdminPanel() {
  if (isAdmin) {
    document.getElementById("adminDashboard").classList.toggle("show");
    loadPendingProducts();
  } else {
    const pass = prompt("🔑 أدخل الرقم السري للمدير:");
    if (pass === ADMIN_PASS) {
      isAdmin = true;
      alert("✅ أهلاً بك يا مدير الموقع!");
      document.getElementById("adminDashboard").classList.add("show");
      loadPendingProducts();
    } else {
      alert("❌ كلمة المرور غير صحيحة");
    }
  }
}

// ==========================================
// نموذج إضافة منتج جديد
// ==========================================
function openPublishModal() {
  document.getElementById("publishModal").classList.add("active");
  document.body.style.overflow = "hidden";
  selectedImageFile = null;
  document.getElementById("imagePreview").style.display = "none";
}

function closePublishModal() {
  document.getElementById("publishModal").classList.remove("active");
  document.getElementById("publishForm").reset();
  document.getElementById("imagePreview").style.display = "none";
  document.body.style.overflow = "";
  selectedImageFile = null;
}

async function submitProduct(e) {
  e.preventDefault();
  
  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn.innerHTML;
  btn.innerHTML = "⏳ جاري الحفظ...";
  btn.disabled = true;

  let imageUrl = null;
  
  try {
    // رفع الصورة إذا تم اختيارها
    if (selectedImageFile) {
      btn.innerHTML = "⏳ جاري رفع الصورة...";
      imageUrl = await uploadProductImage(selectedImageFile);
    }

    const newProduct = {
      name: document.getElementById("productName").value.trim(),
      price: document.getElementById("productPrice").value.trim() || null,
      category: document.getElementById("productCategory").value,
      city: document.getElementById("productCity").value,
      phone: document.getElementById("productPhone").value.trim(),
      whatsapp: document.getElementById("productPhone").value.trim(),
      image_url: imageUrl,
      description: document.getElementById("productDesc").value.trim() || null,
      approved: false
    };

    const { error } = await db.from("products").insert(newProduct);
    
    if (error) throw error;

    alert("🎉 تم الإرسال بنجاح! سوف يظهر منتجك بعد موافقة المدير.");
    closePublishModal();
    
  } catch (err) {
    alert("❌ حدث خطأ: " + err.message);
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

// ==========================================
// التهيئة والاستماع للأحداث
// ==========================================
document.getElementById("publishForm").addEventListener("submit", submitProduct);
document.getElementById("searchInput").addEventListener("input", renderProducts);

// تشغيل عند فتح الصفحة
renderCategories();
loadProducts();

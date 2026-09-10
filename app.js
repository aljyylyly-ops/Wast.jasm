// إعدادات Supabase
const URL = "https://xjyywflrhjpepjenuiuh.supabase.co";
const KEY = "sb_publishable_mnF_zb4FKjMJoMWtUfqNpA_KFDmLAb1";
const db = supabase.createClient(URL, KEY);

const ADMIN_PASS = "20012001";

// التصنيفات المطلوبة
const cats = [
  "الكل", "مطاعم", "اسواق", "ملابس", "اكسسوارات", 
  "تلفونات", "اجهزة الكترونية", "بايسلات", "مواد انشائية", 
  "اقمشة", "اجهزة منزلية"
];

const cities = [
  "كربلاء", "بغداد", "النجف", "بابل", "الديوانية", 
  "واسط", "البصرة", "أربيل", "نينوى", "كل العراق"
];

let all = [], active = "الكل", isAdmin = false;

// دوال مساعدة
const esc = x => String(x ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

const money = x => x ? Number(x).toLocaleString("ar-IQ") + " د.ع" : "اتصل للسعر";

// بناء واجهة التصنيفات
function catsUI() {
  document.getElementById("cats").innerHTML = cats.map(c =>
    `<button class="cat ${c == active ? "active" : ""}" onclick="active='${c}';render()">${c}</button>`
  ).join("");
  
  document.getElementById("category").innerHTML = cats.slice(1).map(c =>
    `<option>${c}</option>`
  ).join("");
  
  document.getElementById("city").innerHTML = cities.map(c =>
    `<option>${c}</option>`
  ).join("");
}

// عرض المنتجات
function render() {
  const q = document.getElementById("search").value.toLowerCase();
  const a = all.filter(p =>
    (active == "الكل" || p.category == active) &&
    (!q || `${p.name} ${p.category} ${p.city}`.toLowerCase().includes(q))
  );

  document.getElementById("products").innerHTML = a.length
    ? `<div class="products">${a.map(p => `
        <article class="card">
          <img src="${esc(p.image_url || "https://via.placeholder.com/600x450/27ae60/ffffff?text=لا+صورة")}" alt="${esc(p.name)}">
          <div class="body">
            <h3>${esc(p.name)}</h3>
            <div class="price">${money(p.price)}</div>
            <div class="meta">📍 ${esc(p.city)} · ${esc(p.category)}</div>
            ${p.description ? `<p class="desc">${esc(p.description.substring(0, 50))}${p.description.length > 50 ? "..." : ""}</p>` : ""}
            <div class="actions">
              <a class="call" href="tel:${esc(p.phone)}">📞 اتصال</a>
              <a class="wa" target="_blank" href="https://wa.me/${String(p.phone).replace(/\D/g, "")}">💬 واتساب</a>
            </div>
          </div>
        </article>
      `).join("")}</div>`
    : `<div class="empty-state"><p>📭 ماكو منتجات منشورة في هذا القسم حالياً.</p></div>`;
}

// تحميل المنتجات
async function load() {
  const { data, error } = await db
    .from("products")
    .select("*")
    .eq("approved", true)
    .order("created_at", { ascending: false });

  if (error) {
    document.getElementById("products").innerHTML = `<div class="empty-state"><p>❌ تعذر تحميل المنتجات: ${error.message}</p></div>`;
    return;
  }
  all = data || [];
  render();
  loadPending();
}

// تحميل المنتجات بانتظار الموافقة (للمدير)
async function loadPending() {
  if (!isAdmin) return;
  
  const { data, error } = await db
    .from("products")
    .select("*")
    .eq("approved", false)
    .order("created_at", { ascending: false });

  const list = document.getElementById("pendingList");
  if (!data || data.length === 0) {
    list.innerHTML = "<p class='empty-text'>✅ لا توجد منتجات بانتظار الموافقة</p>";
    return;
  }

  list.innerHTML = data.map(p => `
    <div class="pending-item">
      <img src="${esc(p.image_url || "https://via.placeholder.com/80x80/eeeeee/888888?text=📷")}">
      <div class="info">
        <div class="name">${esc(p.name)}</div>
        <div class="small">${esc(p.category)} · ${esc(p.phone)}</div>
      </div>
      <div class="btns">
        <button class="btn-approve" onclick="approve(${p.id})">✅ وافق</button>
        <button class="btn-delete" onclick="remove(${p.id})">🗑️ حذف</button>
      </div>
    </div>
  `).join("");
}

// موافقة منتج
async function approve(id) {
  if (!confirm("الموافقة على هذا المنتج؟ سوف يظهر للجميع")) return;
  const { error } = await db.from("products").update({ approved: true }).eq("id", id);
  if (error) alert("❌ خطأ: " + error.message);
  else { alert("✅ تمت الموافقة"); load(); }
}

// حذف منتج
async function remove(id) {
  if (!confirm("حذف هذا المنتج نهائياً؟")) return;
  const { error } = await db.from("products").delete().eq("id", id);
  if (error) alert("❌ خطأ: " + error.message);
  else { alert("✅ تم الحذف"); load(); }
}

// فتح وإغلاق النوافذ
function openForm() { document.getElementById("modal").classList.remove("hidden"); }
function closeForm() { document.getElementById("modal").classList.add("hidden"); document.getElementById("productForm").reset(); }
function openAdmin() { 
  if (isAdmin) {
    document.getElementById("adminPanel").classList.toggle("show");
    loadPending();
  } else {
    const pass = prompt("أدخل الرقم السري للمدير:");
    if (pass === ADMIN_PASS) {
      isAdmin = true;
      alert("✅ مرحباً يا مدير!");
      document.getElementById("adminPanel").classList.add("show");
      loadPending();
    } else alert("❌ كلمة المرور غير صحيحة");
  }
}

// إضافة منتج جديد
async function add(e) {
  e.preventDefault();
  const p = {
    name: document.getElementById("name").value.trim(),
    price: document.getElementById("price").value.trim() || null,
    category: document.getElementById("category").value,
    city: document.getElementById("city").value,
    phone: document.getElementById("phone").value.trim(),
    whatsapp: document.getElementById("phone").value.trim(),
    image_url: document.getElementById("image").value.trim() || null,
    description: document.getElementById("description").value.trim() || null,
    approved: false
  };

  const { error } = await db.from("products").insert(p);
  if (error) {
    alert("❌ خطأ: " + error.message);
    return;
  }
  alert("✅ تم إرسال منتجك! بانتظار موافقة المدير");
  e.target.reset();
  closeForm();
}

// التهيئة
catsUI();
load();

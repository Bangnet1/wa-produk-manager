import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { createClient, type User } from "@supabase/supabase-js";
import {
  Activity, Bell, CalendarClock, Check, ChevronDown, CircleAlert, Clock3,
  LayoutDashboard, LogOut, MessageCircle, Pencil, Plus, RefreshCw, Search,
  ShieldCheck, Trash2, X, Package, Wallet, CalendarDays, Moon, Sun
} from "lucide-react";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../js/config.js";
import bangnetLogo from "./logo";
import { BusinessSuite } from "./BusinessSuite";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

type ProductStatus = "ACTIVE" | "EXPIRING_SOON" | "EXPIRED";
type Product = {
  id: string; user_id: string; customer_name: string; phone: string;
  product_name: string; variant: string | null; purchase_date: string;
  expiry_date: string; duration_days: number; purchase_price: number | null;
  selling_price: number | null; created_at?: string;
};
type ProductForm = Omit<Product, "id" | "user_id" | "created_at">;
type FilterKey = "ALL" | ProductStatus;

const PRESETS = ["Netflix", "Spotify", "Canva", "YouTube Premium", "Disney+", "Viu", "Prime Video", "iCloud+", "Google One", "CapCut", "ChatGPT Plus", "Microsoft 365", "Lainnya"];
const money = (value: number | null) => value == null ? "—" : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const todayISO = () => {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
};
const addDays = (date: string, amount: number) => {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + amount));
  return next.toISOString().slice(0, 10);
};
const dayDiff = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  const [ty, tm, td] = todayISO().split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86400000);
};
const formatDate = (date: string) => new Date(date + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
const statusOf = (date: string): ProductStatus => {
  const left = dayDiff(date);
  return left < 0 ? "EXPIRED" : left <= 3 ? "EXPIRING_SOON" : "ACTIVE";
};
const statusText: Record<ProductStatus, string> = { ACTIVE: "Aktif", EXPIRING_SOON: "Segera habis", EXPIRED: "Kadaluarsa" };
const emptyForm = (): ProductForm => ({
  customer_name: "", phone: "62", product_name: "Netflix", variant: "1 bulan",
  purchase_date: todayISO(), expiry_date: addDays(todayISO(), 30), duration_days: 30,
  purchase_price: null, selling_price: null
});
const normalizePhone = (raw: string) => {
  let value = raw.replace(/\D/g, "");
  if (value.startsWith("0")) value = "62" + value.slice(1);
  else if (!value.startsWith("62")) value = "62" + value;
  return value;
};
const reminderText = (p: Product) => `Halo ${p.customer_name}, kami ingin mengingatkan bahwa masa aktif ${p.product_name}${p.variant ? " (" + p.variant + ")" : ""} Anda akan berakhir pada ${formatDate(p.expiry_date)}. Jika ingin memperpanjang, silakan balas pesan ini. Terima kasih.`;
const waUrl = (p: Product) => `https://wa.me/${normalizePhone(p.phone)}?text=${encodeURIComponent(reminderText(p))}`;

function StatusBadge({ status }: { status: ProductStatus }) {
  const cls = status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : status === "EXPIRING_SOON" ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-rose-50 text-rose-700 ring-rose-200";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${cls}`}>{statusText[status]}</span>;
}

export default function App() {
  const [darkMode, setDarkMode] = useState(() => { try { return localStorage.getItem("bangnet-dark-mode") === "1"; } catch { return false; } });
  useEffect(() => { try { localStorage.setItem("bangnet-dark-mode", darkMode ? "1" : "0"); } catch {} }, [darkMode]);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogOptions, setCatalogOptions] = useState<{id:string;name:string;description:string;cost:number;sale:number;stock:string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [bellOpen, setBellOpen] = useState(false);
  const [alertItems, setAlertItems] = useState<Product[]>([]);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchSelected, setBatchSelected] = useState<string[]>([]);
  const [batchTemplate, setBatchTemplate] = useState("friendly");
  const [batchDelay, setBatchDelay] = useState(4);
  const [paymentAccount, setPaymentAccount] = useState("");
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchLogs, setBatchLogs] = useState<{id:string;name:string;phone:string;status:"SUCCESS"|"FAILED";detail:string;time:string}[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [batchTab, setBatchTab] = useState<"queue"|"history">("queue");
  const batchTargets = useMemo(() => products.filter(p => { const d=dayDiff(p.expiry_date); return d>=0 && d<=3; }).sort((a,b)=>a.expiry_date.localeCompare(b.expiry_date)), [products]);
  const templates: Record<string,string> = {
    friendly: "Halo {{nama}}! 😊\nMasa aktif {{produk}} Anda akan berakhir {{sisa_hari}} ({{tanggal_jatuh_tempo}}). Jika ingin memperpanjang, cukup balas pesan ini ya. Harga perpanjangan: {{harga_perpanjangan}}.\n\nPembayaran: {{rekening_pembayaran}}\nTerima kasih!",
    formal: "Yth. {{nama}}, kami informasikan masa aktif {{produk}} akan berakhir {{sisa_hari}}, pada {{tanggal_jatuh_tempo}}. Perpanjangan tersedia dengan biaya {{harga_perpanjangan}}.\nInformasi pembayaran: {{rekening_pembayaran}}\nTerima kasih.",
    promo: "Hai {{nama}}! Masa aktif {{produk}} hampir selesai. Yuk perpanjang sekarang agar tetap bisa digunakan. Jatuh tempo: {{tanggal_jatuh_tempo}} ({{sisa_hari}}). Harga perpanjangan {{harga_perpanjangan}}.\nPembayaran: {{rekening_pembayaran}}"
  };
  const interpolate = (p:Product, template:string) => {
    const d=dayDiff(p.expiry_date);
    const remaining=d===0?"hari ini":d===1?"1 hari lagi":`${d} hari lagi`;
    return template.replace(/{{nama}}/g,p.customer_name).replace(/{{produk}}/g,`${p.product_name}${p.variant ? " ("+p.variant+")" : ""}`).replace(/{{sisa_hari}}/g,remaining).replace(/{{tanggal_jatuh_tempo}}/g,formatDate(p.expiry_date)).replace(/{{harga_perpanjangan}}/g,money(p.selling_price)).replace(/{{rekening_pembayaran}}/g,paymentAccount.trim() || "Hubungi admin untuk informasi pembayaran");
  };
  const previewProduct = batchTargets.find(p=>batchSelected.includes(p.id)) ?? batchTargets[0];
  const batchPreview = previewProduct ? interpolate(previewProduct,templates[batchTemplate]) : "Pilih pelanggan untuk melihat pratinjau pesan.";
  const openBatch = () => { setBatchSelected(batchTargets.map(p=>p.id)); setBatchTab("queue"); setBatchOpen(true); };
  const toggleBatchSelection = (id:string) => setBatchSelected(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
  const loadBatchHistory = async () => {
    const {data,error}=await supabase.from("broadcast_logs").select("*").order("created_at",{ascending:false}).limit(100);
    if(error){notify("Riwayat broadcast belum tersedia. Jalankan migration batch reminder.");return;}
    setBatchLogs((data??[]).map((x:any)=>({id:x.id,name:x.customer_name,phone:x.phone,status:x.status,detail:x.detail ?? "",time:new Date(x.created_at).toLocaleString("id-ID")})));
  };
  const executeBatch = async () => {
    const selected=batchTargets.filter(p=>batchSelected.includes(p.id));
    if(!selected.length || batchRunning)return;
    if(!window.confirm(`Siapkan ${selected.length} tab WhatsApp dan proses antrean dengan jeda ${batchDelay} detik per nomor? Pesan belum terkirim sampai Anda menekan tombol Kirim di WhatsApp.`))return;
    // Pre-open tabs synchronously from the user gesture to reduce popup blocking.
    const tabs=selected.map(()=>window.open("about:blank","_blank"));
    setBatchRunning(true);setBatchProgress(0);
    const runLogs:{id:string;name:string;phone:string;status:"SUCCESS"|"FAILED";detail:string;time:string}[]=[];
    for(let i=0;i<selected.length;i++){
      const p=selected[i]; const tab=tabs[i]; let status:"SUCCESS"|"FAILED"= "SUCCESS"; let detail="Tab WhatsApp dibuka; pesan menunggu konfirmasi Kirim.";
      try {
        if(!tab || tab.closed) throw new Error("Tab diblokir browser. Izinkan pop-up untuk situs ini.");
        tab.location.href=`https://wa.me/${normalizePhone(p.phone)}?text=${encodeURIComponent(interpolate(p,templates[batchTemplate]))}`;
      } catch(e){status="FAILED";detail=e instanceof Error?e.message:"Gagal membuka tab";}
      const log={id:p.id,name:p.customer_name,phone:p.phone,status,detail,time:new Date().toLocaleString("id-ID")};
      runLogs.push(log);setBatchLogs([...runLogs]);setBatchProgress(Math.round(((i+1)/selected.length)*100));
      await supabase.from("broadcast_logs").insert({user_id:user?.id,product_id:p.id,customer_name:p.customer_name,phone:p.phone,product_name:p.product_name,status,detail,template_key:batchTemplate});
      if(i<selected.length-1) await new Promise(resolve=>window.setTimeout(resolve,batchDelay*1000));
    }
    setBatchRunning(false);
    notify(`Antrean selesai: ${runLogs.filter(x=>x.status==="SUCCESS").length} tab dibuka, ${runLogs.filter(x=>x.status==="FAILED").length} gagal. Pesan perlu dikirim manual di WhatsApp.`);
  };


  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 4200);
  }, []);

  const loadProducts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.from("products").select("*").order("expiry_date", { ascending: true });
    if (error) notify("Gagal memuat produk: " + error.message);
    else setProducts((data ?? []) as Product[]);
    setLoading(false);
  }, [user, notify]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      loadProducts();
      supabase.from("product_catalog").select("id,name,description,cost,sale,stock").order("name")
        .then(({data,error}) => {
          if (error) { console.error("Gagal memuat katalog produk:", error.message); return; }
          setCatalogOptions((data ?? []) as {id:string;name:string;description:string;cost:number;sale:number;stock:string}[]);
        });
    } else { setProducts([]); setCatalogOptions([]); setLoading(false); }
  }, [user, loadProducts]);

  const reminders = useMemo(() => products.filter(p => {
    const d = dayDiff(p.expiry_date);
    return d >= 0 && d <= 3;
  }).sort((a, b) => a.expiry_date.localeCompare(b.expiry_date)), [products]);

  const scanReminders = useCallback(() => {
    const due = products.filter(p => {
      const d = dayDiff(p.expiry_date);
      return d >= 0 && d <= 3;
    });
    setAlertItems(due);
    const today = todayISO();
    const newlyDue = due.filter(p => {
      const key = `expiry-alert:${p.id}:${p.expiry_date}:${today}`;
      if (localStorage.getItem(key)) return false;
      localStorage.setItem(key, "1");
      return true;
    });
    if (newlyDue.length) {
      setAlertDismissed(false);
      notify(newlyDue.length === 1
        ? `${newlyDue[0].customer_name}: ${newlyDue[0].product_name} jatuh tempo ${dayDiff(newlyDue[0].expiry_date) === 0 ? "hari ini" : "dalam " + dayDiff(newlyDue[0].expiry_date) + " hari"}.`
        : `Ada ${newlyDue.length} produk yang jatuh tempo dalam 3 hari.`);
    }
  }, [products, notify]);

  useEffect(() => {
    if (!user) return;
    scanReminders();
    const timer = window.setInterval(scanReminders, 60_000);
    return () => window.clearInterval(timer);
  }, [user, scanReminders]);

  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(p => {
      const matches = !q || [p.customer_name, p.phone, p.product_name, p.variant ?? ""].join(" ").toLowerCase().includes(q);
      return matches && (filter === "ALL" || statusOf(p.expiry_date) === filter);
    });
  }, [products, query, filter]);

  const metrics = useMemo(() => ({
    active: products.filter(p => statusOf(p.expiry_date) === "ACTIVE").length,
    soon: products.filter(p => statusOf(p.expiry_date) === "EXPIRING_SOON").length,
    expired: products.filter(p => statusOf(p.expiry_date) === "EXPIRED").length
  }), [products]);

  async function signIn(e: FormEvent) {
    e.preventDefault(); setAuthBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) notify(error.message);
    setAuthBusy(false);
  }
  async function signOut() { await supabase.auth.signOut(); }

  function openCreate() { setEditing(null); setForm(emptyForm()); setModalOpen(true); }
  function openEdit(product: Product) {
    setEditing(product);
    setForm({
      customer_name: product.customer_name, phone: product.phone, product_name: product.product_name,
      variant: product.variant ?? "", purchase_date: product.purchase_date, expiry_date: product.expiry_date,
      duration_days: product.duration_days, purchase_price: product.purchase_price, selling_price: product.selling_price
    });
    setModalOpen(true);
  }
  async function saveProductTemplate(template:{name:string;description:string;cost:number;sale:number}) {
    if(!user)return;
    const {data,error}=await supabase.from("product_catalog").insert({...template,category:"Custom",stock:"Tersedia",user_id:user.id}).select("id,name,description,cost,sale,stock").single();
    if(error){notify("Gagal menyimpan template: "+error.message);return;}
    setCatalogOptions(prev=>[...prev,data as {id:string;name:string;description:string;cost:number;sale:number;stock:string}]);
    notify("Template produk berhasil ditambahkan.");
  }
  async function deleteProductTemplate(id:string) {
    if(!user||!window.confirm("Hapus template produk ini?"))return;
    const {error}=await supabase.from("product_catalog").delete().eq("id",id).eq("user_id",user.id);
    if(error){notify("Gagal menghapus template: "+error.message);return;}
    setCatalogOptions(prev=>prev.filter(x=>x.id!==id));notify("Template produk dihapus.");
  }
  function updateForm<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (key === "purchase_date" || key === "duration_days") {
        next.expiry_date = addDays(String(next.purchase_date), Number(next.duration_days) || 1);
      }
      return next;
    });
  }

  async function saveProduct(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const phone = normalizePhone(form.phone);
    if (!/^62\d{8,13}$/.test(phone)) { notify("Nomor WhatsApp harus menggunakan format 62 dan 10–15 digit."); return; }
    if (form.expiry_date < form.purchase_date) { notify("Tanggal jatuh tempo tidak boleh sebelum tanggal mulai."); return; }
    setSaving(true);
    const payload = {
      user_id: user.id, customer_name: form.customer_name.trim(), phone,
      product_name: form.product_name, variant: form.variant?.trim() || null,
      purchase_date: form.purchase_date, expiry_date: form.expiry_date,
      duration_days: Number(form.duration_days), purchase_price: form.purchase_price === null ? null : Number(form.purchase_price),
      selling_price: form.selling_price === null ? null : Number(form.selling_price)
    };
    const result = editing
      ? await supabase.from("products").update(payload).eq("id", editing.id).select().single()
      : await supabase.from("products").insert(payload).select().single();
    setSaving(false);
    if (result.error) {
      notify(result.error.message.includes("variant") ? "Kolom variant belum tersedia. Jalankan SQL migration expiry tracker terlebih dahulu." : "Gagal menyimpan: " + result.error.message);
      return;
    }
    setModalOpen(false); notify(editing ? "Produk berhasil diperbarui." : "Produk berhasil ditambahkan."); await loadProducts();
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`Hapus produk ${product.product_name} milik ${product.customer_name}?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    if (error) notify("Gagal menghapus: " + error.message);
    else { notify("Produk berhasil dihapus."); await loadProducts(); }
  }

  async function renewProduct(product: Product) {
    const newExpiry = addDays(product.expiry_date, 30);
    const { error } = await supabase.from("products").update({
      expiry_date: newExpiry, duration_days: Number(product.duration_days || 0) + 30
    }).eq("id", product.id);
    if (error) notify("Gagal memperpanjang: " + error.message);
    else { notify(`Masa aktif ${product.product_name} diperpanjang sampai ${formatDate(newExpiry)}.`); await loadProducts(); }
  }

  if (!user) return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-50 via-slate-50 to-white flex items-center justify-center p-5">
      <form onSubmit={signIn} className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-xl font-black text-white">W</div>
        <p className="text-xs font-bold uppercase tracking-[.2em] text-teal-700">Workspace</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Bangnet Manager</h1>
        <p className="mt-2 text-sm text-slate-500">Masuk untuk mengelola produk digital dan masa aktif pelanggan.</p>
        <label className="mt-7 block text-sm font-semibold text-slate-700">Email
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100" placeholder="nama@email.com" />
        </label>
        <label className="mt-4 block text-sm font-semibold text-slate-700">Password
          <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100" placeholder="Password akun" />
        </label>
        <button disabled={authBusy} className="mt-6 w-full rounded-xl bg-teal-700 px-4 py-3 font-bold text-white hover:bg-teal-800 disabled:opacity-60">{authBusy ? "Memproses..." : "Masuk"}</button>
        <p className="mt-4 text-center text-xs text-slate-400">Akun dibuat oleh admin melalui Supabase Authentication.</p>
      </form>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </main>
  );

  return (
    <div className={`app-shell min-h-screen bg-slate-50 text-slate-800 ${darkMode ? "dark-mode" : ""}`}>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <img src={bangnetLogo} alt="Bangnet" className="h-12 w-12 rounded-xl object-contain bg-white"/>
            <div><h1 className="font-bold text-slate-900">WA & Produk Manager</h1><p className="brand-subtitle text-xs text-slate-500">Digital product expiry tracker</p></div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button type="button" onClick={() => setDarkMode(v => !v)} className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50" aria-label={darkMode ? "Aktifkan mode terang" : "Aktifkan mode gelap"} title={darkMode ? "Mode terang" : "Mode gelap"}>{darkMode ? <Sun size={19}/> : <Moon size={19}/>}</button>
            <div className="relative">
              <button onClick={() => { setBellOpen(v => !v); setAlertDismissed(true); }} className="relative rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50" aria-label="Notifikasi">
                <Bell size={19}/>{reminders.length > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{reminders.length}</span>}
              </button>
              {bellOpen && <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                <div className="flex items-center justify-between px-1 pb-2"><b className="text-sm">Pengingat masa aktif</b><button onClick={() => setBellOpen(false)}><X size={16}/></button></div>
                {reminders.length === 0 ? <p className="p-4 text-center text-sm text-slate-500">Tidak ada produk yang jatuh tempo dalam 3 hari.</p> : reminders.map(p => <div key={p.id} className="border-t border-slate-100 py-3"><div className="flex justify-between gap-2 text-sm font-semibold"><span>{p.product_name}</span><span className="text-amber-700">H-{dayDiff(p.expiry_date)}</span></div><p className="mt-1 text-xs text-slate-500">{p.customer_name} · {formatDate(p.expiry_date)}</p><a href={waUrl(p)} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><MessageCircle size={13}/> Hubungi pelanggan</a></div>)}
              </div>}
            </div>
            <a href="/wa-produk-manager/legacy/" className="hidden rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 md:inline-flex">Fitur lama</a><div className="hidden max-w-48 text-right sm:block"><p className="truncate text-xs font-semibold text-slate-700">{user.email}</p><p className="text-[11px] text-slate-400">Akun aktif</p></div>
            <button onClick={signOut} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"><LogOut size={16}/><span className="hidden sm:inline">Keluar</span></button>
          </div>
        </div>
      </header>

      <main className="app-main mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <BusinessSuite userId={user.id} products={products} notify={notify} dashboardContent={<>        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="text-xs font-bold uppercase tracking-[.2em] text-teal-700">Dashboard</p><h2 className="dashboard-title mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Manajemen Produk Digital</h2><p className="mt-1 text-sm text-slate-500">Pantau langganan pelanggan dan tindak lanjuti sebelum masa aktif berakhir.</p></div>
          <div className="dashboard-actions flex flex-wrap gap-2"><button onClick={openBatch} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-100"><MessageCircle size={17}/> Pengingat Masal ({batchTargets.length})</button><button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-teal-700/15 hover:bg-teal-800"><Plus size={17}/> Tambah Produk</button></div>
        </div>

        {reminders.length > 0 && !alertDismissed && <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900"><CircleAlert className="mt-0.5 shrink-0" size={20}/><div className="min-w-0 flex-1"><p className="font-bold">{reminders.length} produk perlu ditindaklanjuti</p><p className="mt-1 text-sm text-amber-800">Ada produk dengan jatuh tempo H-3 sampai hari ini. Periksa daftar dan kirim pengingat WhatsApp.</p></div><button onClick={() => setAlertDismissed(true)} aria-label="Tutup"><X size={18}/></button></div>}

        <section className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Metric icon={<Package size={20}/>} label="Total Produk Aktif" value={metrics.active} note="Masa aktif lebih dari 3 hari" tone="teal"/>
          <Metric icon={<CalendarClock size={20}/>} label="Mendekati Jatuh Tempo" value={metrics.soon} note="H-3 sampai H-0" tone="amber"/>
          <Metric icon={<CircleAlert size={20}/>} label="Sudah Kadaluarsa" value={metrics.expired} note="Perlu diperpanjang" tone="rose"/>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div><h3 className="font-bold text-slate-900">Daftar Produk Pelanggan</h3><p className="mt-1 text-xs text-slate-500">{products.length} catatan produk tersimpan</p></div>
              <div className="relative w-full lg:max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari pelanggan, nomor, atau produk..." className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-50"/></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {([{key:"ALL",label:"Semua"},{key:"ACTIVE",label:"Aktif"},{key:"EXPIRING_SOON",label:"Segera Habis"},{key:"EXPIRED",label:"Kadaluarsa"}] as {key:FilterKey;label:string}[]).map(tab => <button key={tab.key} onClick={() => setFilter(tab.key)} className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${filter === tab.key ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{tab.label}{tab.key === "ALL" ? ` (${products.length})` : ` (${products.filter(p => tab.key === statusOf(p.expiry_date)).length})`}</button>)}
            </div>
          </div>
          {loading ? <div className="p-12 text-center text-sm text-slate-500"><RefreshCw className="mx-auto mb-2 animate-spin" size={20}/>Memuat data produk...</div> : visibleProducts.length === 0 ? <div className="p-12 text-center"><Package className="mx-auto mb-3 text-slate-300" size={34}/><p className="font-semibold text-slate-700">Belum ada produk</p><p className="mt-1 text-sm text-slate-500">Tambahkan produk digital pertama atau ubah kata pencarian.</p></div> : <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Pelanggan</th><th className="px-4 py-3">Produk / Varian</th><th className="px-4 py-3">Mulai</th><th className="px-4 py-3">Jatuh Tempo</th><th className="px-4 py-3">Sisa</th><th className="px-4 py-3">Harga Jual</th><th className="px-4 py-3">Status</th><th className="px-5 py-3">Aksi</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {visibleProducts.map(p => {
                  const left = dayDiff(p.expiry_date);
                  const status = statusOf(p.expiry_date);
                  return <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4"><p className="font-semibold text-slate-900">{p.customer_name}</p><p className="mt-1 text-xs text-slate-500">{p.phone}</p></td>
                    <td className="px-4 py-4"><p className="font-semibold text-slate-800">{p.product_name}</p><p className="mt-1 text-xs text-slate-500">{p.variant || `${p.duration_days} hari`}</p></td>
                    <td className="px-4 py-4 text-sm text-slate-600">{formatDate(p.purchase_date)}</td>
                    <td className="px-4 py-4 text-sm font-medium text-slate-700">{formatDate(p.expiry_date)}</td>
                    <td className="px-4 py-4 text-sm">{left < 0 ? <span className="font-semibold text-rose-600">{Math.abs(left)} hari lewat</span> : <span className={left <= 3 ? "font-semibold text-amber-700" : "text-slate-600"}>{left} hari</span>}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-slate-700">{money(p.selling_price)}</td>
                    <td className="px-4 py-4"><StatusBadge status={status}/></td>
                    <td className="px-5 py-4"><div className="flex items-center gap-1.5">
                      <a href={waUrl(p)} target="_blank" rel="noreferrer" title="Kirim WA perpanjangan" className="rounded-lg bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100"><MessageCircle size={16}/></a>
                      <button onClick={() => renewProduct(p)} title="Perpanjang 30 hari" className="rounded-lg bg-teal-50 p-2 text-teal-700 hover:bg-teal-100"><RefreshCw size={16}/></button>
                      <button onClick={() => openEdit(p)} title="Edit" className="rounded-lg bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"><Pencil size={16}/></button>
                      <button onClick={() => deleteProduct(p)} title="Hapus" className="rounded-lg bg-rose-50 p-2 text-rose-600 hover:bg-rose-100"><Trash2 size={16}/></button>
                    </div></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>}
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-400"><span>Menampilkan {visibleProducts.length} dari {products.length} produk</span><button onClick={loadProducts} className="inline-flex items-center gap-1.5 font-semibold text-teal-700 hover:text-teal-900"><RefreshCw size={13}/> Muat ulang</button></div>
        </section>
        <p className="mt-4 text-center text-xs text-slate-400">Data tersimpan di Supabase dan dilindungi Row Level Security.</p>
        </>} />
      </main>
      {modalOpen && <ProductModal form={form} catalogOptions={catalogOptions} onAddTemplate={saveProductTemplate} onDeleteTemplate={deleteProductTemplate} editing={!!editing} saving={saving} onChange={updateForm} onClose={() => setModalOpen(false)} onSubmit={saveProduct}/>}
      {batchOpen && <BatchReminderModal targets={batchTargets} selected={batchSelected} toggle={toggleBatchSelection} setSelected={setBatchSelected} template={batchTemplate} setTemplate={setBatchTemplate} templates={templates} preview={batchPreview} previewProduct={previewProduct} account={paymentAccount} setAccount={setPaymentAccount} delay={batchDelay} setDelay={setBatchDelay} running={batchRunning} progress={batchProgress} logs={batchLogs} tab={batchTab} setTab={setBatchTab} onHistory={loadBatchHistory} onExecute={executeBatch} onClose={()=>setBatchOpen(false)}/>} 
      {toast && <Toast message={toast} onClose={() => setToast("")}/>}
    </div>
  );
}


function BatchReminderModal({targets,selected,toggle,setSelected,template,setTemplate,templates,preview,previewProduct,account,setAccount,delay,setDelay,running,progress,logs,tab,setTab,onHistory,onExecute,onClose}:any) {
  const [phase,setPhase]=useState("H-3");
  const filtered=targets.filter((p:Product)=>{const d=dayDiff(p.expiry_date);return phase==="ALL"?(d>=0&&d<=3):d===Number(phase.slice(2));});
  const allChecked=filtered.length>0&&filtered.every((p:Product)=>selected.includes(p.id));
  const count=selected.length;
  return <div className="fixed inset-0 z-[55] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm">
    <section className="my-auto flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
      <header className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Batch Expiry Reminder</p><h3 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">Pengiriman Pengingat Masal</h3><p className="mt-1 text-sm text-slate-500">Pilih pelanggan, tinjau pesan, lalu proses antrean WhatsApp.</p></div><button onClick={onClose} disabled={running} className="rounded-xl bg-slate-100 p-2"><X size={18}/></button></header>
      <div className="flex gap-2 border-b border-slate-100 px-5 pt-3"><button onClick={()=>setTab("queue")} className={`border-b-2 px-3 py-2 text-sm font-semibold ${tab==="queue"?"border-teal-600 text-teal-700":"border-transparent text-slate-500"}`}>Antrean pengingat</button><button onClick={()=>{setTab("history");onHistory();}} className={`border-b-2 px-3 py-2 text-sm font-semibold ${tab==="history"?"border-teal-600 text-teal-700":"border-transparent text-slate-500"}`}>Riwayat broadcast</button></div>
      {tab==="queue"?<div className="grid min-h-0 flex-1 gap-0 overflow-y-auto lg:grid-cols-[1.05fr_.95fr]">
        <div className="border-b border-slate-100 p-5 lg:border-b-0 lg:border-r">
          <div className="mb-3 flex items-center justify-between"><b className="text-sm text-slate-800">Pelanggan terdeteksi ({targets.length})</b><span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-700">{count} dipilih</span></div>
          <div className="mb-3 flex flex-wrap gap-2">{["ALL","H-3","H-2","H-1","H-0"].map((x:string)=><button key={x} onClick={()=>setPhase(x)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${phase===x?"bg-slate-800 text-white":"bg-slate-100 text-slate-600"}`}>{x==="ALL"?"Semua":x}</button>)}</div>
          <label className="mb-2 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-semibold"><input type="checkbox" checked={allChecked} onChange={e=>setSelected(e.target.checked?[...new Set([...selected,...filtered.map((p:Product)=>p.id)])]:selected.filter((id:string)=>!filtered.some((p:Product)=>p.id===id)))} /> Pilih semua di filter ini</label>
          <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">{filtered.length===0?<p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">Tidak ada pelanggan pada fase ini.</p>:filtered.map((p:Product)=>{const d=dayDiff(p.expiry_date);return <label key={p.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 hover:border-teal-300"><input type="checkbox" className="mt-1" checked={selected.includes(p.id)} onChange={()=>toggle(p.id)}/><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-800">{p.customer_name} · {p.product_name}</span><span className="mt-1 block text-xs text-slate-500">{p.phone} · {formatDate(p.expiry_date)}</span></span><span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700">H-{d}</span></label>})}</div>
          <p className="mt-3 text-xs text-slate-400">Pemindaian memakai data produk terbaru yang telah dimuat di dashboard.</p>
        </div>
        <div className="space-y-4 p-5">
          <div><label className="mb-2 block text-sm font-bold text-slate-800">Template pesan</label><select value={template} onChange={e=>setTemplate(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"><option value="friendly">Ramah & personal</option><option value="formal">Formal</option><option value="promo">Ajakan perpanjangan</option></select></div>
          <div><label className="mb-2 block text-sm font-bold text-slate-800">Rekening / instruksi pembayaran</label><input value={account} onChange={e=>setAccount(e.target.value)} placeholder="BCA 123... a.n. Nama / QRIS..." className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></div>
          <div><div className="mb-2 flex items-center justify-between"><b className="text-sm text-slate-800">Preview pesan</b><span className="text-xs text-slate-400">{previewProduct?.customer_name??"Belum dipilih"}</span></div><pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-700">{preview}</pre><div className="mt-2 flex flex-wrap gap-1">{["{{nama}}","{{produk}}","{{sisa_hari}}","{{tanggal_jatuh_tempo}}","{{harga_perpanjangan}}","{{rekening_pembayaran}}"].map(x=><code key={x} className="rounded bg-slate-100 px-1.5 py-1 text-[10px] text-slate-500">{x}</code>)}</div></div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3"><div className="flex items-center gap-2 text-sm font-bold text-amber-900"><ShieldCheck size={17}/> Jeda anti-spam</div><p className="mt-1 text-xs text-amber-800">Atur jeda antar pembukaan chat. Default 4 detik (rentang rekomendasi 3–5 detik).</p><div className="mt-3 flex items-center gap-3"><input type="range" min="3" max="5" value={delay} onChange={e=>setDelay(Number(e.target.value))} className="flex-1"/><b className="w-14 rounded-lg bg-white px-2 py-1.5 text-center text-sm text-amber-900">{delay} dtk</b></div></div>
          {running&&<div><div className="mb-2 flex justify-between text-xs font-semibold text-slate-600"><span>Memproses antrean...</span><span>{Math.round(progress)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-600 transition-all" style={{width:progress+"%"}}/></div></div>}
          <button disabled={running||count===0} onClick={onExecute} className="w-full rounded-xl bg-emerald-700 px-4 py-3.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"><MessageCircle className="mr-2 inline" size={17}/>{running?"Memproses antrean...":`Mulai antrean WhatsApp (${count})`}</button>
          <p className="text-[11px] leading-5 text-slate-400">Penting: browser membuka chat WhatsApp satu per satu. Status sukses berarti tab berhasil dibuka, bukan pesan terkirim. Anda tetap harus menekan tombol Kirim di WhatsApp. Pastikan pelanggan menyetujui pesan pengingat.</p>
        </div>
      </div>:<div className="min-h-0 flex-1 overflow-y-auto p-5"><div className="mb-3 flex items-center justify-between"><b className="text-sm">Riwayat aktivitas broadcast</b><span className="text-xs text-slate-400">100 aktivitas terakhir</span></div>{logs.length===0?<p className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">Belum ada riwayat broadcast.</p>:<div className="space-y-2">{logs.map((l:any,i:number)=><div key={l.id+"-"+i} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3"><div><p className="text-sm font-semibold">{l.name} · {l.phone}</p><p className="mt-1 text-xs text-slate-500">{l.detail} · {l.time}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${l.status==="SUCCESS"?"bg-emerald-50 text-emerald-700":"bg-rose-50 text-rose-700"}`}>{l.status==="SUCCESS"?"Tab dibuka":"Gagal"}</span></div>)}</div>}</div>}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3"><span className="text-xs text-slate-500">Terpilih: {count} pelanggan</span><button onClick={onClose} disabled={running} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">Tutup</button></footer>
    </section>
  </div>;
}

function Metric({icon,label,value,note,tone}:{icon:ReactNode;label:string;value:number;note:string;tone:"teal"|"amber"|"rose"}) {
  const colors = {teal:"bg-teal-50 text-teal-700",amber:"bg-amber-50 text-amber-700",rose:"bg-rose-50 text-rose-700"};
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-500">{label}</span><span className={`rounded-xl p-2.5 ${colors[tone]}`}>{icon}</span></div><p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-400">{note}</p></article>;
}

function ProductTemplateManager({options,onAdd,onDelete,onSelect}:{options:{id:string;name:string;description:string;cost:number;sale:number;stock:string}[];onAdd:(t:{name:string;description:string;cost:number;sale:number})=>Promise<void>;onDelete:(id:string)=>Promise<void>;onSelect:(item:{name:string;description:string;cost:number;sale:number})=>void}) {
 const [name,setName]=useState(""); const [description,setDescription]=useState("1 Bulan"); const [cost,setCost]=useState(""); const [sale,setSale]=useState(""); const [busy,setBusy]=useState(false);
 const submit=async()=>{if(!name.trim())return;setBusy(true);await onAdd({name:name.trim(),description:description.trim(),cost:Number(cost)||0,sale:Number(sale)||0});setName("");setDescription("1 Bulan");setCost("");setSale("");setBusy(false);};
 return <div className="sm:col-span-2 rounded-2xl border border-teal-100 bg-teal-50/50 p-4">
  <h4 className="font-bold text-slate-800">Template produk digital</h4><p className="mb-3 text-xs text-slate-500">Buat daftar sendiri. Pilih template untuk mengisi varian, modal, dan harga jual otomatis.</p>
  <div className="grid grid-cols-2 gap-2">
   <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Nama produk" value={name} onChange={e=>setName(e.target.value)}/>
   <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Varian / durasi" value={description} onChange={e=>setDescription(e.target.value)}/>
   <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" inputMode="numeric" placeholder="Harga modal" value={cost} onChange={e=>setCost(e.target.value.replace(/\D/g,""))}/>
   <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" inputMode="numeric" placeholder="Harga jual" value={sale} onChange={e=>setSale(e.target.value.replace(/\D/g,""))}/>
  </div>
  <button type="button" disabled={busy||!name.trim()} onClick={submit} className="action mt-3"><Plus size={14}/>Simpan template</button>
  <div className="mt-3 space-y-2">{options.map(item=><div key={item.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3">
   <button type="button" className="min-w-0 flex-1 text-left" onClick={()=>onSelect(item)}><span className="block truncate text-sm font-semibold">{item.name}</span><span className="block text-xs text-slate-500">{item.description} · Modal {money(item.cost)} · Jual {money(item.sale)}</span></button>
   <button type="button" aria-label={`Hapus template ${item.name}`} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50" onClick={()=>onDelete(item.id)}><Trash2 size={16}/></button>
  </div>)}</div>
 </div>;
}

function ProductModal({form,catalogOptions,onAddTemplate,onDeleteTemplate,editing,saving,onChange,onClose,onSubmit}:{form:ProductForm;catalogOptions:{id:string;name:string;description:string;cost:number;sale:number;stock:string}[];onAddTemplate:(t:{name:string;description:string;cost:number;sale:number})=>Promise<void>;onDeleteTemplate:(id:string)=>Promise<void>;editing:boolean;saving:boolean;onChange:<K extends keyof ProductForm>(key:K,value:ProductForm[K])=>void;onClose:()=>void;onSubmit:(e:FormEvent)=>void}) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={e => {if(e.target === e.currentTarget) onClose();}}>
    <form onSubmit={onSubmit} className="my-auto w-full max-w-2xl rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
      <div className="mb-6 flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-teal-700">{editing ? "Perbarui data" : "Produk baru"}</p><h3 className="mt-1 text-xl font-bold text-slate-900">{editing ? "Edit Produk Digital" : "Tambah Produk Digital"}</h3><p className="mt-1 text-sm text-slate-500">Lengkapi data pelanggan dan masa aktif produk.</p></div><button type="button" onClick={onClose} className="rounded-xl bg-slate-100 p-2 text-slate-500"><X size={18}/></button></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">Nama pelanggan<input required value={form.customer_name} onChange={e => onChange("customer_name",e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 font-normal outline-none focus:border-teal-500" placeholder="Nama pelanggan"/></label>
        <label className="text-sm font-semibold text-slate-700">Nomor WhatsApp<input required value={form.phone} onChange={e => onChange("phone",e.target.value)} onBlur={() => onChange("phone",normalizePhone(form.phone))} className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 font-normal outline-none focus:border-teal-500" placeholder="6281234567890"/><span className="mt-1 block text-[11px] font-normal text-slate-400">Gunakan kode negara 62.</span></label>
        <label className="text-sm font-semibold text-slate-700">Produk digital<select value={form.product_name} onChange={e => { const name=e.target.value; const item=catalogOptions.find(x=>x.name===name); onChange("product_name",name); if(item){onChange("variant",item.description||"");onChange("purchase_price",item.cost??null);onChange("selling_price",item.sale??null);} }} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 font-normal outline-none focus:border-teal-500"><option value="">Pilih produk dari katalog</option>{catalogOptions.filter(x=>x.stock!=="Habis").map((x,i)=><option key={`${x.name}-${i}`} value={x.name}>{x.name}</option>)}{!catalogOptions.some(x=>x.name===form.product_name)&&form.product_name&&<option value={form.product_name}>{form.product_name}</option>}</select>{catalogOptions.length===0&&<span className="mt-1 block text-xs font-normal text-amber-600">Belum ada template produk. Buat daftar produk sendiri di bawah ini.</span>}</label>
        <label className="text-sm font-semibold text-slate-700">Varian / durasi<input required value={form.variant ?? ""} onChange={e => onChange("variant",e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 font-normal outline-none focus:border-teal-500" placeholder="Private 1 bulan / Sharing"/></label>
        <ProductTemplateManager options={catalogOptions} onAdd={onAddTemplate} onDelete={onDeleteTemplate} onSelect={(item)=>{onChange("product_name",item.name);onChange("variant",item.description||"");onChange("purchase_price",item.cost);onChange("selling_price",item.sale);}} />
        <label className="text-sm font-semibold text-slate-700">Tanggal mulai<input required type="date" value={form.purchase_date} onChange={e => onChange("purchase_date",e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 font-normal outline-none focus:border-teal-500"/></label>
        <label className="text-sm font-semibold text-slate-700">Durasi (hari)<input required min="1" type="number" value={form.duration_days} onChange={e => onChange("duration_days",Number(e.target.value))} className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 font-normal outline-none focus:border-teal-500"/></label>
        <label className="text-sm font-semibold text-slate-700">Tanggal jatuh tempo<input required type="date" value={form.expiry_date} onChange={e => onChange("expiry_date",e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 font-normal outline-none focus:border-teal-500"/></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-semibold text-slate-700">Harga modal<input min="0" type="number" value={form.purchase_price ?? ""} onChange={e => onChange("purchase_price",e.target.value === "" ? null : Number(e.target.value))} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-teal-500" placeholder="0"/></label>
          <label className="text-sm font-semibold text-slate-700">Harga jual<input min="0" type="number" value={form.selling_price ?? ""} onChange={e => onChange("selling_price",e.target.value === "" ? null : Number(e.target.value))} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-teal-500" placeholder="0"/></label>
        </div>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600">Batal</button><button disabled={saving} className="rounded-xl bg-teal-700 px-5 py-3 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-60">{saving ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Simpan Produk"}</button></div>
    </form>
  </div>;
}

function Toast({message,onClose}:{message:string;onClose:()=>void}) {
  return <div className="fixed bottom-5 right-5 z-[60] flex max-w-sm items-start gap-3 rounded-2xl bg-slate-900 px-4 py-3.5 text-sm text-white shadow-2xl"><Check size={18} className="mt-0.5 shrink-0 text-emerald-400"/><span>{message}</span><button onClick={onClose} className="ml-2 text-slate-400"><X size={16}/></button></div>;
}

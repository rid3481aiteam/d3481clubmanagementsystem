<template>
  <div id="app-root">
    <template v-if="!auth.loading">
      <template v-if="auth.isLoggedIn && !route.meta.bare">
        <TopNav />
        <TopMenu />
        <main class="main">
          <RouterView />
        </main>
      </template>
      <template v-else>
        <RouterView />
      </template>
    </template>
    <div v-else class="splash">
      <div class="splash-spinner"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import TopNav from '@/components/layout/TopNav.vue'
import TopMenu from '@/components/layout/TopMenu.vue'

const auth = useAuthStore()
const route = useRoute()
onMounted(() => auth.init())
</script>

<style>
/* ── CSS Variables（比照地區原始規劃 rotary3481_platform_12.html 配色） ── */
:root {
  --navy:   #1C2B4A;
  --navy2:  #2C3F6B;
  --gold:   #B8892A;
  --gold-l: #D4A84B;
  --gold-p: #FDF8EE;
  --green:  #2A6B48;
  --red:    #B03030;
  --sky:    #2F8FCE;
  --bg:     #F3F0EB;
  --card:   #fff;
  --text:   #1A1A2A;
  --muted:  #6B7280;
  --border: rgba(28,43,74,.1);
  --r-sm:   6px;
  --r:      10px;
  --r-lg:   16px;
  --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px; --sp-5: 24px; --sp-6: 32px;
  --shadow-sm: 0 1px 3px rgba(23,69,143,.08);
  --shadow-md: 0 4px 12px rgba(23,69,143,.10);
  --shadow-lg: 0 12px 32px rgba(23,69,143,.14);
  --topnav-h:  56px;
  --topmenu-h: 50px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body { font-family: -apple-system, 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); font-size: 16px; line-height: 1.5; }

#app-root { height: 100vh; display: flex; flex-direction: column; }

.main {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  padding-top: calc(var(--topnav-h) + var(--topmenu-h) + 24px);
}

@media (max-width: 900px) {
  .main { padding: 16px; }
}

/* Splash loading */
.splash {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: var(--navy);
}
.splash-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(247,168,27,.3);
  border-top-color: var(--gold);
  border-radius: 50%;
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Shared Utilities ── */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  min-height: 40px;
  border: none;
  border-radius: var(--r);
  font-size: 14.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background .15s, box-shadow .15s, transform .1s;
  text-decoration: none;
}
.btn:active { transform: translateY(0); box-shadow: none; }
.btn-p    { background: var(--navy); color: #fff; box-shadow: var(--shadow-sm); }
.btn-p:hover    { background: var(--navy2); box-shadow: var(--shadow-md); transform: translateY(-1px); }
.btn-gold { background: var(--gold); color: #fff; box-shadow: var(--shadow-sm); }
.btn-gold:hover { background: #e0960f; box-shadow: var(--shadow-md); transform: translateY(-1px); }
.btn-sky  { background: var(--sky); color: #fff; box-shadow: var(--shadow-sm); }
.btn-sky:hover  { background: #26739e; box-shadow: var(--shadow-md); transform: translateY(-1px); }
.btn-g    { background: var(--card); color: var(--text); border: 1px solid var(--border); }
.btn-g:hover    { background: var(--bg); }
.btn-red  { background: var(--red); color: #fff; box-shadow: var(--shadow-sm); }
.btn-red:hover  { background: #8f2626; box-shadow: var(--shadow-md); transform: translateY(-1px); }
.btn-sm   { padding: 6px 12px; font-size: 13px; min-height: 32px; }

.bdg {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 20px;
  font-size: 12.5px;
  font-weight: 600;
}
.b-n { background: rgba(23,69,143,.16);  color: var(--navy); }
.b-g { background: rgba(107,114,128,.16);color: var(--muted); }
.b-y { background: rgba(247,168,27,.20); color: #8a5800; }
.b-r { background: rgba(176,48,48,.16);  color: var(--red); }
.b-gr{ background: rgba(42,107,72,.16);  color: var(--green); }

/* Table */
.tw { background: var(--card); border-radius: var(--r); border: 1px solid var(--border); overflow: auto; box-shadow: var(--shadow-sm); }
table { width: 100%; border-collapse: collapse; min-width: 560px; }
.th { background: var(--gold-p); }
th, td { padding: 12px 14px; text-align: left; border-bottom: 1px solid var(--border); font-size: 15px; }
th { font-weight: 600; color: var(--navy); font-size: 12.5px; text-transform: uppercase; letter-spacing: .4px; }
tr:last-child td { border-bottom: none; }
tr:hover td { background: rgba(23,69,143,.04); }

/* 手機卡片式表格：table.card-table 在窄螢幕把每一列變成一張卡片，
   欄位改成上下堆疊的 label:value（label 取自 td 的 data-label），
   取代原本「整張表左右滑動」的閱讀方式。加了 .zone-row 的列（分區
   摺疊標題那種橫跨整列的列）維持原本橫式呈現，不套用 label:value。 */
@media (max-width: 700px) {
  table.card-table { min-width: 0; }
  table.card-table thead { display: none; }
  table.card-table, table.card-table tbody, table.card-table tr, table.card-table td {
    display: block;
    width: 100%;
  }
  table.card-table tr {
    padding: 10px 0;
    border-bottom: 8px solid var(--bg);
  }
  table.card-table tr:last-child { border-bottom: none; }
  table.card-table td {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border-bottom: none;
    text-align: right;
  }
  table.card-table td[data-label]::before {
    content: attr(data-label);
    flex-shrink: 0;
    text-align: left;
    font-size: 12px;
    font-weight: 600;
    color: var(--muted);
  }
  /* 內容較長／多行的欄位（例如公告標題+預覽、備註說明）label 放上面、
     內容放下面整行呈現，避免跟 label 擠在同一行造成溢出或看不全 */
  table.card-table td.card-stack {
    display: block;
    text-align: left;
  }
  table.card-table td.card-stack[data-label]::before {
    display: block;
    margin-bottom: 4px;
  }
  table.card-table tr.zone-row {
    padding: 0;
    border-bottom: 1px solid var(--border);
  }
  table.card-table tr.zone-row td {
    display: block;
    text-align: left;
  }
}

/* Form */
.fi {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: var(--r);
  font-size: 15px;
  background: var(--card);
  color: var(--text);
  transition: border-color .15s;
}
.fi:focus { outline: none; border-color: var(--navy); }
.fl { display: block; font-size: 13px; font-weight: 600; color: var(--muted); margin-bottom: 4px; }

/* Toggle switch（二元開關，取代原生 select） */
.toggle-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  border: none;
  background: none;
  cursor: pointer;
  padding: 0;
  font: inherit;
}
.toggle-switch .track {
  width: 52px;
  height: 28px;
  border-radius: 999px;
  background: var(--border);
  transition: background .15s;
  flex-shrink: 0;
  position: relative;
}
.toggle-switch .knob {
  position: absolute;
  top: 3px; left: 3px;
  width: 22px; height: 22px;
  border-radius: 50%;
  background: #fff;
  box-shadow: var(--shadow-sm);
  transition: transform .15s;
}
.toggle-switch[aria-checked="true"] .track { background: var(--navy); }
.toggle-switch[aria-checked="true"] .knob { transform: translateX(24px); }
.toggle-switch .label { font-size: 14px; font-weight: 600; color: var(--text); white-space: nowrap; }

/* Segmented control（三段選擇，取代原生 select） */
.segmented {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 3px;
  background: var(--bg);
  border-radius: var(--r);
  padding: 3px;
}
.segmented .seg-btn {
  border: none;
  background: transparent;
  color: var(--muted);
  padding: 7px 14px;
  border-radius: var(--r-sm);
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background .15s, color .15s, box-shadow .15s;
}
.segmented .seg-btn.active {
  background: var(--navy);
  color: #fff;
  box-shadow: var(--shadow-sm);
}

/* Modal */
.mo {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
  padding: 16px;
}
.mb {
  background: var(--card);
  border-radius: var(--r);
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0,0,0,.25);
}
.mb-h {
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.mb-h h3 { font-size: 16px; font-weight: 700; color: var(--navy); }
.mb-close { background: none; border: none; font-size: 20px; cursor: pointer; color: var(--muted); line-height: 1; }
.mb-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; }
.mb-foot { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; }

/* Page */
.page { max-width: 1100px; }
.ph { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
.ph h1 { font-size: 20px; font-weight: 700; color: var(--navy); }

/* Stat card（儀表板用） */
.stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--sp-4); }
.stat-card {
  background: var(--card);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-sm);
  padding: var(--sp-4) var(--sp-5);
  border-left: 4px solid var(--navy);
}
.stat-card.c-gold { border-left-color: var(--gold); }
.stat-card.c-sky  { border-left-color: var(--sky); }
.stat-card.c-green{ border-left-color: var(--green); }
.stat-card .stat-label { font-size: 13px; font-weight: 600; color: var(--muted); margin-bottom: var(--sp-2); }
.stat-card .stat-value { font-size: 32px; font-weight: 700; color: var(--text); line-height: 1; }

/* 進度條（出席率等百分比視覺化） */
.bar-track { height: 10px; border-radius: 999px; background: var(--border); overflow: hidden; }
.bar-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--gold), var(--navy)); }

/* Toast */
.toast-wrap { position: fixed; bottom: 24px; right: 24px; z-index: 200; display: flex; flex-direction: column; gap: 8px; }
.toast {
  padding: 12px 18px;
  border-radius: var(--r);
  font-size: 13px;
  font-weight: 500;
  color: #fff;
  box-shadow: 0 4px 16px rgba(0,0,0,.2);
  animation: slide-in .2s ease;
}
.toast-ok  { background: var(--green); }
.toast-err { background: var(--red); }
@keyframes slide-in { from { transform: translateX(60px); opacity: 0; } }

/* Print (used by EDM 產生器「下載 PDF」) */
@media print {
  .topnav, .topmenu { display: none !important; }
  .main { overflow: visible !important; padding: 0 !important; }
}
</style>

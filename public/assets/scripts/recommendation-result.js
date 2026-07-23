'use strict';

// Helper format angka ke Rupiah - expose globally
window.fmt = function fmt(num) {
  if (num === null || num === undefined || isNaN(num) || num === '') return '0';
  const n = Number(num);
  if (isNaN(n)) return '0';
  return n.toLocaleString('id-ID');
};

const Hasil = (() => {
  let barInst = null;

  function compute(answers) {
    try {
      // Check if runSAW is available
      if (typeof runSAW !== 'function') {
        console.error('[SAW] runSAW is not a function!', typeof runSAW);
        console.log('[SAW] window._sawCoreImpl:', typeof window._sawCoreImpl);
        document.getElementById('top-rec').innerHTML = `
          <div style="padding:2rem;text-align:center;color:#FF6600">
            <p>PERINGATAN: Sistem rekomendasi belum siap. Silakan refresh halaman.</p>
            <p style="font-size:0.9rem">runSAW: ${typeof runSAW}, _sawCoreImpl: ${typeof window._sawCoreImpl}</p>
          </div>`;
        return;
      }

      const sawResult = runSAW(answers);
      console.log('[SAW] Result:', sawResult);

      // Check if result is valid
      if (!sawResult || sawResult.error) {
        console.error('[SAW] Error:', sawResult?.error);
        document.getElementById('top-rec').innerHTML = `
          <div style="padding:2rem;text-align:center;color:#FF6600">
            <p>PERINGATAN: ${sawResult?.error || 'Terjadi kesalahan tidak dikenal'}</p>
          </div>`;
        return;
      }

      // Extract results from SAW output
      const results = sawResult.results || [];
      const weights = sawResult.weights || {};
      const relaxed = sawResult.calculation?.appliedRelaxation || [];
      const topReasons = results.length > 0 && results[0].reasons ? results[0].reasons : [];
      const closeRace = sawResult.meta?.closeRace || false;
      const confidence = sawResult.meta?.confidence || 0.5;

      if (results.length === 0) {
        document.getElementById('top-rec').innerHTML = `
          <div style="padding:2rem;text-align:center;color:#FF6600">
            <p>PERINGATAN: Tidak ada motor yang cocok dengan preferensi Anda</p>
            <p style="font-size:0.9rem">Coba ubah filter atau budget Anda</p>
          </div>`;
        return;
      }

      render(results, weights, answers, { relaxed, topReasons, closeRace, confidence });
      showPage('hasil');

      // Simpan ke riwayat
      saveToHistory(answers, { results, weights, top3: results.slice(0, 3) }, results[0] || null);
    } catch (err) {
      console.error('SAW Error:', err);
      document.getElementById('top-rec').innerHTML = `
        <div style="padding:2rem;text-align:center;color:#FF6600">
          <p>PERINGATAN: Terjadi kesalahan: ${err.message}</p>
          <p style="font-size:0.8rem;color:#999">Stack: ${err.stack}</p>
        </div>`;
    }
  }

  async function saveToHistory(answers, result, topMotor) {
    try {
      // Auth service menggunakan localStorage
      const token = localStorage.getItem('motormatch_token') || '';
      if (!token) return;

      await fetch('/api/history/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answers, result, topMotor })
      });
    } catch (e) {
      console.error('Gagal menyimpan riwayat:', e);
    }
  }

  function render(results, weights, answers, meta) {
    // Handle empty results
    if (!results || results.length === 0) {
      document.getElementById('top-rec').innerHTML = `
        <div style="padding:2rem;text-align:center;color:var(--muted)">
          <p style="font-size:1.2rem;margin-bottom:1rem">PERINGATAN: Tidak ada motor yang cocok dengan preferensi Anda</p>
          <p style="font-size:0.9rem">Coba ubah filter atau budget Anda</p>
        </div>`;
      document.getElementById('insight-strip').innerHTML = '';
      document.getElementById('rank-grid').innerHTML = '';
      document.getElementById('saw-weights').innerHTML = '';
      document.getElementById('saw-tbody').innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--muted)">Tidak ada data</td></tr>';
      return;
    }

    const usageMap = { harian:'Harian', touring:'Touring', sport:'Sport', keluarga:'Keluarga' };
    const prioMap  = { harga:'Harga', bbm:'Irit BBM', performa:'Performa', nyaman:'Kenyamanan' };
    const ccMap    = { kecil1:'100–150cc', kecil2:'151–250cc', sedang:'251–600cc', besar:'601–1000cc' };
    const tipe     = answers.tipe === 'null' ? 'Semua' : answers.tipe;
    const cc       = ccMap[answers.cc] || 'Semua';
    const { relaxed = [], topReasons = [], closeRace = false, confidence = 1 } = meta || {};

    const prefEl = document.getElementById('hasil-pref');
    // Alur sederhana: hanya jenis motor yang dipilih (tanpa pertanyaan lain)
    const isSimple = answers.usage === undefined && answers.prioritas === undefined;
    prefEl.innerHTML = isSimple
      ? `Jenis Motor: <b>${tipe}</b> · Diurutkan dengan bobot seimbang (harga, BBM, performa, kenyamanan) · ${results.length} motor dianalisa`
      : `Penggunaan: ${usageMap[answers.usage]||'-'} · Tipe: ${tipe} · Prioritas: ${prioMap[answers.prioritas]||'-'} · CC: ${cc} · ${results.length} motor dianalisa`;

    const confidencePct = Math.round(confidence * 100);
    let confidenceLbl, confidenceClr;
    if (confidencePct >= 70)      { confidenceLbl = 'Sangat Yakin'; confidenceClr = '#0066FF'; }
    else if (confidencePct >= 40) { confidenceLbl = 'Cukup Yakin';  confidenceClr = '#FF6600'; }
    else                          { confidenceLbl = 'Mirip-Mirip';  confidenceClr = '#9ca3af'; }

    if (topReasons.length && results[0]) {
      prefEl.innerHTML +=
        `<div style="margin-top:10px;padding:10px 14px;background:rgba(0,102,255,0.08);` +
        `border-left:3px solid #0066FF;border-radius:6px;color:#0066FF;font-size:.9em;line-height:1.5">` +
        `BEST: <b>${results[0].brand} ${results[0].model}</b> menang karena ${topReasons.map(r => `<b>${r}</b>`).join(' · ')}.` +
        `<span style="float:right;color:${confidenceClr}">${confidenceLbl} (${confidencePct}%)</span>` +
        `</div>`;
    }

    if (closeRace && results.length > 1) {
      const r2 = results[1];
      prefEl.innerHTML +=
        `<div style="margin-top:8px;padding:10px 14px;background:rgba(255,102,0,0.08);` +
        `border-left:3px solid #FF6600;border-radius:6px;color:#FF6600;font-size:.9em;line-height:1.5">` +
        `<b>Skor sangat ketat</b> — <b>${r2.brand} ${r2.model}</b> hanya tertinggal tipis. Pertimbangkan keduanya.` +
        `</div>`;
    }

    if (relaxed && relaxed.length) {
      prefEl.innerHTML +=
        `<div style="margin-top:8px;padding:10px 14px;background:rgba(255,102,0,0.10);` +
        `border-left:3px solid #FF6600;border-radius:6px;color:#FF6600;font-size:.9em;line-height:1.5">` +
        `CATATAN: Filter preferensi Anda dilonggarkan agar hasil cukup banyak — ${relaxed.join(' · ')}.` +
        `</div>`;
    }

    renderTopCard(results[0], answers);
    renderInsight(results, answers);
    renderRankGrid(results);
    renderWeights(weights, answers);
    renderTable(results);
    renderCharts(results);
  }

  function renderTopCard(top, tinggiUser) {
    if (!top) {
      document.getElementById('top-rec').innerHTML = `
        <div style="padding:2rem;text-align:center;color:var(--muted)">
          <p style="font-size:1.2rem">Tidak ada motor yang cocok</p>
        </div>`;
      return;
    }
    const pct = Math.round((top.Vi || 0) * 100);
    const ergoPct = Math.round((top.ergoScore || 0.8) * 100);

    // Hitung tinggi minimum motor
    const seatH = Number(top.seat_h) || 760;
    const minTinggi = Math.round((seatH - 600) * 0.22 + 120);

    // Interpretasi match
    let ergoLabel, ergoColor;
    if (ergoPct >= 90) { ergoLabel = 'Sangat Cocok'; ergoColor = '#00b348'; }
    else if (ergoPct >= 75) { ergoLabel = 'Cocok'; ergoColor = '#0066FF'; }
    else if (ergoPct >= 60) { ergoLabel = 'Cukup'; ergoColor = '#FF6600'; }
    else { ergoLabel = 'Kurang'; ergoColor = '#dc2626'; }

    document.getElementById('top-rec').innerHTML = `
      <div class="top-rec-inner">
        <div>
          <div class="top-badge">REKOMENDASI TERBAIK #1</div>
          <div class="top-name">${top.brand} ${top.model}</div>
          <div class="top-desc">
            ${top.category} · ${top.cc}cc · Tahun ${top.year}.
            Motor dengan nilai tertinggi berdasarkan preferensi yang Anda isi.
          </div>
          <div class="top-specs">
            <div>
              <div class="spec-lbl">Harga OTR</div>
              <div class="spec-val accent">Rp ${fmt(top.harga)}</div>
            </div>
            <div>
              <div class="spec-lbl">Tenaga</div>
              <div class="spec-val">${top.power} hp</div>
            </div>
            <div>
              <div class="spec-lbl">Efisiensi BBM</div>
              <div class="spec-val green">${top.bbm} km/L</div>
            </div>
            <div>
              <div class="spec-lbl">Torsi</div>
              <div class="spec-val">${top.torque} Nm</div>
            </div>
          </div>
          <div class="top-specs" style="margin-top:0.75rem;">
            <div>
              <div class="spec-lbl">Tinggi Min</div>
              <div class="spec-val">${minTinggi} cm</div>
            </div>
            <div>
              <div class="spec-lbl">Tinggi Jok</div>
              <div class="spec-val">${seatH} mm</div>
            </div>
            <div>
              <div class="spec-lbl">Body Match</div>
              <div class="spec-val" style="color:${ergoColor};font-weight:700">${ergoPct}%</div>
            </div>
          </div>
          <button class="btn-ghost" data-modal-id="${top.id}">Lihat Detail Spesifikasi</button>
        </div>
        <div class="top-img-side">
          <div class="score-ring">
            <div class="score-num">${pct}</div>
            <div class="score-lbl">Score</div>
          </div>
          <img class="top-motor-img" src="${top.img}" alt="${top.model}" loading="lazy"
               onerror="this.onerror=null;this.src='assets/images/placeholder.svg'">
        </div>
      </div>`;
  }

  function renderInsight(results, answers) {
    if (!results || results.length === 0) {
      document.getElementById('insight-strip').innerHTML = '';
      return;
    }
    const top      = results[0] || {};
    const cheapest = results.reduce((a, b) => (a.harga || 0) < (b.harga || 0) ? a : b, results[0] || {});
    const frugal   = results.reduce((a, b) => (a.bbm || 0) > (b.bbm || 0) ? a : b, results[0] || {});
    const fastest  = results.reduce((a, b) => (a.power || 0) > (b.power || 0) ? a : b, results[0] || {});

    const tinggiUser = answers.tinggi ? Number(answers.tinggi) : null;

    document.getElementById('insight-strip').innerHTML = `
      <div class="insight-card">
        <div class="insight-icon">-</div>
        <div class="insight-lbl">Motor Dianalisa</div>
        <div class="insight-val">${results.length} model</div>
      </div>
      <div class="insight-card">
        <div class="insight-icon">*</div>
        <div class="insight-lbl">Skor ML</div>
        <div class="insight-val" style="color:var(--accent)">${Math.round((top.Vi || 0) * 100)}%</div>
      </div>
      <div class="insight-card">
        <div class="insight-icon">$</div>
        <div class="insight-lbl">Paling Terjangkau</div>
        <div class="insight-val" style="color:var(--muted);font-size:.82rem">Rp ${fmt(cheapest.harga || 0)}</div>
      </div>
      <div class="insight-card">
        <div class="insight-icon">+</div>
        <div class="insight-lbl">Paling Kuat</div>
        <div class="insight-val" style="color:var(--orange);font-size:.82rem">${fastest.power || 0} hp</div>
      </div>
      <div class="insight-card">
        <div class="insight-icon">~</div>
        <div class="insight-lbl">Paling Irit</div>
        <div class="insight-val" style="color:var(--green)">${frugal.bbm || 0} km/L</div>
      </div>
      ${tinggiUser ? `
      <div class="insight-card">
        <div class="insight-icon">_</div>
        <div class="insight-lbl">Body Match</div>
        <div class="insight-val" style="color:${Math.round((top.ergoScore || 0.8) * 100) >= 75 ? 'var(--green)' : 'var(--orange)'}">${Math.round((top.ergoScore || 0.8) * 100)}%</div>
      </div>
      ` : ''}`;
  }

  function renderRankGrid(results) {
    if (!results || results.length <= 1) {
      document.getElementById('rank-grid').innerHTML = '';
      return;
    }
    const slice = results.slice(1, 7);

    document.getElementById('rank-grid').innerHTML = slice.map(m => {
      const pct = Math.round((m.Vi || 0) * 100);
      const ergoPct = Math.round((m.ergoScore || 0.8) * 100);
      const clr = pct >= 80 ? '#0066FF' : pct >= 60 ? '#FF6600' : '#9ca3af';

      // Hitung tinggi minimum motor
      const seatH = Number(m.seat_h) || 760;
      const minTinggi = Math.round((seatH - 600) * 0.22 + 120);

      return `
        <div class="rank-card" data-modal-id="${m.id}">
          <div class="rank-img">
            <span class="rank-num-badge">#${m.rank || '?'}</span>
            <img src="${m.img || 'assets/images/placeholder.svg'}" alt="${m.model || 'Motor'}" loading="lazy"
                 onerror="this.onerror=null;this.src='assets/images/placeholder.svg'"
                 style="width:100%;height:100%;object-fit:contain;padding:.5rem">
          </div>
          <div class="rank-body">
            <div class="rank-name">${m.brand || ''} ${m.model || ''}</div>
            <div class="rank-price">Rp ${fmt(m.harga || 0)}</div>
            <div style="display:flex;gap:0.5rem;font-size:0.75rem;color:var(--muted);margin-bottom:0.5rem;">
              <span>${m.cc}cc</span>
              <span>·</span>
              <span>${m.category}</span>
              <span>·</span>
              <span>Min ${minTinggi}cm</span>
              <span>·</span>
              <span style="color:${ergoPct >= 75 ? 'var(--green)' : 'var(--orange)'}">Body ${ergoPct}%</span>
            </div>
            <div class="rank-bar-wrap">
              <div class="rank-bar-label">Skor ML</div>
              <div class="rank-bar">
                <div class="rank-bar-fill" style="width:${pct}%;background:${clr}"></div>
              </div>
              <div class="rank-pct" style="color:${clr}">${pct}%</div>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  function renderWeights(weights, answers) {
    const mlMethod = document.getElementById('ml-method');
    if (mlMethod) {
      mlMethod.textContent = 'ML Engine: KNN + Cosine Similarity';
    }

    // ML Feature weights
    const featureWeights = {
      harga: weights?.C1 || 0.15,
      bbm: weights?.C2 || 0.15,
      power: weights?.C3 || 0.15,
      nyaman: weights?.C4 || 0.10
    };

    // Tentukan prioritas utama
    const prioritas = answers?.prioritas || 'seimbang';
    let utamaLabel = '';
    switch(prioritas) {
      case 'harga': utamaLabel = 'Harga'; break;
      case 'bbm': utamaLabel = 'BBM'; break;
      case 'performa': utamaLabel = 'Performa'; break;
      case 'nyaman': utamaLabel = 'Nyaman'; break;
      default: utamaLabel = 'Seimbang';
    }

    document.getElementById('saw-weights').innerHTML = `
      <div style="margin-bottom:0.75rem;font-size:0.8rem;color:var(--muted);">
        Prioritas: <strong style="color:var(--accent)">${utamaLabel}</strong>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">
        <div class="w-chip">Harga: <strong>${Math.round(featureWeights.harga * 100)}%</strong></div>
        <div class="w-chip">BBM: <strong>${Math.round(featureWeights.bbm * 100)}%</strong></div>
        <div class="w-chip">Performa: <strong>${Math.round(featureWeights.power * 100)}%</strong></div>
        <div class="w-chip">Nyaman: <strong>${Math.round(featureWeights.nyaman * 100)}%</strong></div>
      </div>`;
  }

  function renderTable(results) {
    if (!results || results.length === 0) {
      document.getElementById('saw-tbody').innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--muted)">Tidak ada data</td></tr>';
      return;
    }
    document.getElementById('saw-tbody').innerHTML = results.map((m, i) => `
      <tr class="${i === 0 ? 'rank-first' : ''}">
        <td>${m.rank || i + 1}</td>
        <td><strong>${m.brand || ''} ${m.model || ''}</strong><br>
            <small style="color:var(--muted)">${m.cc || 0}cc · ${m.category || ''}</small></td>
        <td class="${i === 0 ? 'best-val' : ''}">${(m.sawScore || 0).toFixed(3)}</td>
        <td class="${i === 0 ? 'best-val' : ''}">${(m.ergoScore || 0).toFixed(3)}</td>
        <td>${(m.normalized?.harga || 0).toFixed(2)}</td>
        <td>${(m.normalized?.bbm || 0).toFixed(2)}</td>
        <td>${(m.normalized?.power || 0).toFixed(2)}</td>
        <td class="skor-cell">${(m.Vi || 0).toFixed(4)}</td>
      </tr>`).join('');
  }

  function initTabs() {
    document.querySelectorAll('.saw-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.saw-tab').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        document.querySelectorAll('.saw-tab-panel').forEach(p => p.classList.add('saw-tab-hidden'));
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        document.getElementById('tab-' + btn.dataset.tab).classList.remove('saw-tab-hidden');
      });
    });
  }

  function renderCharts(results) {
    if (barInst) { barInst.destroy(); barInst = null; }
    initTabs();

    Chart.defaults.color       = '#6b7280';
    Chart.defaults.borderColor = 'rgba(0,0,0,.07)';

    const chartData = results.slice(0, 15);

    barInst = new Chart(document.getElementById('barChart'), {
      type: 'bar',
      data: {
        labels: chartData.map(m => `${m.brand} ${m.model}`),
        datasets: [{
          label: 'Skor (%)',
          data: chartData.map(m => Math.round(m.Vi * 10000) / 100),
          backgroundColor: chartData.map((_, i) =>
            i === 0 ? 'rgba(0,102,255,.85)' :
            i < 3   ? 'rgba(0,102,255,.50)' :
                      'rgba(156,163,175,.4)'
          ),
          borderRadius: 4,
        }]
      },
      options: {
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: ctx => ` Skor: ${ctx.raw}%` }
          },
        },
        scales: {
          x: {
            ticks: { color: '#6b7280' },
            grid:  { color: 'rgba(0,0,0,.06)' },
          },
          y: {
            ticks: { color: '#6b7280', font: { size: 10 } },
            grid:  { color: 'rgba(0,0,0,.06)' },
          },
        },
      },
    });
  }

  return { compute };
})();

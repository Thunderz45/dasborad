/* ═══════════════════════════════════════════════════════════════
   MARKETING EXECUTIVE DASHBOARD — Application Logic
   Loads Marketing_Dashboard.csv and renders all charts/KPIs
   ═══════════════════════════════════════════════════════════════ */

// ─── GLOBALS ───
let rawData = [];
let filteredData = [];
let charts = {};
const STATE_NAMES = { TN: 'Tamil Nadu', KA: 'Karnataka', DL: 'Delhi', TS: 'Telangana', WB: 'West Bengal', MH: 'Maharashtra' };
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COLORS = {
    blue: '#38BDF8', green: '#10B981', orange: '#F59E0B', red: '#EF4444',
    purple: '#8B5CF6', pink: '#EC4899', cyan: '#06B6D4', indigo: '#6366F1',
    lime: '#84CC16', rose: '#F43F5E',
    blueAlpha: 'rgba(56,189,248,0.15)', greenAlpha: 'rgba(16,185,129,0.15)',
    orangeAlpha: 'rgba(245,158,11,0.15)', purpleAlpha: 'rgba(139,92,246,0.15)',
    palette: ['#38BDF8', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#6366F1', '#F97316'],
    paletteBg: [
        'rgba(56,189,248,0.18)', 'rgba(16,185,129,0.18)', 'rgba(245,158,11,0.18)',
        'rgba(139,92,246,0.18)', 'rgba(236,72,153,0.18)', 'rgba(6,182,212,0.18)',
        'rgba(99,102,241,0.18)', 'rgba(249,115,22,0.18)'
    ]
};

// ─── CHART.JS DEFAULTS ───
Chart.defaults.color = '#94A3B8';
Chart.defaults.borderColor = 'rgba(56,189,248,0.08)';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.font.size = 11;
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.pointStyle = 'circle';
Chart.defaults.plugins.legend.labels.padding = 16;
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15,23,42,0.95)';
Chart.defaults.plugins.tooltip.borderColor = 'rgba(56,189,248,0.2)';
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.cornerRadius = 10;
Chart.defaults.plugins.tooltip.padding = 12;
Chart.defaults.plugins.tooltip.titleFont = { weight: '600', size: 12 };
Chart.defaults.plugins.tooltip.bodyFont = { size: 11 };
Chart.defaults.elements.bar.borderRadius = 6;
Chart.defaults.elements.bar.borderSkipped = false;
Chart.defaults.elements.point.radius = 3;
Chart.defaults.elements.point.hoverRadius = 6;
Chart.defaults.elements.line.tension = 0.35;
Chart.defaults.responsive = true;
Chart.defaults.maintainAspectRatio = false;
Chart.defaults.animation = { duration: 700, easing: 'easeOutQuart' };

// ─── FORMATTING HELPERS ───
function fmt(n) {
    if (n >= 1e9) return '₹' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e7) return '₹' + (n / 1e7).toFixed(1) + 'Cr';
    if (n >= 1e5) return '₹' + (n / 1e5).toFixed(1) + 'L';
    if (n >= 1e3) return '₹' + (n / 1e3).toFixed(1) + 'K';
    return '₹' + n.toFixed(0);
}

function fmtNum(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n.toFixed(0);
}

function fmtPct(n) { return n.toFixed(2) + '%'; }
function fmtDec(n) { return n.toFixed(2) + '×'; }
function fmtCurr(n) { return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 }); }
function fmtCurrShort(n) {
    if (n >= 1e7) return '₹' + (n / 1e7).toFixed(2) + ' Cr';
    if (n >= 1e5) return '₹' + (n / 1e5).toFixed(1) + ' L';
    return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

// ─── DATA AGGREGATION ───
function aggregate(data, key) {
    const map = {};
    data.forEach(r => {
        const k = r[key];
        if (!map[k]) map[k] = { revenue: 0, spend: 0, sales: 0, leads: 0, clicks: 0, impressions: 0, roas_sum: 0, ctr_sum: 0, cpc_sum: 0, cac_sum: 0, rating_sum: 0, count: 0 };
        const m = map[k];
        m.revenue += r.Revenue;
        m.spend += r.AdSpend;
        m.sales += r.Sales;
        m.leads += r.Leads;
        m.clicks += r.Clicks;
        m.impressions += r.Impressions;
        m.roas_sum += r.ROAS;
        m.ctr_sum += r.CTR;
        m.cpc_sum += r.CPC;
        m.cac_sum += r.CAC;
        m.rating_sum += r.Rating;
        m.count++;
    });
    return map;
}

function aggregateMonthly(data) {
    const map = {};
    data.forEach(r => {
        const m = r.Date.substring(0, 7);
        if (!map[m]) map[m] = { revenue: 0, spend: 0, sales: 0, leads: 0, clicks: 0, impressions: 0, roas_sum: 0, count: 0 };
        const o = map[m];
        o.revenue += r.Revenue;
        o.spend += r.AdSpend;
        o.sales += r.Sales;
        o.leads += r.Leads;
        o.clicks += r.Clicks;
        o.impressions += r.Impressions;
        o.roas_sum += r.ROAS;
        o.count++;
    });
    return map;
}

function aggregateChannelMonthly(data) {
    const map = {};
    data.forEach(r => {
        const ch = r.Channel;
        const m = r.Date.substring(0, 7);
        if (!map[ch]) map[ch] = {};
        if (!map[ch][m]) map[ch][m] = { revenue: 0 };
        map[ch][m].revenue += r.Revenue;
    });
    return map;
}

function aggregateProductMonthly(data) {
    const map = {};
    data.forEach(r => {
        const p = r.Product;
        const m = r.Date.substring(0, 7);
        if (!map[p]) map[p] = {};
        if (!map[p][m]) map[p][m] = { revenue: 0 };
        map[p][m].revenue += r.Revenue;
    });
    return map;
}

function totals(data) {
    const t = { revenue: 0, spend: 0, sales: 0, leads: 0, clicks: 0, impressions: 0, roas_sum: 0, ctr_sum: 0, cpc_sum: 0, cac_sum: 0, count: data.length };
    data.forEach(r => {
        t.revenue += r.Revenue; t.spend += r.AdSpend; t.sales += r.Sales;
        t.leads += r.Leads; t.clicks += r.Clicks; t.impressions += r.Impressions;
        t.roas_sum += r.ROAS; t.ctr_sum += r.CTR; t.cpc_sum += r.CPC; t.cac_sum += r.CAC;
    });
    return t;
}

// ─── KPI CARD GENERATOR ───
function renderKPIs(containerId, kpis) {
    const container = document.getElementById(containerId);
    container.innerHTML = kpis.map(k => `
        <div class="kpi-card">
            <span class="kpi-icon">${k.icon}</span>
            <div class="kpi-value">${k.value}</div>
            <div class="kpi-label">${k.label}</div>
        </div>
    `).join('');
}

// ─── CHART FACTORY ───
function destroyChart(id) {
    if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

function createChart(id, config) {
    destroyChart(id);
    const ctx = document.getElementById(id);
    if (!ctx) return null;
    charts[id] = new Chart(ctx.getContext('2d'), config);
    return charts[id];
}

// ─── PAGE RENDERERS ───

function renderExecutivePage(data) {
    const t = totals(data);
    const roi = t.spend > 0 ? ((t.revenue - t.spend) / t.spend * 100) : 0;
    const convRate = t.leads > 0 ? (t.sales / t.leads * 100) : 0;
    const avgRoas = t.count > 0 ? t.roas_sum / t.count : 0;
    const avgCtr = t.count > 0 ? (t.ctr_sum / t.count * 100) : 0;
    const avgCpc = t.count > 0 ? t.cpc_sum / t.count : 0;

    renderKPIs('exec-kpis', [
        { icon: '💰', value: fmtCurrShort(t.revenue), label: 'Total Revenue' },
        { icon: '📊', value: fmtCurrShort(t.spend), label: 'Total Ad Spend' },
        { icon: '🛒', value: fmtNum(t.sales), label: 'Total Sales' },
        { icon: '👥', value: fmtNum(t.leads), label: 'Total Leads' },
        { icon: '🖱️', value: fmtNum(t.clicks), label: 'Total Clicks' },
        { icon: '👁️', value: fmtNum(t.impressions), label: 'Total Impressions' },
        { icon: '📈', value: fmtDec(avgRoas), label: 'Average ROAS' },
        { icon: '🎯', value: fmtPct(avgCtr), label: 'Average CTR' },
        { icon: '🚀', value: fmtPct(roi), label: 'ROI' },
    ]);

    // Monthly data
    const monthly = aggregateMonthly(data);
    const months = Object.keys(monthly).sort();
    const labels = months.map(m => MONTH_NAMES[parseInt(m.split('-')[1]) - 1] + ' ' + m.split('-')[0].slice(2));

    // Revenue Trend
    createChart('revenueTrendChart', {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Revenue',
                data: months.map(m => monthly[m].revenue),
                borderColor: COLORS.blue,
                backgroundColor: COLORS.blueAlpha,
                fill: true,
                borderWidth: 2.5,
                pointBackgroundColor: COLORS.blue,
            }]
        },
        options: {
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => 'Revenue: ' + fmtCurrShort(ctx.raw) } }
            },
            scales: {
                y: { ticks: { callback: v => fmt(v) }, grid: { color: 'rgba(56,189,248,0.06)' } },
                x: { grid: { display: false } }
            }
        }
    });

    // ROAS Trend
    createChart('roasTrendChart', {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Avg ROAS',
                data: months.map(m => monthly[m].roas_sum / monthly[m].count),
                borderColor: COLORS.green,
                backgroundColor: COLORS.greenAlpha,
                fill: true,
                borderWidth: 2.5,
                pointBackgroundColor: COLORS.green,
            }]
        },
        options: {
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => 'ROAS: ' + ctx.raw.toFixed(2) + '×' } }
            },
            scales: {
                y: { ticks: { callback: v => v.toFixed(0) + '×' }, grid: { color: 'rgba(56,189,248,0.06)' } },
                x: { grid: { display: false } }
            }
        }
    });

    // Sales & Leads Trend
    createChart('salesTrendChart', {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Sales',
                    data: months.map(m => monthly[m].sales),
                    backgroundColor: COLORS.palette[0],
                    borderRadius: 6,
                    barPercentage: 0.5,
                },
                {
                    label: 'Leads',
                    data: months.map(m => monthly[m].leads),
                    backgroundColor: COLORS.palette[2],
                    borderRadius: 6,
                    barPercentage: 0.5,
                }
            ]
        },
        options: {
            plugins: { tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + fmtNum(ctx.raw) } } },
            scales: {
                y: { ticks: { callback: v => fmtNum(v) }, grid: { color: 'rgba(56,189,248,0.06)' } },
                x: { grid: { display: false } }
            }
        }
    });

    // Revenue vs Spend
    createChart('revenueVsSpendChart', {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Revenue',
                    data: months.map(m => monthly[m].revenue),
                    backgroundColor: 'rgba(56,189,248,0.7)',
                    borderRadius: 6,
                    barPercentage: 0.6,
                },
                {
                    label: 'Ad Spend',
                    data: months.map(m => monthly[m].spend),
                    backgroundColor: 'rgba(139,92,246,0.7)',
                    borderRadius: 6,
                    barPercentage: 0.6,
                }
            ]
        },
        options: {
            plugins: { tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + fmtCurrShort(ctx.raw) } } },
            scales: {
                y: { ticks: { callback: v => fmt(v) }, grid: { color: 'rgba(56,189,248,0.06)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderCampaignPage(data) {
    const t = totals(data);
    const active = data.filter(r => r.Status === 'Active').length;
    const paused = data.filter(r => r.Status === 'Paused').length;
    const avgRoas = t.count > 0 ? t.roas_sum / t.count : 0;
    const avgRating = t.count > 0 ? data.reduce((s, r) => s + r.Rating, 0) / t.count : 0;

    renderKPIs('campaign-kpis', [
        { icon: '📋', value: fmtNum(t.count), label: 'Total Campaigns' },
        { icon: '✅', value: fmtNum(active), label: 'Active Campaigns' },
        { icon: '⏸️', value: fmtNum(paused), label: 'Paused Campaigns' },
        { icon: '📈', value: fmtDec(avgRoas), label: 'Avg ROAS' },
        { icon: '⭐', value: avgRating.toFixed(2), label: 'Avg Rating' },
    ]);

    // Top 10 Campaigns
    const sorted = [...data].sort((a, b) => b.Revenue - a.Revenue).slice(0, 10);
    createChart('top10Chart', {
        type: 'bar',
        data: {
            labels: sorted.map(r => 'C-' + r.CampaignID),
            datasets: [{
                label: 'Revenue',
                data: sorted.map(r => r.Revenue),
                backgroundColor: sorted.map((_, i) => COLORS.palette[i % COLORS.palette.length]),
                borderRadius: 8,
            }]
        },
        options: {
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => 'Revenue: ' + fmtCurrShort(ctx.raw) } }
            },
            scales: {
                x: { ticks: { callback: v => fmt(v) }, grid: { color: 'rgba(56,189,248,0.06)' } },
                y: { grid: { display: false } }
            }
        }
    });

    // Active vs Paused Donut
    createChart('statusChart', {
        type: 'doughnut',
        data: {
            labels: ['Active', 'Paused'],
            datasets: [{
                data: [active, paused],
                backgroundColor: [COLORS.green, COLORS.orange],
                borderColor: 'transparent',
                borderWidth: 0,
                hoverOffset: 8,
            }]
        },
        options: {
            cutout: '65%',
            plugins: {
                legend: { position: 'bottom' },
                tooltip: { callbacks: { label: ctx => ctx.label + ': ' + ctx.raw + ' (' + ((ctx.raw / t.count) * 100).toFixed(1) + '%)' } }
            }
        }
    });

    // Objective Performance
    const objAgg = aggregate(data, 'Objective');
    const objKeys = Object.keys(objAgg).sort((a, b) => objAgg[b].revenue - objAgg[a].revenue);
    createChart('objectiveChart', {
        type: 'doughnut',
        data: {
            labels: objKeys,
            datasets: [{
                data: objKeys.map(k => objAgg[k].revenue),
                backgroundColor: [COLORS.blue, COLORS.green, COLORS.purple],
                borderColor: 'transparent',
                borderWidth: 0,
                hoverOffset: 8,
            }]
        },
        options: {
            cutout: '60%',
            plugins: {
                legend: { position: 'bottom' },
                tooltip: { callbacks: { label: ctx => ctx.label + ': ' + fmtCurrShort(ctx.raw) } }
            }
        }
    });

    // Funnel Chart (Impressions → Clicks → Leads → Sales)
    createChart('funnelChart', {
        type: 'bar',
        data: {
            labels: ['Impressions', 'Clicks', 'Leads', 'Sales'],
            datasets: [{
                label: 'Count',
                data: [t.impressions, t.clicks, t.leads, t.sales],
                backgroundColor: [COLORS.blue, COLORS.cyan, COLORS.orange, COLORS.green],
                borderRadius: 8,
                barPercentage: 0.65,
            }]
        },
        options: {
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => ctx.label + ': ' + fmtNum(ctx.raw) } }
            },
            scales: {
                x: { type: 'logarithmic', ticks: { callback: v => fmtNum(v) }, grid: { color: 'rgba(56,189,248,0.06)' } },
                y: { grid: { display: false } }
            }
        }
    });

    // Campaign Table (Top 20)
    const top20 = [...data].sort((a, b) => b.Revenue - a.Revenue).slice(0, 20);
    const wrapper = document.getElementById('campaignTableWrapper');
    wrapper.innerHTML = `<table>
        <thead><tr>
            <th>ID</th><th>Date</th><th>Channel</th><th>Product</th><th>State</th>
            <th>Revenue</th><th>Spend</th><th>ROAS</th><th>Sales</th><th>Leads</th>
            <th>Status</th><th>Rating</th><th>Manager</th>
        </tr></thead>
        <tbody>${top20.map(r => `<tr>
            <td>${r.CampaignID}</td>
            <td>${r.Date}</td>
            <td>${r.Channel}</td>
            <td>${r.Product}</td>
            <td>${STATE_NAMES[r.State] || r.State}</td>
            <td>${fmtCurrShort(r.Revenue)}</td>
            <td>${fmtCurrShort(r.AdSpend)}</td>
            <td>${r.ROAS.toFixed(2)}×</td>
            <td>${r.Sales.toLocaleString()}</td>
            <td>${r.Leads.toLocaleString()}</td>
            <td class="status-${r.Status.toLowerCase()}">${r.Status}</td>
            <td class="rating-stars">${'★'.repeat(r.Rating)}${'☆'.repeat(5 - r.Rating)}</td>
            <td>${r.Manager}</td>
        </tr>`).join('')}</tbody>
    </table>`;
}

function renderChannelPage(data) {
    const agg = aggregate(data, 'Channel');
    const chKeys = Object.keys(agg).sort((a, b) => agg[b].revenue - agg[a].revenue);

    // Best channel KPIs
    const bestRev = chKeys[0];
    const bestRoas = chKeys.reduce((a, b) => (agg[a].roas_sum / agg[a].count) > (agg[b].roas_sum / agg[b].count) ? a : b);
    const bestCpc = chKeys.reduce((a, b) => (agg[a].cpc_sum / agg[a].count) < (agg[b].cpc_sum / agg[b].count) ? a : b);
    const t = totals(data);

    renderKPIs('channel-kpis', [
        { icon: '🏆', value: bestRev, label: 'Highest Revenue Channel' },
        { icon: '📈', value: bestRoas, label: 'Highest ROAS Channel' },
        { icon: '💵', value: bestCpc, label: 'Lowest CPC Channel' },
        { icon: '📡', value: chKeys.length.toString(), label: 'Total Channels' },
        { icon: '💰', value: fmtCurrShort(t.revenue), label: 'Total Revenue' },
    ]);

    // Revenue by Channel
    createChart('channelRevenueChart', {
        type: 'bar',
        data: {
            labels: chKeys,
            datasets: [{
                label: 'Revenue',
                data: chKeys.map(k => agg[k].revenue),
                backgroundColor: chKeys.map((_, i) => COLORS.palette[i]),
                borderRadius: 8,
                barPercentage: 0.6,
            }]
        },
        options: {
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => 'Revenue: ' + fmtCurrShort(ctx.raw) } }
            },
            scales: {
                y: { ticks: { callback: v => fmt(v) }, grid: { color: 'rgba(56,189,248,0.06)' } },
                x: { grid: { display: false } }
            }
        }
    });

    // ROAS by Channel
    createChart('channelRoasChart', {
        type: 'bar',
        data: {
            labels: chKeys,
            datasets: [{
                label: 'Avg ROAS',
                data: chKeys.map(k => agg[k].roas_sum / agg[k].count),
                backgroundColor: chKeys.map((_, i) => COLORS.palette[i]),
                borderRadius: 8,
                barPercentage: 0.6,
            }]
        },
        options: {
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => 'ROAS: ' + ctx.raw.toFixed(2) + '×' } }
            },
            scales: {
                y: { ticks: { callback: v => v.toFixed(0) + '×' }, grid: { color: 'rgba(56,189,248,0.06)' } },
                x: { grid: { display: false } }
            }
        }
    });

    // CTR by Channel (Doughnut)
    createChart('channelCtrChart', {
        type: 'doughnut',
        data: {
            labels: chKeys,
            datasets: [{
                data: chKeys.map(k => (agg[k].ctr_sum / agg[k].count * 100)),
                backgroundColor: COLORS.palette.slice(0, chKeys.length),
                borderColor: 'transparent',
                hoverOffset: 8,
            }]
        },
        options: {
            cutout: '55%',
            plugins: {
                legend: { position: 'bottom' },
                tooltip: { callbacks: { label: ctx => ctx.label + ' CTR: ' + ctx.raw.toFixed(2) + '%' } }
            }
        }
    });

    // CPC by Channel
    createChart('channelCpcChart', {
        type: 'bar',
        data: {
            labels: chKeys,
            datasets: [{
                label: 'Avg CPC',
                data: chKeys.map(k => agg[k].cpc_sum / agg[k].count),
                backgroundColor: chKeys.map((_, i) => COLORS.palette[i]),
                borderRadius: 8,
                barPercentage: 0.6,
            }]
        },
        options: {
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => 'CPC: ₹' + ctx.raw.toFixed(2) } }
            },
            scales: {
                y: { ticks: { callback: v => '₹' + v }, grid: { color: 'rgba(56,189,248,0.06)' } },
                x: { grid: { display: false } }
            }
        }
    });

    // Channel Over Time
    const chMonthly = aggregateChannelMonthly(data);
    const allMonths = [...new Set(data.map(r => r.Date.substring(0, 7)))].sort();
    const timeLabels = allMonths.map(m => MONTH_NAMES[parseInt(m.split('-')[1]) - 1]);
    const channels = Object.keys(chMonthly);
    createChart('channelTimeChart', {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: channels.map((ch, i) => ({
                label: ch,
                data: allMonths.map(m => (chMonthly[ch][m] || { revenue: 0 }).revenue),
                borderColor: COLORS.palette[i % COLORS.palette.length],
                backgroundColor: 'transparent',
                borderWidth: 2,
                pointRadius: 2,
                pointHoverRadius: 5,
            }))
        },
        options: {
            plugins: { tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + fmtCurrShort(ctx.raw) } } },
            scales: {
                y: { ticks: { callback: v => fmt(v) }, grid: { color: 'rgba(56,189,248,0.06)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderGeographicPage(data) {
    const agg = aggregate(data, 'State');
    const stKeys = Object.keys(agg).sort((a, b) => agg[b].revenue - agg[a].revenue);
    const stLabels = stKeys.map(k => STATE_NAMES[k] || k);
    const bestState = stKeys[0];

    renderKPIs('geo-kpis', [
        { icon: '🏆', value: STATE_NAMES[bestState] || bestState, label: 'Top State by Revenue' },
        { icon: '💰', value: fmtCurrShort(agg[bestState].revenue), label: 'Top State Revenue' },
        { icon: '📈', value: fmtDec(agg[bestState].roas_sum / agg[bestState].count), label: 'Top State ROAS' },
        { icon: '🗺️', value: stKeys.length.toString(), label: 'Total States' },
        { icon: '🛒', value: fmtNum(agg[bestState].sales), label: 'Top State Sales' },
    ]);

    // Revenue by State
    createChart('stateRevenueChart', {
        type: 'bar',
        data: {
            labels: stLabels,
            datasets: [{
                label: 'Revenue',
                data: stKeys.map(k => agg[k].revenue),
                backgroundColor: stKeys.map((_, i) => COLORS.palette[i]),
                borderRadius: 8,
                barPercentage: 0.6,
            }]
        },
        options: {
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => 'Revenue: ' + fmtCurrShort(ctx.raw) } }
            },
            scales: {
                y: { ticks: { callback: v => fmt(v) }, grid: { color: 'rgba(56,189,248,0.06)' } },
                x: { grid: { display: false } }
            }
        }
    });

    // Leads by State
    createChart('stateLeadsChart', {
        type: 'bar',
        data: {
            labels: stLabels,
            datasets: [{
                label: 'Leads',
                data: stKeys.map(k => agg[k].leads),
                backgroundColor: stKeys.map((_, i) => COLORS.palette[i]),
                borderRadius: 8,
                barPercentage: 0.6,
            }]
        },
        options: {
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => 'Leads: ' + fmtNum(ctx.raw) } }
            },
            scales: {
                y: { ticks: { callback: v => fmtNum(v) }, grid: { color: 'rgba(56,189,248,0.06)' } },
                x: { grid: { display: false } }
            }
        }
    });

    // Sales by State
    createChart('stateSalesChart', {
        type: 'bar',
        data: {
            labels: stLabels,
            datasets: [{
                label: 'Sales',
                data: stKeys.map(k => agg[k].sales),
                backgroundColor: stKeys.map((_, i) => COLORS.palette[i]),
                borderRadius: 8,
                barPercentage: 0.6,
            }]
        },
        options: {
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => 'Sales: ' + fmtNum(ctx.raw) } }
            },
            scales: {
                y: { ticks: { callback: v => fmtNum(v) }, grid: { color: 'rgba(56,189,248,0.06)' } },
                x: { grid: { display: false } }
            }
        }
    });

    // ROAS by State
    createChart('stateRoasChart', {
        type: 'bar',
        data: {
            labels: stLabels,
            datasets: [{
                label: 'Avg ROAS',
                data: stKeys.map(k => agg[k].roas_sum / agg[k].count),
                backgroundColor: stKeys.map((_, i) => COLORS.palette[i]),
                borderRadius: 8,
                barPercentage: 0.6,
            }]
        },
        options: {
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => 'ROAS: ' + ctx.raw.toFixed(2) + '×' } }
            },
            scales: {
                y: { ticks: { callback: v => v.toFixed(0) + '×' }, grid: { color: 'rgba(56,189,248,0.06)' } },
                x: { grid: { display: false } }
            }
        }
    });

    // State Comparison: Revenue vs Spend (grouped bar)
    createChart('stateCompareChart', {
        type: 'bar',
        data: {
            labels: stLabels,
            datasets: [
                {
                    label: 'Revenue',
                    data: stKeys.map(k => agg[k].revenue),
                    backgroundColor: 'rgba(56,189,248,0.7)',
                    borderRadius: 8,
                    barPercentage: 0.5,
                },
                {
                    label: 'Ad Spend',
                    data: stKeys.map(k => agg[k].spend),
                    backgroundColor: 'rgba(139,92,246,0.7)',
                    borderRadius: 8,
                    barPercentage: 0.5,
                }
            ]
        },
        options: {
            plugins: { tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + fmtCurrShort(ctx.raw) } } },
            scales: {
                y: { ticks: { callback: v => fmt(v) }, grid: { color: 'rgba(56,189,248,0.06)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderProductPage(data) {
    const agg = aggregate(data, 'Product');
    const pKeys = Object.keys(agg).sort((a, b) => agg[b].revenue - agg[a].revenue);
    const bestProd = pKeys[0];

    renderKPIs('product-kpis', [
        { icon: '🏆', value: bestProd, label: 'Top Product by Revenue' },
        { icon: '💰', value: fmtCurrShort(agg[bestProd].revenue), label: 'Top Product Revenue' },
        { icon: '🛒', value: fmtNum(agg[bestProd].sales), label: 'Top Product Sales' },
        { icon: '👥', value: fmtNum(agg[bestProd].leads), label: 'Top Product Leads' },
        { icon: '📈', value: fmtDec(agg[bestProd].roas_sum / agg[bestProd].count), label: 'Top Product ROAS' },
    ]);

    // Revenue by Product (Doughnut)
    createChart('productRevenueChart', {
        type: 'doughnut',
        data: {
            labels: pKeys,
            datasets: [{
                data: pKeys.map(k => agg[k].revenue),
                backgroundColor: COLORS.palette.slice(0, pKeys.length),
                borderColor: 'transparent',
                hoverOffset: 12,
            }]
        },
        options: {
            cutout: '58%',
            plugins: {
                legend: { position: 'bottom' },
                tooltip: { callbacks: { label: ctx => ctx.label + ': ' + fmtCurrShort(ctx.raw) } }
            }
        }
    });

    // Sales by Product
    createChart('productSalesChart', {
        type: 'bar',
        data: {
            labels: pKeys,
            datasets: [{
                label: 'Sales',
                data: pKeys.map(k => agg[k].sales),
                backgroundColor: COLORS.palette.slice(0, pKeys.length),
                borderRadius: 8,
                barPercentage: 0.55,
            }]
        },
        options: {
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => 'Sales: ' + fmtNum(ctx.raw) } } },
            scales: { y: { ticks: { callback: v => fmtNum(v) }, grid: { color: 'rgba(56,189,248,0.06)' } }, x: { grid: { display: false } } }
        }
    });

    // Leads by Product
    createChart('productLeadsChart', {
        type: 'bar',
        data: {
            labels: pKeys,
            datasets: [{
                label: 'Leads',
                data: pKeys.map(k => agg[k].leads),
                backgroundColor: COLORS.palette.slice(0, pKeys.length),
                borderRadius: 8,
                barPercentage: 0.55,
            }]
        },
        options: {
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => 'Leads: ' + fmtNum(ctx.raw) } } },
            scales: { y: { ticks: { callback: v => fmtNum(v) }, grid: { color: 'rgba(56,189,248,0.06)' } }, x: { grid: { display: false } } }
        }
    });

    // ROAS by Product
    createChart('productRoasChart', {
        type: 'bar',
        data: {
            labels: pKeys,
            datasets: [{
                label: 'Avg ROAS',
                data: pKeys.map(k => agg[k].roas_sum / agg[k].count),
                backgroundColor: COLORS.palette.slice(0, pKeys.length),
                borderRadius: 8,
                barPercentage: 0.55,
            }]
        },
        options: {
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => 'ROAS: ' + ctx.raw.toFixed(2) + '×' } } },
            scales: { y: { ticks: { callback: v => v.toFixed(0) + '×' }, grid: { color: 'rgba(56,189,248,0.06)' } }, x: { grid: { display: false } } }
        }
    });

    // Product Over Time
    const pMonthly = aggregateProductMonthly(data);
    const allMonths = [...new Set(data.map(r => r.Date.substring(0, 7)))].sort();
    const timeLabels = allMonths.map(m => MONTH_NAMES[parseInt(m.split('-')[1]) - 1]);
    const prods = Object.keys(pMonthly);
    createChart('productTimeChart', {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: prods.map((p, i) => ({
                label: p,
                data: allMonths.map(m => (pMonthly[p][m] || { revenue: 0 }).revenue),
                borderColor: COLORS.palette[i % COLORS.palette.length],
                backgroundColor: 'transparent',
                borderWidth: 2.5,
                pointRadius: 3,
                pointHoverRadius: 6,
            }))
        },
        options: {
            plugins: { tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + fmtCurrShort(ctx.raw) } } },
            scales: {
                y: { ticks: { callback: v => fmt(v) }, grid: { color: 'rgba(56,189,248,0.06)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderManagerPage(data) {
    const agg = aggregate(data, 'Manager');
    const mKeys = Object.keys(agg).sort((a, b) => agg[b].revenue - agg[a].revenue);
    const bestMgr = mKeys[0];
    const bestRoasMgr = mKeys.reduce((a, b) => (agg[a].roas_sum / agg[a].count) > (agg[b].roas_sum / agg[b].count) ? a : b);

    renderKPIs('manager-kpis', [
        { icon: '🏆', value: bestMgr, label: 'Top Manager (Revenue)' },
        { icon: '💰', value: fmtCurrShort(agg[bestMgr].revenue), label: 'Top Revenue' },
        { icon: '📈', value: bestRoasMgr, label: 'Top Manager (ROAS)' },
        { icon: '⭐', value: (agg[bestMgr].rating_sum / agg[bestMgr].count).toFixed(2), label: 'Top Mgr Rating' },
        { icon: '👥', value: mKeys.length.toString(), label: 'Total Managers' },
    ]);

    // Revenue by Manager (top 15)
    const topM = mKeys.slice(0, 15);
    createChart('managerRevenueChart', {
        type: 'bar',
        data: {
            labels: topM,
            datasets: [{
                label: 'Revenue',
                data: topM.map(k => agg[k].revenue),
                backgroundColor: topM.map((_, i) => COLORS.palette[i % COLORS.palette.length]),
                borderRadius: 6,
                barPercentage: 0.6,
            }]
        },
        options: {
            indexAxis: 'y',
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => 'Revenue: ' + fmtCurrShort(ctx.raw) } } },
            scales: { x: { ticks: { callback: v => fmt(v) }, grid: { color: 'rgba(56,189,248,0.06)' } }, y: { grid: { display: false } } }
        }
    });

    // ROAS by Manager
    const mByRoas = [...mKeys].sort((a, b) => (agg[b].roas_sum / agg[b].count) - (agg[a].roas_sum / agg[a].count)).slice(0, 15);
    createChart('managerRoasChart', {
        type: 'bar',
        data: {
            labels: mByRoas,
            datasets: [{
                label: 'Avg ROAS',
                data: mByRoas.map(k => agg[k].roas_sum / agg[k].count),
                backgroundColor: mByRoas.map((_, i) => COLORS.palette[i % COLORS.palette.length]),
                borderRadius: 6,
                barPercentage: 0.6,
            }]
        },
        options: {
            indexAxis: 'y',
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => 'ROAS: ' + ctx.raw.toFixed(2) + '×' } } },
            scales: { x: { ticks: { callback: v => v.toFixed(0) + '×' }, grid: { color: 'rgba(56,189,248,0.06)' } }, y: { grid: { display: false } } }
        }
    });

    // Rating by Manager
    const mByRating = [...mKeys].sort((a, b) => (agg[b].rating_sum / agg[b].count) - (agg[a].rating_sum / agg[a].count));
    createChart('managerRatingChart', {
        type: 'bar',
        data: {
            labels: mByRating,
            datasets: [{
                label: 'Avg Rating',
                data: mByRating.map(k => agg[k].rating_sum / agg[k].count),
                backgroundColor: mByRating.map(k => {
                    const r = agg[k].rating_sum / agg[k].count;
                    return r >= 3.1 ? COLORS.green : r >= 2.9 ? COLORS.orange : COLORS.red;
                }),
                borderRadius: 6,
                barPercentage: 0.55,
            }]
        },
        options: {
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => 'Rating: ' + ctx.raw.toFixed(2) + ' / 5' } } },
            scales: {
                y: { min: 0, max: 5, ticks: { stepSize: 1 }, grid: { color: 'rgba(56,189,248,0.06)' } },
                x: { grid: { display: false } }
            }
        }
    });

    // Sales by Manager (top 15)
    const mBySales = [...mKeys].sort((a, b) => agg[b].sales - agg[a].sales).slice(0, 15);
    createChart('managerSalesChart', {
        type: 'bar',
        data: {
            labels: mBySales,
            datasets: [{
                label: 'Sales',
                data: mBySales.map(k => agg[k].sales),
                backgroundColor: mBySales.map((_, i) => COLORS.palette[i % COLORS.palette.length]),
                borderRadius: 6,
                barPercentage: 0.6,
            }]
        },
        options: {
            indexAxis: 'y',
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => 'Sales: ' + fmtNum(ctx.raw) } } },
            scales: { x: { ticks: { callback: v => fmtNum(v) }, grid: { color: 'rgba(56,189,248,0.06)' } }, y: { grid: { display: false } } }
        }
    });

    // Manager Scorecard Table
    const wrapper = document.getElementById('managerTableWrapper');
    wrapper.innerHTML = `<table>
        <thead><tr>
            <th>Rank</th><th>Manager</th><th>Revenue</th><th>Sales</th><th>Leads</th>
            <th>ROAS</th><th>Avg Rating</th><th>Campaigns</th><th>Ad Spend</th><th>ROI</th>
        </tr></thead>
        <tbody>${mKeys.map((m, i) => {
            const a = agg[m];
            const roi = a.spend > 0 ? ((a.revenue - a.spend) / a.spend * 100) : 0;
            return `<tr>
                <td>${i + 1}</td>
                <td><strong>${m}</strong></td>
                <td>${fmtCurrShort(a.revenue)}</td>
                <td>${a.sales.toLocaleString()}</td>
                <td>${a.leads.toLocaleString()}</td>
                <td>${(a.roas_sum / a.count).toFixed(2)}×</td>
                <td class="rating-stars">${'★'.repeat(Math.round(a.rating_sum / a.count))}${'☆'.repeat(5 - Math.round(a.rating_sum / a.count))}</td>
                <td>${a.count}</td>
                <td>${fmtCurrShort(a.spend)}</td>
                <td>${roi.toFixed(0)}%</td>
            </tr>`;
        }).join('')}</tbody>
    </table>`;
}

// ─── RENDER ALL PAGES ───
function renderAllPages(data) {
    renderExecutivePage(data);
    renderCampaignPage(data);
    renderChannelPage(data);
    renderGeographicPage(data);
    renderProductPage(data);
    renderManagerPage(data);
}

// ─── FILTER LOGIC ───
function applyFilters() {
    filteredData = rawData.filter(r => {
        const ch = document.getElementById('channelFilter').value;
        const pr = document.getElementById('productFilter').value;
        const st = document.getElementById('stateFilter').value;
        const status = document.getElementById('statusFilter').value;
        const obj = document.getElementById('objectiveFilter').value;
        if (ch !== 'All' && r.Channel !== ch) return false;
        if (pr !== 'All' && r.Product !== pr) return false;
        if (st !== 'All' && r.State !== st) return false;
        if (status !== 'All' && r.Status !== status) return false;
        if (obj !== 'All' && r.Objective !== obj) return false;
        return true;
    });
    renderAllPages(filteredData);
}

function populateFilters(data) {
    const populate = (id, key) => {
        const sel = document.getElementById(id);
        const vals = [...new Set(data.map(r => r[key]))].sort();
        vals.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v;
            opt.textContent = key === 'State' ? (STATE_NAMES[v] || v) : v;
            sel.appendChild(opt);
        });
    };
    populate('channelFilter', 'Channel');
    populate('productFilter', 'Product');
    populate('stateFilter', 'State');
    populate('statusFilter', 'Status');
    populate('objectiveFilter', 'Objective');
}

// ─── NAVIGATION ───
function setupNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const page = btn.dataset.page;
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            document.getElementById('page-' + page).classList.add('active');

            // Re-render the active page to fix canvas sizing after display:none → display:block
            setTimeout(() => {
                Object.values(charts).forEach(c => c.resize());
            }, 50);
        });
    });
}

// ─── INIT ───
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();

    // Filter listeners
    ['channelFilter', 'productFilter', 'stateFilter', 'statusFilter', 'objectiveFilter'].forEach(id => {
        document.getElementById(id).addEventListener('change', applyFilters);
    });
    document.getElementById('resetFilters').addEventListener('click', () => {
        ['channelFilter', 'productFilter', 'stateFilter', 'statusFilter', 'objectiveFilter'].forEach(id => {
            document.getElementById(id).value = 'All';
        });
        applyFilters();
    });

    // Load CSV
    Papa.parse('../Marketing_Dashboard.csv', {
        download: true,
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: function (results) {
            rawData = results.data.filter(r => r.CampaignID != null);
            // Ensure numeric types
            rawData.forEach(r => {
                r.AdSpend = +r.AdSpend || 0;
                r.Impressions = +r.Impressions || 0;
                r.Clicks = +r.Clicks || 0;
                r.CTR = +r.CTR || 0;
                r.CPC = +r.CPC || 0;
                r.Leads = +r.Leads || 0;
                r.Sales = +r.Sales || 0;
                r.Revenue = +r.Revenue || 0;
                r.ROAS = +r.ROAS || 0;
                r.CAC = +r.CAC || 0;
                r.Rating = +r.Rating || 0;
            });
            filteredData = [...rawData];
            populateFilters(rawData);
            renderAllPages(filteredData);

            // Hide loader
            const loader = document.getElementById('loader');
            loader.classList.add('fade-out');
            setTimeout(() => {
                loader.style.display = 'none';
                document.getElementById('dashboard').classList.remove('hidden');
            }, 500);
        },
        error: function (err) {
            console.error('CSV load error:', err);
            document.querySelector('.loader-content h2').textContent = 'Error loading data';
            document.querySelector('.loader-content p').textContent = err.message;
        }
    });
});

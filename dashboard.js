const CSV_URL = "dados_aleatorios.csv";
const EMBEDDED_CSV = `nome,categoria,produto,valor,quantidade,total
Ana Souza,Eletronicos,Fone Bluetooth,189.90,2,379.80
Carlos Lima,Casa,Jogo de Panelas,249.00,1,249.00
Mariana Alves,Alimentos,Cafe Torrado 500g,28.50,6,171.00
Pedro Rocha,Vestuario,Camiseta Basica,59.90,3,179.70
Julia Mendes,Eletronicos,Mouse Sem Fio,79.90,2,159.80
Ricardo Nunes,Esportes,Bola de Futebol,89.00,1,89.00
Fernanda Dias,Beleza,Shampoo 400ml,32.90,4,131.60
Lucas Ferreira,Casa,Luminaria de Mesa,119.00,1,119.00
Beatriz Costa,Alimentos,Azeite Extra Virgem,45.90,2,91.80
Gabriel Martins,Vestuario,Calca Jeans,159.90,1,159.90
Camila Barbosa,Eletronicos,Carregador USB-C,49.90,3,149.70
Thiago Oliveira,Esportes,Halter 5kg,74.50,2,149.00
Larissa Pinto,Beleza,Hidratante Corporal,39.90,2,79.80
Rafael Gomes,Casa,Toalha de Banho,34.90,4,139.60
Patricia Ribeiro,Alimentos,Granola 1kg,22.90,5,114.50
Diego Santos,Vestuario,Tenis Casual,229.00,1,229.00
Amanda Carvalho,Eletronicos,Teclado Mecanico,349.90,1,349.90
Bruno Teixeira,Esportes,Corda de Pular,29.90,2,59.80
Vanessa Moreira,Beleza,Protetor Solar FPS50,67.90,1,67.90
Felipe Araujo,Casa,Organizador de Gaveta,42.00,3,126.00
Isabela Freitas,Alimentos,Mel Silvestre 300g,31.50,2,63.00
Henrique Lopes,Vestuario,Jaqueta Corta Vento,199.90,1,199.90
Natalia Campos,Eletronicos,Caixa de Som Portatil,159.00,1,159.00
Eduardo Vieira,Esportes,Garrafa Termica 750ml,54.90,2,109.80
Sofia Martins,Beleza,Esmalte,12.90,6,77.40
Marcelo Duarte,Casa,Tapete Antiderrapante,69.90,2,139.80
Aline Correia,Alimentos,Chocolate 70% Cacau,18.90,8,151.20
Gustavo Pires,Vestuario,Meia Esportiva,24.90,5,124.50
Renata Farias,Eletronicos,Cabo HDMI 2m,35.00,2,70.00
Vinicius Almeida,Esportes,Luva de Treino,44.90,2,89.80`;
const EXPORT_KEY = "aurora.recorte.exportado";

const CATEGORIES = [
  { id: "Eletronicos", label: "Eletrônicos", color: "#ff7a1a" },
  { id: "Vestuario", label: "Vestuário", color: "#7aa2ff" },
  { id: "Casa", label: "Casa", color: "#ffb020" },
  { id: "Alimentos", label: "Alimentos", color: "#3dd68c" },
  { id: "Esportes", label: "Esportes", color: "#ff5c7a" },
  { id: "Beleza", label: "Beleza", color: "#c084fc" },
];

const BANDS = [
  { id: "b1", label: "Até R$ 80", min: 0, max: 80, color: "#ffb067" },
  { id: "b2", label: "R$ 80 a 130", min: 80, max: 130, color: "#ff7a1a" },
  { id: "b3", label: "R$ 130 a 180", min: 130, max: 180, color: "#e25500" },
  { id: "b4", label: "R$ 180 a 250", min: 180, max: 250, color: "#3dd68c" },
  { id: "b5", label: "Acima de R$ 250", min: 250, max: Infinity, color: "#7aa2ff" },
];

const METAS = [
  { id: "receita", label: "Meta de receita", target: 5500, kind: "money" },
  { id: "unidades", label: "Meta de unidades", target: 100, kind: "units" },
  { id: "ticket", label: "Meta de ticket médio", target: 180, kind: "money" },
];

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

function countLabel(count, singular, plural) {
  return `${number.format(count)} ${count === 1 ? singular : plural}`;
}

const state = {
  rows: [],
  filters: { categoria: null, faixa: null, produto: null },
  search: "",
  metric: "total",
  sort: "valor",
  lead: null,
};

const $ = (id) => document.getElementById(id);

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseCSV(text) {
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).filter(Boolean).map((line, index) => {
    const cols = line.split(",");
    const row = { _i: index };
    headers.forEach((header, i) => {
      row[header] = (cols[i] || "").trim();
    });
    row.valor = Number(row.valor);
    row.quantidade = Number(row.quantidade);
    row.total = Number(row.total);
    return row;
  }).filter((row) => row.produto && Number.isFinite(row.total));
}

function categoryLabel(id) {
  return CATEGORIES.find((item) => item.id === id)?.label || id;
}

function categoryColor(id) {
  return CATEGORIES.find((item) => item.id === id)?.color || "#ff7a1a";
}

function bandOf(total) {
  return BANDS.find((band) => total >= band.min && total < band.max) || BANDS[BANDS.length - 1];
}

function sum(rows, key) {
  return rows.reduce((acc, row) => acc + row[key], 0);
}

function blankFilters() {
  return { categoria: null, faixa: null, produto: null };
}

function fold(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function getRows(except) {
  const query = fold(state.search.trim());
  return state.rows.filter((row) => {
    if (except !== "categoria" && state.filters.categoria && row.categoria !== state.filters.categoria) return false;
    if (except !== "faixa" && state.filters.faixa && bandOf(row.total).id !== state.filters.faixa) return false;
    if (except !== "produto" && state.filters.produto && row.produto !== state.filters.produto) return false;
    if (!query) return true;
    const blob = fold(`${row.nome} ${row.produto} ${row.categoria} ${categoryLabel(row.categoria)}`);
    return blob.includes(query);
  });
}

function formatCompact(value) {
  if (value >= 1000) {
    return `R$\u00a0${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  }
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function shareText(part, whole) {
  if (!whole) return "0% da base";
  const pct = (part / whole) * 100;
  return `${pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% da base`;
}

function pctLabel(part, whole) {
  if (!whole) return "0%";
  return `${((part / whole) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function tipAttr(model) {
  return `data-tip="${esc(JSON.stringify(model))}"`;
}

function showTip(host) {
  const tip = $("tooltip");
  const raw = host.getAttribute("data-tip");
  if (!raw) return;
  let model;
  try {
    model = JSON.parse(raw);
  } catch {
    tip.hidden = false;
    tip.textContent = raw;
    return;
  }
  const mark = model.color ? `<i style="background:${esc(model.color)}"></i>` : "";
  const rows = (model.rows || []).map((row) => `<div><dt>${esc(row.label)}</dt><dd>${esc(row.value)}</dd></div>`).join("");
  tip.hidden = false;
  tip.innerHTML = `<p class="tip-title">${mark}${esc(model.title)}</p>${rows ? `<dl>${rows}</dl>` : ""}`;
}

function placeTip(clientX, clientY) {
  const tip = $("tooltip");
  const pad = 12;
  const offset = 16;
  const width = tip.offsetWidth;
  const height = tip.offsetHeight;
  let x = clientX + offset;
  let y = clientY + offset;
  if (x + width > window.innerWidth - pad) x = clientX - width - offset;
  if (y + height > window.innerHeight - pad) y = clientY - height - offset;
  tip.style.left = `${Math.max(pad, x)}px`;
  tip.style.top = `${Math.max(pad, y)}px`;
}

function sparkline(values, id) {
  const w = 96;
  const h = 38;
  if (!values.length) return "";
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const coords = values.map((value, index) => {
    const x = values.length === 1 ? w / 2 : (index / (values.length - 1)) * (w - 2) + 1;
    const y = h - ((value - min) / span) * (h - 6) - 3;
    return [x, y];
  });
  const line = coords.map((point, index) => `${index ? "L" : "M"}${point[0].toFixed(1)} ${point[1].toFixed(1)}`).join(" ");
  const area = `${line} L ${coords[coords.length - 1][0].toFixed(1)} ${h} L ${coords[0][0].toFixed(1)} ${h} Z`;
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ff7a1a" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#ff7a1a" stop-opacity="0"/>
    </linearGradient></defs>
    <path class="area" d="${area}" fill="url(#${id})"></path>
    <path class="line" d="${line}"></path>
  </svg>`;
}

function renderKpis(rows) {
  const base = state.rows;
  const revenue = sum(rows, "total");
  const units = sum(rows, "quantidade");
  const ticket = rows.length ? revenue / rows.length : 0;
  const top = rows.reduce((best, row) => (row.total > (best?.total || 0) ? row : best), null);
  let running = 0;
  let runningUnits = 0;
  const revenueSeries = [];
  const ticketSeries = [];
  const unitSeries = [];
  const topSeries = [];
  rows.forEach((row, index) => {
    running += row.total;
    runningUnits += row.quantidade;
    revenueSeries.push(running);
    ticketSeries.push(running / (index + 1));
    unitSeries.push(runningUnits);
    topSeries.push(row.total);
  });

  const cards = [
    {
      label: "Receita do recorte",
      value: money.format(revenue),
      pill: shareText(revenue, sum(base, "total")),
      note: countLabel(rows.length, "venda", "vendas"),
      spark: revenueSeries,
      sparkId: "spark-receita",
    },
    {
      label: "Ticket médio",
      value: money.format(ticket),
      pill: rows.length ? `${(units / rows.length).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} itens/venda` : "sem vendas",
      note: "total ÷ vendas",
      spark: ticketSeries,
      sparkId: "spark-ticket",
      warn: true,
    },
    {
      label: "Unidades",
      value: number.format(units),
      pill: shareText(units, sum(base, "quantidade")),
      note: countLabel(new Set(rows.map((row) => row.categoria)).size, "categoria", "categorias"),
      spark: unitSeries,
      sparkId: "spark-unidades",
    },
    {
      label: "Maior venda",
      value: top ? money.format(top.total) : money.format(0),
      pill: top ? top.produto : "—",
      note: top ? top.nome : "nenhuma venda",
      spark: topSeries,
      sparkId: "spark-maior",
      warn: true,
    },
  ];

  $("kpis").innerHTML = cards.map((card) => `
    <article class="kpi">
      <p class="kpi-label">${esc(card.label)}</p>
      <p class="kpi-value">${esc(card.value)}</p>
      <div class="kpi-foot">
        <span class="pill ${card.warn ? "warn" : ""}">${esc(card.pill)}</span>
        <span class="kpi-note">${esc(card.note)}</span>
      </div>
      ${sparkline(card.spark, card.sparkId)}
    </article>
  `).join("");
}

function renderCategories() {
  const rows = getRows("categoria");
  const metric = state.metric;
  const values = CATEGORIES.map((category) => {
    const subset = rows.filter((row) => row.categoria === category.id);
    const revenue = sum(subset, "total");
    const units = sum(subset, "quantidade");
    return {
      ...category,
      revenue,
      units,
      sales: subset.length,
      value: metric === "quantidade" ? units : revenue,
    };
  });
  const whole = values.reduce((acc, item) => acc + item.value, 0);
  const max = Math.max(...values.map((item) => item.value), 0);
  const active = state.filters.categoria;

  if (!rows.length && !active) {
    $("chart-categorias").innerHTML = `<p class="empty">Nenhuma venda neste recorte.</p>`;
    return;
  }

  $("chart-categorias").innerHTML = `<div class="bars">${values.map((item) => {
    const height = max ? (item.value / max) * 100 : 0;
    const classes = [
      "bar-col",
      active === item.id ? "is-active" : "",
      active && active !== item.id ? "is-dim" : "",
    ].filter(Boolean).join(" ");
    const label = metric === "quantidade" ? `${number.format(item.value)} un.` : formatCompact(item.value);
    const tip = item.value > 0 ? tipAttr({
      title: item.label,
      color: item.color,
      rows: metric === "quantidade"
        ? [
          { label: "Unidades", value: number.format(item.units) },
          { label: "Participação", value: pctLabel(item.value, whole) },
          { label: "Receita", value: money.format(item.revenue) },
          { label: "Vendas", value: number.format(item.sales) },
        ]
        : [
          { label: "Receita", value: money.format(item.revenue) },
          { label: "Participação", value: pctLabel(item.value, whole) },
          { label: "Unidades", value: number.format(item.units) },
          { label: "Vendas", value: number.format(item.sales) },
        ],
    }) : "";
    const filterAttr = item.value > 0 ? `data-filter="categoria" data-value="${esc(item.id)}"` : "disabled";
    return `<button type="button" class="${classes}" ${filterAttr} ${tip} aria-pressed="${active === item.id}">
      <span class="bar-val">${esc(label)}</span>
      <span class="bar-track" aria-hidden="true"><span class="bar-fill" style="--h:${height}%"></span></span>
      <span class="bar-name">${esc(item.label)}</span>
    </button>`;
  }).join("")}</div>`;
}

function slicePath(cx, cy, outer, inner, start, end) {
  const span = end - start;
  if (span >= Math.PI * 2 - 0.001) end = start + Math.PI * 2 - 0.0001;
  const large = end - start > Math.PI ? 1 : 0;
  const point = (radius, angle) => [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  const [x0, y0] = point(outer, start);
  const [x1, y1] = point(outer, end);
  const [x2, y2] = point(inner, end);
  const [x3, y3] = point(inner, start);
  return `M ${x0} ${y0} A ${outer} ${outer} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${inner} ${inner} 0 ${large} 0 ${x3} ${y3} Z`;
}

function renderDonut() {
  const rows = getRows("faixa");
  const groups = BANDS.map((band) => {
    const subset = rows.filter((row) => bandOf(row.total).id === band.id);
    return {
      ...band,
      value: sum(subset, "total"),
      units: sum(subset, "quantidade"),
      sales: subset.length,
    };
  });
  const drawn = groups.filter((group) => group.value > 0);
  const total = drawn.reduce((acc, group) => acc + group.value, 0);
  const active = state.filters.faixa;

  if (!total) {
    $("chart-mix").innerHTML = `<p class="empty">Nenhuma venda neste recorte.</p>`;
    return;
  }

  let angle = -Math.PI / 2;
  const paths = drawn.map((group) => {
    const fraction = group.value / total;
    const start = angle;
    const end = angle + fraction * Math.PI * 2;
    angle = end;
    const gap = drawn.length > 1 && end - start > 0.12 ? 0.03 : 0;
    const d = slicePath(105, 105, 86, 58, start + gap, end - gap);
    const classes = active && active !== group.id ? "is-dim" : "";
    const tip = tipAttr({
      title: group.label,
      color: group.color,
      rows: [
        { label: "Receita", value: money.format(group.value) },
        { label: "Participação", value: pctLabel(group.value, total) },
        { label: "Vendas", value: number.format(group.sales) },
        { label: "Unidades", value: number.format(group.units) },
      ],
    });
    return `<path class="${classes}" data-filter="faixa" data-value="${group.id}" ${tip} d="${d}" fill="${group.color}"></path>`;
  }).join("");

  const legend = groups.map((group) => {
    const pct = total ? (group.value / total) * 100 : 0;
    const classes = [
      "legend-item",
      active === group.id ? "is-active" : "",
      active && active !== group.id ? "is-dim" : "",
    ].filter(Boolean).join(" ");
    const disabled = group.value <= 0 ? "disabled" : "";
    return `<button type="button" class="${classes}" data-filter="faixa" data-value="${group.id}" aria-pressed="${active === group.id}" ${disabled}>
      <span class="swatch" style="background:${group.color}"></span>
      <span><b>${esc(group.label)}</b><small>${esc(countLabel(group.sales, "venda", "vendas"))}</small></span>
      <span class="legend-val">${esc(formatCompact(group.value))}<span>${pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</span></span>
    </button>`;
  }).join("");

  $("chart-mix").innerHTML = `
    <div class="mix">
      <div class="donut-wrap">
        <svg viewBox="0 0 210 210" role="img" aria-label="Participação da receita por faixa de ticket">${paths}</svg>
        <div class="donut-center">
          <div>
            <strong>${esc(formatCompact(total))}</strong>
            <span>receita do mix</span>
          </div>
        </div>
      </div>
      <div class="legend">${legend}</div>
    </div>`;
}

function renderSales() {
  const rows = getRows("produto").slice();
  if (state.sort === "recente") rows.sort((a, b) => b._i - a._i);
  else rows.sort((a, b) => b.total - a.total || a.produto.localeCompare(b.produto, "pt-BR"));
  const revenue = sum(rows, "total");
  const max = Math.max(...rows.map((row) => row.total), 0);
  const active = state.filters.produto;
  $("vendas-sub").textContent = rows.length
    ? `${countLabel(rows.length, "venda no eixo", "vendas no eixo")} · clique para filtrar`
    : "Nenhuma venda neste recorte";

  if (!rows.length) {
    $("chart-vendas").innerHTML = `<p class="empty">Nenhuma venda neste recorte.</p>`;
    return;
  }

  $("chart-vendas").innerHTML = rows.map((row) => {
    const width = max ? (row.total / max) * 100 : 0;
    const classes = [
      "sale",
      active === row.produto ? "is-active" : "",
      active && active !== row.produto ? "is-dim" : "",
    ].filter(Boolean).join(" ");
    const tip = tipAttr({
      title: row.produto,
      color: categoryColor(row.categoria),
      rows: [
        { label: "Preço unitário", value: money.format(row.valor) },
        { label: "Participação", value: pctLabel(row.total, revenue) },
      ],
    });
    return `<button type="button" class="${classes}" data-filter="produto" data-value="${esc(row.produto)}" ${tip} aria-pressed="${active === row.produto}">
      <span class="sale-mark" style="background:${categoryColor(row.categoria)}">${esc(row.nome.slice(0, 1))}</span>
      <span>
        <b>${esc(row.produto)}</b>
        <small>${esc(row.nome)} · ${esc(categoryLabel(row.categoria))} · ${row.quantidade} un.</small>
        <span class="meter" aria-hidden="true"><span style="width:${width}%"></span></span>
      </span>
      <span class="sale-money">${esc(money.format(row.total))}</span>
    </button>`;
  }).join("");
}

function niceMax(value) {
  if (value <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(value));
  const fraction = value / pow;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * pow;
}

function renderFlow(rows) {
  const host = $("chart-fluxo");
  if (!rows.length) {
    $("flow-total").textContent = money.format(0);
    host.innerHTML = `<p class="empty">Nenhuma venda neste recorte.</p>`;
    return;
  }

  let running = 0;
  const points = rows.map((row) => {
    running += row.total;
    return { row, acc: running };
  });
  $("flow-total").textContent = money.format(running);

  const w = 680;
  const h = 280;
  const pad = { l: 64, r: 16, t: 16, b: 28 };
  const max = niceMax(running);
  const xOf = (index) => {
    if (points.length === 1) return (pad.l + (w - pad.r)) / 2;
    return pad.l + (index / (points.length - 1)) * (w - pad.l - pad.r);
  };
  const yOf = (value) => pad.t + (1 - value / max) * (h - pad.t - pad.b);
  const coords = points.map((point, index) => [xOf(index), yOf(point.acc), point]);
  const line = coords.map((coord, index) => `${index ? "L" : "M"}${coord[0].toFixed(1)} ${coord[1].toFixed(1)}`).join(" ");
  const area = `${line} L ${coords[coords.length - 1][0].toFixed(1)} ${yOf(0)} L ${coords[0][0].toFixed(1)} ${yOf(0)} Z`;
  const grids = [0, 0.5, 1].map((step) => {
    const value = max * step;
    const y = yOf(value);
    return `<line class="grid" x1="${pad.l}" y1="${y}" x2="${w - pad.r}" y2="${y}"></line>
      <text class="axis" x="${pad.l - 8}" y="${y + 4}" text-anchor="end">${esc(formatCompact(value))}</text>`;
  }).join("");
  const dots = coords.map((coord) => {
    const point = coord[2];
    const active = state.filters.produto === point.row.produto ? "is-active" : "";
    const tip = tipAttr({
      title: point.row.produto,
      color: categoryColor(point.row.categoria),
      rows: [
        { label: "Venda", value: money.format(point.row.total) },
        { label: "Acumulado", value: money.format(point.acc) },
        { label: "Cliente", value: point.row.nome },
        { label: "Categoria", value: categoryLabel(point.row.categoria) },
      ],
    });
    return `<circle class="dot ${active}" cx="${coord[0]}" cy="${coord[1]}" r="${active ? 5 : 3.5}"></circle>
      <circle class="hit" data-filter="produto" data-value="${esc(point.row.produto)}" ${tip} cx="${coord[0]}" cy="${coord[1]}" r="16"></circle>`;
  }).join("");
  const xLabels = [0, Math.floor((points.length - 1) / 2), points.length - 1]
    .filter((value, index, list) => list.indexOf(value) === index)
    .map((index) => `<text class="axis" x="${xOf(index)}" y="${h - 8}" text-anchor="middle">venda ${index + 1}</text>`)
    .join("");

  host.innerHTML = `<svg class="flow-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="Receita acumulada do recorte">
    <defs>
      <linearGradient id="flowFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ff7a1a" stop-opacity="0.38"/>
        <stop offset="100%" stop-color="#ff7a1a" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${grids}
    <path class="area" d="${area}"></path>
    <path class="line" d="${line}"></path>
    ${dots}
    ${xLabels}
  </svg>`;
}

function goalValue(rows, id) {
  if (id === "receita") return sum(rows, "total");
  if (id === "unidades") return sum(rows, "quantidade");
  return rows.length ? sum(rows, "total") / rows.length : 0;
}

function renderGoals(rows) {
  const items = METAS.map((meta) => {
    const value = goalValue(rows, meta.id);
    const ratio = meta.target ? value / meta.target : 0;
    const over = ratio >= 1;
    const width = Math.max(0, Math.min(100, ratio * 100));
    const shown = meta.kind === "units" ? `${number.format(value)} un.` : money.format(value);
    const target = meta.kind === "units" ? `${number.format(meta.target)} un.` : money.format(meta.target);
    const pct = `${Math.round(ratio * 100)}%`;
    return `<div class="goal">
      <div class="goal-top"><b>${esc(meta.label)}</b><span>${esc(pct)}</span></div>
      <div class="track"><span class="${over ? "over" : ""}" style="width:${width}%"></span></div>
      <em>${esc(shown)} de ${esc(target)}${over ? " · meta batida" : ""}</em>
    </div>`;
  }).join("");

  const clients = new Set(rows.map((row) => row.nome)).size;
  const clientText = clients === 0
    ? "Nenhum cliente neste recorte."
    : `${countLabel(clients, "cliente único", "clientes únicos")} neste recorte.`;
  $("chart-metas").innerHTML = `${items}<p class="goal-note">${clientText} As metas são referências do painel (R$ 5.500, 100 unidades e ticket de R$ 180) para situar o resultado.</p>`;
}

function renderInsight(rows) {
  const button = $("insight-btn");
  if (!rows.length) {
    state.lead = { mode: "clear" };
    $("insight-text").textContent = "Nenhuma venda ficou neste recorte. Limpe um filtro para voltar à base.";
    button.textContent = "Limpar filtros";
    button.disabled = false;
    return;
  }

  const totals = CATEGORIES.map((category) => ({
    ...category,
    value: sum(rows.filter((row) => row.categoria === category.id), "total"),
  })).sort((a, b) => b.value - a.value);
  const leader = totals[0];
  const revenue = sum(rows, "total");
  const share = revenue ? (leader.value / revenue) * 100 : 0;
  const ticket = revenue / rows.length;
  const top = rows.reduce((best, row) => (row.total > best.total ? row : best));
  $("insight-text").textContent = `${leader.label} concentra ${share.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% da receita deste recorte (${money.format(leader.value)}). O ticket médio está em ${money.format(ticket)} e a maior venda é ${top.produto}, de ${top.nome}.`;

  const already = state.filters.categoria === leader.id && !state.filters.faixa && !state.filters.produto && !state.search;
  state.lead = already ? { mode: "clear" } : { mode: "apply", categoria: leader.id };
  button.textContent = already ? "Ver base completa" : `Filtrar ${leader.label}`;
  button.disabled = false;
}

function filterDescription() {
  const parts = [];
  if (state.filters.categoria) parts.push(categoryLabel(state.filters.categoria));
  if (state.filters.faixa) parts.push(BANDS.find((band) => band.id === state.filters.faixa).label);
  if (state.filters.produto) parts.push(state.filters.produto);
  if (state.search.trim()) parts.push(`busca “${state.search.trim()}”`);
  return parts;
}

function renderChrome(rows) {
  const parts = filterDescription();
  const revenue = sum(rows, "total");
  $("headline-sub").textContent = parts.length
    ? `${parts.join(" · ")} · ${rows.length} de ${state.rows.length} vendas · ${money.format(revenue)}`
    : `Base completa · ${state.rows.length} vendas · ${money.format(revenue)} · clique em um gráfico para filtrar os demais`;

  const chips = $("chips");
  if (!parts.length) {
    chips.hidden = true;
    chips.innerHTML = "";
  } else {
    chips.hidden = false;
    const items = [];
    if (state.filters.categoria) items.push(`<button type="button" class="chip" data-clear="categoria">${esc(categoryLabel(state.filters.categoria))} ×</button>`);
    if (state.filters.faixa) items.push(`<button type="button" class="chip" data-clear="faixa">${esc(BANDS.find((band) => band.id === state.filters.faixa).label)} ×</button>`);
    if (state.filters.produto) items.push(`<button type="button" class="chip" data-clear="produto">${esc(state.filters.produto)} ×</button>`);
    if (state.search.trim()) items.push(`<button type="button" class="chip" data-clear="search">Busca: ${esc(state.search.trim())} ×</button>`);
    items.push(`<button type="button" class="chip-clear" data-clear="all">Limpar tudo</button>`);
    chips.innerHTML = items.join("");
  }

  $("side-base").textContent = `${rows.length} de ${state.rows.length} vendas neste recorte · ${money.format(revenue)}.`;
  $("export").disabled = rows.length === 0;
  $("live").textContent = $("headline-sub").textContent;
}

function render() {
  const tip = $("tooltip");
  if (tip) tip.hidden = true;
  const rows = getRows(null);
  renderKpis(rows);
  renderCategories();
  renderDonut();
  renderSales();
  renderFlow(rows);
  renderGoals(rows);
  renderInsight(rows);
  renderChrome(rows);
}

function toggleFilter(dim, value) {
  state.filters[dim] = state.filters[dim] === value ? null : value;
  render();
}

function clearFilter(name) {
  if (name === "all") {
    state.filters = blankFilters();
    state.search = "";
    $("q").value = "";
  } else if (name === "search") {
    state.search = "";
    $("q").value = "";
  } else {
    state.filters[name] = null;
  }
  render();
}

function exportCSV() {
  const rows = getRows(null);
  const header = ["nome", "categoria", "produto", "valor", "quantidade", "total"];
  const csv = [header.join(",")]
    .concat(rows.map((row) => header.map((key) => row[key]).join(",")))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "recorte-vendas.csv";
  link.click();
  URL.revokeObjectURL(link.href);
  saveExport(rows, csv);
}

function saveExport(rows, csv) {
  const status = $("export-status");
  const payload = {
    exportedAt: new Date().toISOString(),
    fileName: "recorte-vendas.csv",
    filters: { ...state.filters },
    search: state.search.trim(),
    metric: state.metric,
    sort: state.sort,
    rows: rows.map((row) => ({
      nome: row.nome,
      categoria: row.categoria,
      produto: row.produto,
      valor: row.valor,
      quantidade: row.quantidade,
      total: row.total,
    })),
    csv,
  };
  try {
    localStorage.setItem(EXPORT_KEY, JSON.stringify(payload));
    const when = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date());
    const message = `${countLabel(rows.length, "venda salva", "vendas salvas")} no navegador · ${when}`;
    status.hidden = false;
    status.textContent = message;
    $("live").textContent = message;
  } catch {
    status.hidden = false;
    status.textContent = "O arquivo foi baixado, mas o navegador recusou gravar o recorte.";
    $("live").textContent = status.textContent;
  }
}

function bind() {
  document.body.addEventListener("click", (event) => {
    const clear = event.target.closest("[data-clear]");
    if (clear) {
      clearFilter(clear.dataset.clear);
      return;
    }
    const filter = event.target.closest("[data-filter]");
    if (filter && !filter.disabled) {
      toggleFilter(filter.dataset.filter, filter.dataset.value);
      return;
    }
    const metric = event.target.closest("[data-metric]");
    if (metric) {
      state.metric = metric.dataset.metric;
      document.querySelectorAll("[data-metric]").forEach((button) => {
        button.classList.toggle("is-on", button === metric);
      });
      renderCategories();
      return;
    }
    const sort = event.target.closest("[data-sort]");
    if (sort) {
      state.sort = sort.dataset.sort;
      document.querySelectorAll("[data-sort]").forEach((button) => {
        button.classList.toggle("is-on", button === sort);
      });
      renderSales();
      return;
    }
    const nav = event.target.closest("[data-nav]");
    if (nav) {
      document.querySelectorAll(".nav").forEach((button) => button.classList.toggle("is-active", button === nav));
      if (nav.dataset.nav === "top") {
        state.filters = blankFilters();
        state.search = "";
        $("q").value = "";
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        $(nav.dataset.nav)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  });

  $("q").addEventListener("input", () => {
    state.search = $("q").value;
    render();
  });

  $("export").addEventListener("click", exportCSV);
  $("insight-btn").addEventListener("click", () => {
    if (!state.lead) return;
    if (state.lead.mode === "clear") {
      state.filters = blankFilters();
      state.search = "";
      $("q").value = "";
    } else {
      state.filters = { categoria: state.lead.categoria, faixa: null, produto: null };
    }
    render();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") clearFilter("all");
  });

  const tip = $("tooltip");
  document.body.addEventListener("pointerover", (event) => {
    const host = event.target.closest("[data-tip]");
    if (!host) return;
    showTip(host);
    placeTip(event.clientX, event.clientY);
  });
  document.body.addEventListener("pointermove", (event) => {
    if (tip.hidden) return;
    placeTip(event.clientX, event.clientY);
  });
  document.body.addEventListener("pointerout", (event) => {
    const host = event.target.closest("[data-tip]");
    if (!host) return;
    const next = event.relatedTarget && event.relatedTarget.closest ? event.relatedTarget.closest("[data-tip]") : null;
    if (next !== host) tip.hidden = true;
  });
  document.body.addEventListener("focusin", (event) => {
    const host = event.target.closest("[data-tip]");
    if (!host) return;
    showTip(host);
    const box = host.getBoundingClientRect();
    placeTip(box.left + box.width / 2, box.top);
  });
  document.body.addEventListener("focusout", (event) => {
    const host = event.target.closest("[data-tip]");
    if (!host) return;
    tip.hidden = true;
  });
}

function boot(text) {
  state.rows = parseCSV(text);
  if (!state.rows.length) throw new Error("CSV vazio");
  const hour = new Date().getHours();
  $("greet").textContent = hour < 12 ? "Bom dia, Direção" : hour < 18 ? "Boa tarde, Direção" : "Boa noite, Direção";
  $("today").textContent = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  bind();
  render();
}

function showFallback(message) {
  $("headline-sub").textContent = message;
  $("kpis").innerHTML = `<div class="boot" style="grid-column: 1 / -1">
    <strong>Abra a base de vendas</strong>
    <p>${esc(message)} Se o arquivo não carregou sozinho, selecione <em>dados_aleatorios.csv</em>.</p>
    <input id="file" type="file" accept=".csv,text/csv">
  </div>`;
  $("file").addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    boot(await file.text());
  });
}

async function init() {
  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) throw new Error("não encontrado");
    boot(await response.text());
  } catch {
    try {
      boot(EMBEDDED_CSV);
    } catch {
      showFallback("Não foi possível ler a base de vendas.");
    }
  }
}

init();

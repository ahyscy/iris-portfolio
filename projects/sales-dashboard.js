const requiredHeaders = ["order_id", "date", "product", "quantity", "unit_price"];
const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const $ = (selector) => document.querySelector(selector);
let source = "synthetic sample data";
let dataset = { headers: requiredHeaders, records: [] };

function parseCSV(text) {
  const rows = [];
  let row = [], field = "", quoted = false, afterQuote = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') { quoted = false; afterQuote = true; }
      else field += char;
    } else if (afterQuote && char !== "," && char !== "\r" && char !== "\n" && char !== " " && char !== "\t") {
      throw new Error(`Row ${rows.length + 1}: unexpected character after a closing quote.`);
    } else if (char === '"') {
      if (field.trim()) throw new Error(`Row ${rows.length + 1}: quote inside an unquoted field.`);
      field = ""; quoted = true; afterQuote = false;
    } else if (char === ",") { row.push(field.trim()); field = ""; afterQuote = false; }
    else if (char === "\r" || char === "\n") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field.trim());
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = []; field = ""; afterQuote = false;
    } else { field += char; afterQuote = false; }
  }
  if (quoted) throw new Error(`Row ${rows.length + 1}: unclosed quoted field.`);
  row.push(field.trim());
  if (row.some((cell) => cell !== "")) rows.push(row);
  if (rows.length < 2) throw new Error("CSV needs a header row and at least one data row.");
  const headers = rows[0].map((cell, i) => (i === 0 ? cell.replace(/^\uFEFF/, "") : cell).trim());
  const normalizedHeaders = headers.map((header) => header.toLowerCase());
  const duplicate = normalizedHeaders.find((header, i) => normalizedHeaders.indexOf(header) !== i);
  if (duplicate) throw new Error(`Duplicate column name: ${duplicate}.`);
  const missing = requiredHeaders.filter((header) => !normalizedHeaders.includes(header));
  if (missing.length) throw new Error(`Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}.`);
  const indexes = Object.fromEntries(requiredHeaders.map((header) => [header, normalizedHeaders.indexOf(header)]));
  const records = rows.slice(1).map((cells, offset) => {
    const line = offset + 2;
    if (cells.length !== headers.length) throw new Error(`Row ${line} has ${cells.length} fields; expected ${headers.length}. Check commas and quotes.`);
    const raw = Object.fromEntries(headers.map((header, i) => [header, cells[i]]));
    const orderId = cells[indexes.order_id], product = cells[indexes.product], date = cells[indexes.date];
    if (!orderId) throw new Error(`Row ${line}: order_id must not be empty.`);
    if (!product) throw new Error(`Row ${line}: product must not be empty.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) throw new Error(`Row ${line}: date “${date}” must be a valid YYYY-MM-DD date.`);
    const quantityText = cells[indexes.quantity], priceText = cells[indexes.unit_price];
    const quantity = Number(quantityText), unitPrice = Number(priceText);
    if (!quantityText || !Number.isInteger(quantity) || quantity <= 0) throw new Error(`Row ${line}: quantity must be a positive whole number.`);
    if (!priceText || !Number.isFinite(unitPrice) || unitPrice < 0) throw new Error(`Row ${line}: unit_price must be a non-negative number.`);
    const revenue = quantity * unitPrice;
    if (!Number.isFinite(revenue)) throw new Error(`Row ${line}: quantity × unit_price is outside the supported numeric range.`);
    return { orderId, product, date, quantity, unitPrice, revenue, raw };
  });
  return { headers, records };
}

function csvEscape(value) { return `"${String(value).replaceAll('"', '""')}"`; }
function previousMonthKey(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const previous = new Date(Date.UTC(year, month - 2, 1));
  return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, "0")}`;
}
function filteredRecords() {
  const start = $("#start-date").value, end = $("#end-date").value;
  return dataset.records.filter((record) => (!start || record.date >= start) && (!end || record.date <= end));
}
function setEmpty(container, message) { container.replaceChildren(Object.assign(document.createElement("p"), { className: "empty-state", textContent: message })); }
function renderBars(container, entries, key, color = "") {
  container.replaceChildren();
  if (!entries.length) return setEmpty(container, "No records match this date range.");
  const width = Math.max(container.clientWidth || 420, Math.min(entries.length * 74 + 60, 920)), height = 230;
  const left = 54, right = 12, top = 22, bottom = 48, max = Math.max(...entries.map((item) => item[key]), 1);
  const step = (width - left - right) / entries.length, barWidth = Math.min(44, step * .58);
  const svgNS = "http://www.w3.org/2000/svg";
  const createSVG = (tag, attributes = {}, text = "") => {
    const node = document.createElementNS(svgNS, tag);
    Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, String(value)));
    if (text) node.textContent = text;
    return node;
  };
  const svg = createSVG("svg", { viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": key === "revenue" ? "Revenue chart" : "Sales chart" });
  for (let i = 0; i < 4; i++) {
    const y = top + ((height - top - bottom) * i / 3);
    svg.append(createSVG("line", { class: "chart-grid", x1: left, y1: y, x2: width - right, y2: y }));
    svg.append(createSVG("text", { class: "chart-text", x: left - 7, y: y + 4, "text-anchor": "end" }, numberFormat.format(max * (1 - i / 3))));
  }
  entries.forEach((item, i) => {
    const x = left + i * step + (step - barWidth) / 2, barHeight = (item[key] / max) * (height - top - bottom), y = height - bottom - barHeight;
    const label = String(item.label), short = label.length > 13 ? `${label.slice(0, 11)}…` : label;
    const bar = createSVG("rect", { class: `chart-bar ${color}`.trim(), x, y, width: barWidth, height: barHeight, rx: 2 });
    bar.append(createSVG("title", {}, `${label}: ${numberFormat.format(item[key])}`));
    svg.append(bar);
    svg.append(createSVG("text", { class: "chart-value", x: x + barWidth / 2, y: Math.max(12, y - 6), "text-anchor": "middle" }, numberFormat.format(item[key])));
    svg.append(createSVG("text", { class: "chart-text", x: x + step / 2, y: height - 14, "text-anchor": "middle" }, short));
  });
  container.append(svg);
}
function escapeHTML(value) { return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]); }
function renderTable(records) {
  const wrap = $("#data-preview"); wrap.replaceChildren();
  if (!records.length) return setEmpty(wrap, "No records match this date range.");
  const table = document.createElement("table"); table.className = "data-table";
  const thead = table.createTHead().insertRow(); dataset.headers.forEach((header) => { const th = document.createElement("th"); th.scope = "col"; th.textContent = header; thead.append(th); });
  const tbody = table.createTBody(); records.slice(0, 100).forEach((record) => { const tr = tbody.insertRow(); dataset.headers.forEach((header) => { const td = tr.insertCell(); td.textContent = record.raw[header] ?? ""; }); });
  wrap.append(table); if (records.length > 100) wrap.append(Object.assign(document.createElement("p"), { className: "demo-help", textContent: `Showing first 100 of ${records.length} line items.` }));
}
function renderInsights(records, revenue, orders, average, products, months) {
  const target = $("#business-insights"); target.replaceChildren();
  const fact = (heading, body, kind = "Fact") => { const article = document.createElement("article"); article.className = "insight-item"; const tag = document.createElement("span"); tag.className = "insight-tag"; tag.textContent = kind; const title = document.createElement("h3"); title.textContent = heading; const text = document.createElement("p"); text.textContent = body; article.append(tag, title, text); target.append(article); };
  if (!records.length) return fact("Data insufficient", "No records match this date range. Adjust the dates or reset filters.");
  const topProduct = products[0], bestMonth = [...months].sort((a,b) => b.revenue - a.revenue)[0];
  fact("Overall sales performance", `${numberFormat.format(revenue)} currency units across ${orders.size} distinct orders; average order value is ${numberFormat.format(average)}.`);
  fact("Product performance", `${topProduct.label} is the highest-revenue product at ${numberFormat.format(topProduct.revenue)} (${revenue ? numberFormat.format(topProduct.revenue / revenue * 100) : "0"}% of revenue).`);
  fact("Monthly performance", `${bestMonth.label} has the highest recorded monthly revenue at ${numberFormat.format(bestMonth.revenue)}.`);
  if (records.length < 3 || months.length < 2) fact("Data-insufficient note", "More records across multiple months are needed for meaningful trend observations or recommendations.", "Limit");
  else {
    const last = months.at(-1), priorCalendarMonth = months.find((month) => month.label === previousMonthKey(last.label));
    const change = priorCalendarMonth?.revenue ? (last.revenue - priorCalendarMonth.revenue) / priorCalendarMonth.revenue * 100 : null;
    fact("Observed monthly change", !priorCalendarMonth ? `No month-over-month comparison is available for ${last.label}; the preceding calendar month has no recorded rows.` : change === null ? `No percentage comparison is available for ${last.label}; ${priorCalendarMonth.label} has zero revenue.` : `${last.label} revenue ${change >= 0 ? "increased" : "decreased"} ${numberFormat.format(Math.abs(change))}% versus ${priorCalendarMonth.label}. This is descriptive, not predictive.`, "Observation");
    fact("Recommendation", "Review the leading product’s availability and compare its margin and customer context before making inventory or promotion decisions. This dataset contains no cost or customer detail.", "Recommendation");
  }
}
function render() {
  const records = filteredRecords(), revenue = records.reduce((sum, row) => sum + row.revenue, 0), orders = new Set(records.map((row) => row.orderId));
  const productMap = new Map(), monthMap = new Map();
  records.forEach((row) => {
    const product = productMap.get(row.product) || { label: row.product, revenue: 0, quantity: 0, orders: new Set() };
    product.revenue += row.revenue; product.quantity += row.quantity; product.orders.add(row.orderId); productMap.set(row.product, product);
    const key = row.date.slice(0, 7); monthMap.set(key, (monthMap.get(key) || 0) + row.revenue);
  });
  const products = [...productMap.values()].sort((a,b) => b.revenue - a.revenue);
  const months = [...monthMap.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([label, monthRevenue]) => ({ label, revenue: monthRevenue }));
  const average = orders.size ? revenue / orders.size : 0;
  $("#metric-revenue").textContent = numberFormat.format(revenue); $("#metric-orders").textContent = numberFormat.format(orders.size); $("#metric-aov").textContent = numberFormat.format(average); $("#metric-products").textContent = numberFormat.format(products.length);
  $("#business-summary").textContent = records.length ? `${records.length} line items · ${orders.size} distinct orders · ${numberFormat.format(revenue)} currency units. All calculations describe ${source}; no forecast is made.` : "No records match the selected dates. Adjust the range or reset filters.";
  renderBars($("#product-chart"), products.slice(0, 8).map(({label,revenue:amount}) => ({label,revenue:amount})), "revenue");
  renderBars($("#monthly-chart"), months, "revenue", "secondary");
  const list = $("#product-performance"); list.replaceChildren();
  if (!products.length) setEmpty(list, "No product performance is available for this date range.");
  else products.forEach((item, index) => { const row = document.createElement("div"); row.className = "chart-row"; const name = document.createElement("span"); name.textContent = `${index + 1}. ${item.label}`; name.title = item.label; const track = document.createElement("span"); track.className = "chart-track"; const fill = document.createElement("span"); fill.className = "chart-fill"; fill.style.width = `${item.revenue / (products[0].revenue || 1) * 100}%`; track.append(fill); const metrics = document.createElement("span"); metrics.textContent = `${numberFormat.format(item.revenue)} · ${item.quantity} units · ${item.orders.size} ${item.orders.size === 1 ? "order" : "orders"}`; row.append(name, track, metrics); list.append(row); });
  const monthly = $("#monthly-summary"); monthly.replaceChildren();
  if (months.length) {
    const highest = [...months].sort((a,b) => b.revenue - a.revenue)[0], last = months.at(-1), previous = months.find((month) => month.label === previousMonthKey(last.label));
    const change = previous?.revenue ? (last.revenue - previous.revenue) / previous.revenue * 100 : null;
    monthly.textContent = `Highest recorded month: ${highest.label} (${numberFormat.format(highest.revenue)}). ${!previous ? "MoM comparison unavailable: the previous calendar month has no recorded rows." : change === null ? `MoM comparison unavailable: ${previous.label} has zero revenue.` : `Latest recorded month change: ${change >= 0 ? "+" : ""}${numberFormat.format(change)}% (${last.label} vs ${previous.label}).`} Months without records are omitted.`;
  } else monthly.textContent = "No monthly statistics are available for this date range.";
  $("#row-count").textContent = `· ${records.length} line items`; renderTable(records); renderInsights(records, revenue, orders, average, products, months);
  $("#export-csv").disabled = !records.length;
}

function loadText(text, name) { const parsed = parseCSV(text); dataset = parsed; source = name; $("#dataset-label").textContent = `Currently showing: ${name}`; $("#dashboard-status").classList.remove("error"); $("#dashboard-status").textContent = `Loaded ${dataset.records.length} valid line items. ${name === "synthetic sample data" ? "Sample figures are synthetic and illustrative." : "The file was processed locally in this browser."}`; $("#start-date").value = ""; $("#end-date").value = ""; render(); }
$("#start-date").addEventListener("change", () => { const status = $("#dashboard-status"); if ($("#start-date").value && $("#end-date").value && $("#start-date").value > $("#end-date").value) { status.classList.add("error"); status.textContent = "Start date must be on or before the end date."; return; } status.classList.remove("error"); render(); });
$("#end-date").addEventListener("change", () => { const status = $("#dashboard-status"); if ($("#start-date").value && $("#end-date").value && $("#start-date").value > $("#end-date").value) { status.classList.add("error"); status.textContent = "Start date must be on or before the end date."; return; } status.classList.remove("error"); render(); });
$("#reset-filters").addEventListener("click", () => { $("#start-date").value = ""; $("#end-date").value = ""; $("#dashboard-status").classList.remove("error"); $("#dashboard-status").textContent = "Date filters reset."; render(); });
$("#export-csv").addEventListener("click", () => { const records = filteredRecords(); if (!records.length) return; const lines = [dataset.headers.map(csvEscape).join(","), ...records.map((record) => dataset.headers.map((header) => csvEscape(record.raw[header] ?? "")).join(","))]; const blob = new Blob(["\uFEFF", lines.join("\r\n")], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url; link.download = `sales-filtered-${$("#start-date").value || "all"}-to-${$("#end-date").value || "all"}.csv`; link.click(); URL.revokeObjectURL(url); });
$("#csv-upload").addEventListener("change", async (event) => { const file = event.target.files?.[0]; if (!file) return; const status = $("#dashboard-status"); if (file.size > 2_000_000) { status.classList.add("error"); status.textContent = "File exceeds the 2 MB limit. Choose a smaller CSV."; event.target.value = ""; return; } try { loadText(await file.text(), `uploaded file: ${file.name}`); } catch (error) { status.classList.add("error"); status.textContent = error.message; } event.target.value = ""; });
new ResizeObserver(() => render()).observe($("#product-chart"));
fetch("/projects/sample-sales.csv").then((response) => { if (!response.ok) throw new Error("Could not load the synthetic sample CSV."); return response.text(); }).then((text) => loadText(text, "synthetic sample data")).catch((error) => { $("#dashboard-status").classList.add("error"); $("#dashboard-status").textContent = `${error.message} You can still choose a CSV file above.`; });

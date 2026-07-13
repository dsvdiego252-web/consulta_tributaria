(() => {
  "use strict";

  const STORAGE = {
    history: "agenteTributario.history.v1",
    favorites: "agenteTributario.favorites.v1",
    customDb: "agenteTributario.customDb.v1"
  };

  const originalProducts = structuredClone(window.TAX_PRODUCTS || []);
  let products = loadCustomDatabase() || structuredClone(originalProducts);
  let currentProductId = null;
  let deferredInstallPrompt = null;

  const el = id => document.getElementById(id);
  const searchForm = el("searchForm");
  const searchInput = el("searchInput");
  const resultArea = el("resultArea");
  const matchList = el("matchList");
  const referenceDate = el("referenceDate");
  const operationType = el("operationType");
  const origin = el("origin");

  function normalize(value = "") {
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function onlyDigits(value = "") {
    return String(value).replace(/\D/g, "");
  }

  function escapeHtml(value = "") {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function parseDate(value) {
    return value ? new Date(`${value}T12:00:00`) : null;
  }

  function formatDate(value) {
    if (!value) return "sem limite";
    return parseDate(value).toLocaleDateString("pt-BR");
  }

  function isDateWithin(dateValue, from, to) {
    const date = parseDate(dateValue);
    const start = parseDate(from);
    const end = parseDate(to);
    return (!start || date >= start) && (!end || date <= end);
  }

  function getStPeriod(product, dateValue) {
    const periods = product?.st?.periods || [];
    return periods.find(period => isDateWithin(dateValue, period.from, period.to)) || null;
  }

  function scoreProduct(product, query) {
    const q = normalize(query);
    const qDigits = onlyDigits(query);
    if (!q) return 0;

    const names = [product.name, ...(product.aliases || [])].map(normalize);
    const ncms = [product.ncm, ...(product.alternativeNcms || [])].map(onlyDigits);
    let score = 0;

    if (qDigits.length >= 4) {
      for (const ncm of ncms) {
        if (qDigits === ncm) score = Math.max(score, 120);
        else if (ncm.startsWith(qDigits)) score = Math.max(score, 96);
        else if (qDigits.startsWith(ncm)) score = Math.max(score, 82);
        else if (ncm.includes(qDigits)) score = Math.max(score, 70);
      }
    }

    for (const name of names) {
      if (q === name) score = Math.max(score, 115);
      else if (name.startsWith(q)) score = Math.max(score, 92);
      else if (name.includes(q)) score = Math.max(score, 78);

      const qTokens = q.split(" ").filter(Boolean);
      const nameTokens = new Set(name.split(" ").filter(Boolean));
      const hits = qTokens.filter(token => nameTokens.has(token) || [...nameTokens].some(n => n.startsWith(token))).length;
      if (hits) score = Math.max(score, 45 + hits * 12 - (qTokens.length - hits) * 5);
    }

    const haystack = normalize([
      product.name,
      ...(product.aliases || []),
      product.category,
      product.summary,
      ...(product.tags || [])
    ].join(" "));
    if (haystack.includes(q)) score = Math.max(score, 62);

    return score;
  }

  function findProducts(query) {
    return products
      .map(product => ({ product, score: scoreProduct(product, query) }))
      .filter(item => item.score >= 42)
      .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name, "pt-BR"));
  }

  function confidenceBadge(confidence) {
    if (confidence === "alta") return '<span class="badge success">Base validada</span>';
    if (confidence === "média") return '<span class="badge warning">Revisão recomendada</span>';
    return '<span class="badge danger">Análise preliminar</span>';
  }

  function stBadge(period) {
    if (!period) return '<span class="badge warning">ST sem regra para a data</span>';
    if (period.status === "sim") return '<span class="badge danger">ST: SIM</span>';
    if (period.status === "não") return '<span class="badge success">ST: NÃO</span>';
    return '<span class="badge warning">ST: ANALISAR</span>';
  }

  function buildNarrative(product, period, dateValue) {
    const purpose = operationType.value;
    const sourceText = period ? `${period.source}` : "base legal específica";
    const stText = period?.status === "sim"
      ? `está sujeito à substituição tributária, com CEST ${period.cest} e IVA/MVA ${period.iva}`
      : period?.status === "não"
        ? "não está sujeito à substituição tributária nessa data"
        : "exige conferência adicional para definir a substituição tributária";

    const purposeText = {
      audit: "Na auditoria da entrada, confira se a nota do fornecedor segue esse enquadramento e se a descrição legal coincide com o produto.",
      sale: "Na saída varejista, não copie automaticamente benefícios condicionados ao fabricante ou atacadista.",
      register: "Na parametrização, cadastre separadamente ICMS próprio, ST, PIS/COFINS e cBenef, mantendo a data de vigência."
    }[purpose];

    const interstateText = origin.value === "interstate" && period?.status === "sim"
      ? " Como a entrada é interestadual, avalie o IVA-ST ajustado quando a alíquota interna for superior à interestadual."
      : "";

    return `<strong>Conclusão em ${formatDate(dateValue)}:</strong> ${escapeHtml(product.name)}, NCM ${escapeHtml(product.ncm)}, ${escapeHtml(stText)}. Base indicada: ${escapeHtml(sourceText)}. ${escapeHtml(purposeText)}${escapeHtml(interstateText)}`;
  }

  function taxRow(label, value) {
    return `<div class="tax-row"><div class="tax-label">${escapeHtml(label)}</div><div class="tax-value">${escapeHtml(value ?? "—")}</div></div>`;
  }

  function renderProduct(product, options = {}) {
    currentProductId = product.id;
    const dateValue = referenceDate.value || window.TAX_APP_META.updatedAt;
    const period = getStPeriod(product, dateValue);
    const futurePeriods = (product.st?.periods || []).filter(p => parseDate(p.from) > parseDate(dateValue));
    const alternatives = product.alternativeNcms?.length ? product.alternativeNcms.join(", ") : "—";
    const warnings = [...(product.warnings || [])];

    if (!period) warnings.unshift("Não há período específico cadastrado para a data selecionada. Revise a legislação vigente.");
    if (futurePeriods.length) {
      warnings.push(`Mudança futura cadastrada: ${futurePeriods.map(p => `${p.status === "não" ? "saída da ST" : "nova regra"} em ${formatDate(p.from)} (${p.source})`).join("; ")}.`);
    }
    if (product.confidence !== "alta") warnings.push("Confirme a descrição comercial, composição, embalagem e documentação técnica antes de alterar o cadastro fiscal.");

    const isFavorite = getFavorites().includes(product.id);
    resultArea.className = "card result-card";
    resultArea.innerHTML = `
      <div class="result-header">
        <div class="result-heading">
          <div>
            <h2>${escapeHtml(product.name)}</h2>
            <p>${escapeHtml(product.summary)}</p>
            <div class="badges">
              ${confidenceBadge(product.confidence)}
              <span class="badge primary">NCM ${escapeHtml(product.ncm)}</span>
              <span class="badge info">${escapeHtml(product.category)}</span>
              ${stBadge(period)}
              <span class="badge">Referência ${formatDate(dateValue)}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="answer-box">${buildNarrative(product, period, dateValue)}</div>

      <div class="tax-grid">
        <section class="tax-block">
          <h3>🏷️ Classificação fiscal</h3>
          ${taxRow("NCM esperada", product.ncm)}
          ${taxRow("NCM alternativa", alternatives)}
          ${taxRow("Observação", product.ncmNotes)}
        </section>

        <section class="tax-block">
          <h3>🧾 ICMS próprio</h3>
          ${taxRow("Alíquota", product.icms?.rate)}
          ${taxRow("Carga efetiva", product.icms?.effectiveLoad)}
          ${taxRow("Base legal", product.icms?.basis)}
          ${taxRow("Aplicação", product.icms?.notes)}
        </section>

        <section class="tax-block">
          <h3>🔁 Substituição tributária</h3>
          ${taxRow("Situação", period?.status?.toUpperCase() || "ANALISAR")}
          ${taxRow("CEST", period?.cest || "—")}
          ${taxRow("IVA / MVA", period?.iva || "—")}
          ${taxRow("Vigência", period ? `${formatDate(period.from)} até ${formatDate(period.to)}` : "—")}
          ${taxRow("Base legal", period?.source || "—")}
          ${taxRow("Observação", period?.note || "—")}
        </section>

        <section class="tax-block">
          <h3>🇧🇷 PIS / COFINS</h3>
          ${taxRow("Tratamento", product.pisCofins?.status)}
          ${taxRow("CST", product.pisCofins?.cst)}
          ${taxRow("Item tabela", product.pisCofins?.item)}
          ${taxRow("Base", product.pisCofins?.basis)}
          ${taxRow("Observação", product.pisCofins?.note)}
        </section>

        <section class="tax-block">
          <h3>🔖 cBenef</h3>
          ${taxRow("Código", product.cbenef?.code)}
          ${taxRow("Situação", product.cbenef?.status)}
          ${taxRow("Base", product.cbenef?.basis)}
          ${taxRow("Observação", product.cbenef?.note)}
        </section>

        <section class="tax-block">
          <h3>📌 Contexto da consulta</h3>
          ${taxRow("Finalidade", operationType.options[operationType.selectedIndex].text)}
          ${taxRow("Origem", origin.options[origin.selectedIndex].text)}
          ${taxRow("Ambiente", window.TAX_APP_META.context)}
          ${taxRow("Base", `Versão ${window.TAX_APP_META.version}`)}
        </section>
      </div>

      ${warnings.length ? `<div class="warning-box"><strong>⚠ Pontos de atenção</strong><ul>${warnings.map(w => `<li>${escapeHtml(w)}</li>`).join("")}</ul></div>` : ""}

      <div class="result-actions">
        <button class="btn primary" id="favoriteCurrentBtn">${isFavorite ? "★ Remover favorito" : "☆ Favoritar"}</button>
        <button class="btn" id="copyResultBtn">📋 Copiar conclusão</button>
        <button class="btn" id="printResultBtn">🖨️ Imprimir/PDF</button>
      </div>
    `;

    el("favoriteCurrentBtn").addEventListener("click", () => toggleFavorite(product.id));
    el("copyResultBtn").addEventListener("click", () => copyNarrative(product, period, dateValue));
    el("printResultBtn").addEventListener("click", () => window.print());

    if (!options.skipHistory) addHistory(product);
    renderHistory();
    renderFavorites();
  }

  function renderGenericResult(query) {
    currentProductId = null;
    const ncm = onlyDigits(query);
    const applicable = ncm.length >= 2 ? (window.GENERIC_RULES || []).filter(rule => {
      try { return rule.test(ncm); } catch { return false; }
    }) : [];

    resultArea.className = "card";
    resultArea.innerHTML = `
      <div class="result-heading">
        <div>
          <h2>Nenhum produto exato encontrado</h2>
          <p>Consulta: <strong>${escapeHtml(query)}</strong>${ncm ? ` — NCM normalizada ${escapeHtml(ncm)}` : ""}</p>
        </div>
      </div>
      <div class="warning-box" style="margin:16px 0">
        <strong>Não foi emitida conclusão definitiva.</strong>
        <div style="margin-top:7px">Cadastre o produto na base ou use as regras preliminares abaixo. NCM, descrição, composição, embalagem, CEST e data precisam ser avaliados em conjunto.</div>
      </div>
      ${applicable.length ? applicable.map(rule => `<div class="generic-card"><h3>${escapeHtml(rule.title)}</h3><p>${escapeHtml(rule.message)}</p></div>`).join("") : '<div class="generic-card"><h3>Análise manual necessária</h3><p>Não há regra genérica segura para essa consulta. Use o gerenciador da base para incluir um registro após validar a legislação.</p></div>'}
      <div class="result-actions" style="padding:10px 0 0">
        <button class="btn primary" data-open-modal="databaseModal">Adicionar à base</button>
        <button class="btn" data-open-modal="sourcesModal">Consultar fontes</button>
      </div>
    `;
    bindModalButtons(resultArea);
  }

  function performSearch(query, options = {}) {
    const cleanQuery = String(query || "").trim();
    if (!cleanQuery) {
      showToast("Digite o nome do produto ou NCM.");
      searchInput.focus();
      return;
    }

    searchInput.value = cleanQuery;
    const matches = findProducts(cleanQuery);

    if (!matches.length) {
      matchList.hidden = true;
      matchList.innerHTML = "";
      renderGenericResult(cleanQuery);
      return;
    }

    if (matches.length > 1 && matches[0].score - matches[1].score < 25 && !options.forceFirst) {
      matchList.hidden = false;
      matchList.innerHTML = matches.slice(0, 6).map(({ product, score }) => `
        <button class="match-item" data-product-id="${escapeHtml(product.id)}">
          <strong>${escapeHtml(product.name)}</strong>
          <small>NCM ${escapeHtml(product.ncm)} · ${escapeHtml(product.category)} · compatibilidade ${Math.min(100, Math.round(score))}%</small>
        </button>
      `).join("");
      matchList.querySelectorAll("[data-product-id]").forEach(btn => btn.addEventListener("click", () => {
        matchList.hidden = true;
        renderProduct(products.find(p => p.id === btn.dataset.productId));
      }));
    } else {
      matchList.hidden = true;
      matchList.innerHTML = "";
    }

    renderProduct(matches[0].product, options);
  }

  function getHistory() {
    try { return JSON.parse(localStorage.getItem(STORAGE.history)) || []; }
    catch { return []; }
  }

  function addHistory(product) {
    const history = getHistory().filter(item => item.id !== product.id);
    history.unshift({ id: product.id, name: product.name, ncm: product.ncm, date: referenceDate.value });
    localStorage.setItem(STORAGE.history, JSON.stringify(history.slice(0, 10)));
  }

  function renderHistory() {
    const history = getHistory();
    const container = el("historyList");
    if (!history.length) {
      container.innerHTML = '<p style="color:var(--muted); font-size:.85rem">Nenhuma consulta.</p>';
      return;
    }
    container.innerHTML = history.map(item => `
      <div class="side-item">
        <button class="side-item-main" data-history-id="${escapeHtml(item.id)}" style="text-align:left">
          <strong>${escapeHtml(item.name)}</strong><small>NCM ${escapeHtml(item.ncm)}</small>
        </button>
        <button data-remove-history="${escapeHtml(item.id)}" aria-label="Remover">×</button>
      </div>
    `).join("");
    container.querySelectorAll("[data-history-id]").forEach(btn => btn.addEventListener("click", () => {
      const product = products.find(p => p.id === btn.dataset.historyId);
      if (product) {
        searchInput.value = product.name;
        renderProduct(product, { skipHistory: true });
      }
    }));
    container.querySelectorAll("[data-remove-history]").forEach(btn => btn.addEventListener("click", () => {
      const next = getHistory().filter(item => item.id !== btn.dataset.removeHistory);
      localStorage.setItem(STORAGE.history, JSON.stringify(next));
      renderHistory();
    }));
  }

  function getFavorites() {
    try { return JSON.parse(localStorage.getItem(STORAGE.favorites)) || []; }
    catch { return []; }
  }

  function toggleFavorite(productId) {
    const favorites = getFavorites();
    const exists = favorites.includes(productId);
    const next = exists ? favorites.filter(id => id !== productId) : [productId, ...favorites];
    localStorage.setItem(STORAGE.favorites, JSON.stringify(next));
    showToast(exists ? "Removido dos favoritos." : "Adicionado aos favoritos.");
    const product = products.find(p => p.id === productId);
    if (product) renderProduct(product, { skipHistory: true });
  }

  function renderFavorites() {
    const favorites = getFavorites();
    const container = el("favoritesList");
    if (!favorites.length) {
      container.innerHTML = '<p style="color:var(--muted); font-size:.85rem">Nenhum favorito.</p>';
      return;
    }
    container.innerHTML = favorites.map(id => products.find(p => p.id === id)).filter(Boolean).map(product => `
      <div class="side-item">
        <button class="side-item-main" data-favorite-id="${escapeHtml(product.id)}" style="text-align:left">
          <strong>${escapeHtml(product.name)}</strong><small>NCM ${escapeHtml(product.ncm)}</small>
        </button>
        <button data-remove-favorite="${escapeHtml(product.id)}" aria-label="Remover">×</button>
      </div>
    `).join("");
    container.querySelectorAll("[data-favorite-id]").forEach(btn => btn.addEventListener("click", () => {
      const product = products.find(p => p.id === btn.dataset.favoriteId);
      if (product) renderProduct(product);
    }));
    container.querySelectorAll("[data-remove-favorite]").forEach(btn => btn.addEventListener("click", () => toggleFavorite(btn.dataset.removeFavorite)));
  }

  function copyNarrative(product, period, dateValue) {
    const temp = document.createElement("div");
    temp.innerHTML = buildNarrative(product, period, dateValue);
    const text = temp.textContent.trim();
    navigator.clipboard?.writeText(text)
      .then(() => showToast("Conclusão copiada."))
      .catch(() => showToast("Não foi possível copiar automaticamente."));
  }

  function calculateAdjustedIva() {
    const original = Number(String(el("ivaOriginal").value).replace(",", ".")) / 100;
    const inter = Number(String(el("aliqInter").value).replace(",", ".")) / 100;
    const intra = Number(String(el("aliqIntra").value).replace(",", ".")) / 100;
    if (![original, inter, intra].every(Number.isFinite) || original < 0 || inter < 0 || intra <= 0 || intra >= 1) {
      showToast("Preencha percentuais válidos.");
      return;
    }
    const adjusted = (((1 + original) * (1 - inter)) / (1 - intra) - 1) * 100;
    el("ivaResult").hidden = false;
    el("ivaResult").textContent = `IVA-ST ajustado: ${adjusted.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  }

  function showToast(message) {
    const toast = el("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2500);
  }

  function loadCustomDatabase() {
    try {
      const value = localStorage.getItem(STORAGE.customDb);
      if (!value) return null;
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  function validateDatabase(data) {
    if (!Array.isArray(data)) throw new Error("A base precisa ser uma lista JSON.");
    data.forEach((item, index) => {
      if (!item || typeof item !== "object") throw new Error(`Registro ${index + 1} inválido.`);
      for (const field of ["id", "name", "ncm"]) {
        if (!item[field]) throw new Error(`Registro ${index + 1}: campo ${field} obrigatório.`);
      }
      if (!item.st?.periods || !Array.isArray(item.st.periods)) throw new Error(`Registro ${index + 1}: informe st.periods.`);
    });
    return true;
  }

  function refreshDatabaseEditor() {
    el("databaseEditor").value = JSON.stringify(products, null, 2);
  }

  function saveDatabaseFromEditor() {
    try {
      const parsed = JSON.parse(el("databaseEditor").value);
      validateDatabase(parsed);
      products = parsed;
      localStorage.setItem(STORAGE.customDb, JSON.stringify(products));
      showToast("Base salva neste navegador.");
      closeModal(el("databaseModal"));
    } catch (error) {
      showToast(error.message || "JSON inválido.");
    }
  }

  function exportDatabase() {
    const blob = new Blob([JSON.stringify(products, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `base-agente-tributario-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importDatabaseFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        validateDatabase(parsed);
        products = parsed;
        localStorage.setItem(STORAGE.customDb, JSON.stringify(products));
        refreshDatabaseEditor();
        showToast("Base importada.");
      } catch (error) {
        showToast(error.message || "Arquivo inválido.");
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function restoreDatabase() {
    products = structuredClone(originalProducts);
    localStorage.removeItem(STORAGE.customDb);
    refreshDatabaseEditor();
    showToast("Base original restaurada.");
  }

  function openModal(modal) {
    if (!modal) return;
    if (modal.id === "databaseModal") refreshDatabaseEditor();
    modal.classList.add("open");
  }

  function closeModal(modal) {
    modal?.classList.remove("open");
  }

  function bindModalButtons(root = document) {
    root.querySelectorAll("[data-open-modal]").forEach(button => {
      button.addEventListener("click", () => openModal(el(button.dataset.openModal)));
    });
    root.querySelectorAll("[data-close-modal]").forEach(button => {
      button.addEventListener("click", () => closeModal(button.closest(".modal-backdrop")));
    });
  }

  function renderMeta() {
    el("versionBadge").textContent = `v${window.TAX_APP_META.version}`;
    el("assumptionsList").innerHTML = window.TAX_APP_META.assumptions.map(text => `<p>• ${escapeHtml(text)}</p>`).join("");
    el("sourceList").innerHTML = window.TAX_APP_META.sources.map(source => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.label)} ↗</a>`).join("");
  }

  searchForm.addEventListener("submit", event => {
    event.preventDefault();
    performSearch(searchInput.value);
  });

  document.querySelectorAll("[data-query]").forEach(button => button.addEventListener("click", () => performSearch(button.dataset.query, { forceFirst: true })));

  [referenceDate, operationType, origin].forEach(control => control.addEventListener("change", () => {
    if (currentProductId) {
      const product = products.find(p => p.id === currentProductId);
      if (product) renderProduct(product, { skipHistory: true });
    }
  }));

  el("clearHistoryBtn").addEventListener("click", () => {
    localStorage.removeItem(STORAGE.history);
    renderHistory();
    showToast("Histórico limpo.");
  });
  el("calculateIvaBtn").addEventListener("click", calculateAdjustedIva);
  el("saveDatabaseBtn").addEventListener("click", saveDatabaseFromEditor);
  el("exportDatabaseBtn").addEventListener("click", exportDatabase);
  el("restoreDatabaseBtn").addEventListener("click", restoreDatabase);
  el("importDatabaseBtn").addEventListener("click", () => el("importFile").click());
  el("importFile").addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (file) importDatabaseFile(file);
    event.target.value = "";
  });

  document.querySelectorAll(".modal-backdrop").forEach(backdrop => backdrop.addEventListener("click", event => {
    if (event.target === backdrop) closeModal(backdrop);
  }));

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    el("installBtn").hidden = false;
  });

  el("installBtn").addEventListener("click", async () => {
    if (!deferredInstallPrompt) {
      showToast("Use o menu do navegador e escolha ‘Instalar app’ ou ‘Adicionar à tela inicial’. ");
      return;
    }
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    el("installBtn").hidden = true;
  });

  window.addEventListener("appinstalled", () => showToast("Aplicativo instalado."));

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js").catch(() => {}));
  }

  bindModalButtons();
  renderMeta();
  renderHistory();
  renderFavorites();
})();

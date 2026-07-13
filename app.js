(() => {
  "use strict";

  const STORAGE = {
    history: "agenteTributario.history.online.v2",
    favorites: "agenteTributario.favorites.online.v2",
    customDb: "agenteTributario.customDb.v1",
    accessCode: "agenteTributario.accessCode.v1"
  };

  const originalProducts = clone(window.TAX_PRODUCTS || []);
  let products = loadCustomDatabase() || clone(originalProducts);
  let deferredInstallPrompt = null;
  let activeController = null;
  let currentQuery = "";
  let currentAnswer = "";
  let currentSources = [];

  const el = id => document.getElementById(id);
  const searchForm = el("searchForm");
  const searchInput = el("searchInput");
  const searchBtn = el("searchBtn");
  const resultArea = el("resultArea");
  const referenceDate = el("referenceDate");
  const operationType = el("operationType");
  const origin = el("origin");

  function clone(value) {
    return typeof structuredClone === "function"
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));
  }

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

  function safeUrl(value = "") {
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "#";
    } catch {
      return "#";
    }
  }

  function localIsoDate() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR");
  }

  function operationLabel() {
    return operationType.options[operationType.selectedIndex]?.text || operationType.value;
  }

  function originLabel() {
    return origin.options[origin.selectedIndex]?.text || origin.value;
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
        else if (ncm.startsWith(qDigits)) score = Math.max(score, 98);
        else if (qDigits.startsWith(ncm)) score = Math.max(score, 84);
        else if (ncm.includes(qDigits)) score = Math.max(score, 72);
      }
    }

    for (const name of names) {
      if (q === name) score = Math.max(score, 115);
      else if (name.startsWith(q)) score = Math.max(score, 93);
      else if (name.includes(q)) score = Math.max(score, 80);

      const qTokens = q.split(" ").filter(Boolean);
      const nameTokens = new Set(name.split(" ").filter(Boolean));
      const hits = qTokens.filter(token => nameTokens.has(token) || [...nameTokens].some(n => n.startsWith(token))).length;
      if (hits) score = Math.max(score, 44 + hits * 12 - (qTokens.length - hits) * 5);
    }

    const haystack = normalize([
      product.name,
      ...(product.aliases || []),
      product.category,
      product.summary,
      ...(product.tags || [])
    ].join(" "));
    if (haystack.includes(q)) score = Math.max(score, 65);

    return score;
  }

  function findBestLocalProduct(query) {
    const matches = products
      .map(product => ({ product, score: scoreProduct(product, query) }))
      .sort((a, b) => b.score - a.score);
    return matches[0]?.score >= 55 ? matches[0] : null;
  }

  function compactLocalRecord(product) {
    if (!product) return null;
    return {
      name: product.name,
      aliases: product.aliases || [],
      ncm: product.ncm,
      alternativeNcms: product.alternativeNcms || [],
      category: product.category,
      confidence: product.confidence,
      summary: product.summary,
      ncmNotes: product.ncmNotes,
      icms: product.icms,
      st: product.st,
      pisCofins: product.pisCofins,
      cbenef: product.cbenef,
      warnings: product.warnings || []
    };
  }

  function applyInlineFormatting(text) {
    let html = escapeHtml(text);
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/(^|\s)\*([^*]+)\*(?=\s|$)/g, "$1<em>$2</em>");
    html = html.replace(/\[(\d+)\]/g, '<a class="citation" href="#source-$1" aria-label="Ir para a fonte $1">[$1]</a>');
    return html;
  }

  function markdownToHtml(markdown = "") {
    const lines = String(markdown).replace(/\r/g, "").split("\n");
    const output = [];
    let listType = null;

    const closeList = () => {
      if (listType) output.push(`</${listType}>`);
      listType = null;
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        closeList();
        continue;
      }

      const heading = line.match(/^(#{1,4})\s+(.+)$/);
      if (heading) {
        closeList();
        const level = Math.min(4, heading[1].length + 1);
        output.push(`<h${level}>${applyInlineFormatting(heading[2])}</h${level}>`);
        continue;
      }

      if (/^[-*_]{3,}$/.test(line)) {
        closeList();
        output.push("<hr>");
        continue;
      }

      const bullet = line.match(/^[-*•]\s+(.+)$/);
      if (bullet) {
        if (listType !== "ul") {
          closeList();
          listType = "ul";
          output.push("<ul>");
        }
        output.push(`<li>${applyInlineFormatting(bullet[1])}</li>`);
        continue;
      }

      const numbered = line.match(/^\d+[.)]\s+(.+)$/);
      if (numbered) {
        if (listType !== "ol") {
          closeList();
          listType = "ol";
          output.push("<ol>");
        }
        output.push(`<li>${applyInlineFormatting(numbered[1])}</li>`);
        continue;
      }

      if (line.startsWith(">")) {
        closeList();
        output.push(`<blockquote>${applyInlineFormatting(line.slice(1).trim())}</blockquote>`);
        continue;
      }

      closeList();
      output.push(`<p>${applyInlineFormatting(line)}</p>`);
    }

    closeList();
    return output.join("");
  }

  function renderLoading(query, localMatch) {
    resultArea.className = "card loading-card";
    resultArea.innerHTML = `
      <div class="loading-orb"><span></span><span></span><span></span></div>
      <h2>Consultando “${escapeHtml(query)}”</h2>
      <p>Pesquisando classificação fiscal, legislação paulista, ST, PIS/COFINS e cBenef vigentes em ${formatDate(referenceDate.value)}.</p>
      <div class="search-steps">
        <div class="active"><span>1</span> Identificando o produto e a NCM provável</div>
        <div><span>2</span> Verificando fontes oficiais e vigências</div>
        <div><span>3</span> Montando o parecer tributário</div>
      </div>
      ${localMatch ? `<div class="local-context-note">Base local encontrada: <strong>${escapeHtml(localMatch.product.name)}</strong>, NCM ${escapeHtml(localMatch.product.ncm)}. O registro será conferido online, e não usado como conclusão automática.</div>` : ""}
    `;
  }

  function officialSource(url) {
    try {
      const host = new URL(url).hostname.toLowerCase();
      return host.endsWith("gov.br") || host.endsWith("fazenda.sp.gov.br") || host.endsWith("planalto.gov.br");
    } catch {
      return false;
    }
  }

  function renderOnlineResult(data, query, localMatch) {
    currentQuery = query;
    currentAnswer = data.answer || "";
    currentSources = Array.isArray(data.sources) ? data.sources : [];

    const sourceHtml = currentSources.length
      ? `<section class="online-sources">
          <h3>Fontes consultadas</h3>
          <p>Os números no parecer levam às páginas abaixo.</p>
          <div class="source-cards">
            ${currentSources.map((source, index) => `
              <a id="source-${index + 1}" href="${escapeHtml(safeUrl(source.url))}" target="_blank" rel="noopener noreferrer" class="source-card">
                <span class="source-number">${index + 1}</span>
                <span class="source-content">
                  <strong>${escapeHtml(source.title || source.url)}</strong>
                  <small>${escapeHtml(source.domain || (() => { try { return new URL(source.url).hostname; } catch { return "Fonte web"; } })())}</small>
                </span>
                ${officialSource(source.url) ? '<span class="official-badge">Oficial</span>' : '<span class="support-badge">Apoio</span>'}
              </a>
            `).join("")}
          </div>
        </section>`
      : `<div class="warning-box source-warning"><strong>Fontes não retornadas.</strong><p>Não use o resultado como conclusão definitiva sem abrir e conferir a legislação indicada no texto.</p></div>`;

    resultArea.className = "card result-card online-result";
    resultArea.innerHTML = `
      <div class="result-header">
        <div class="result-heading">
          <div>
            <h2>${escapeHtml(query)}</h2>
            <p>Parecer gerado por consulta online para supermercado varejista no Estado de São Paulo.</p>
            <div class="badges">
              <span class="badge success">Pesquisa online concluída</span>
              <span class="badge primary">Data ${formatDate(referenceDate.value)}</span>
              <span class="badge info">${escapeHtml(operationLabel())}</span>
              <span class="badge">${escapeHtml(originLabel())}</span>
              ${localMatch ? '<span class="badge warning">Base local usada como contexto</span>' : ""}
            </div>
          </div>
        </div>
      </div>

      <article class="ai-answer">${markdownToHtml(currentAnswer)}</article>
      ${sourceHtml}

      <div class="warning-box legal-warning">
        <strong>Revisão profissional necessária</strong>
        <p>A IA pode errar na identificação comercial ou na interpretação de vigências. Confirme descrição, composição, embalagem, CEST e texto legal antes de alterar o ERP ou escriturar o documento.</p>
      </div>

      <div class="result-actions">
        <button class="btn primary" id="favoriteCurrentBtn">${isFavorite(query) ? "★ Remover favorito" : "☆ Favoritar consulta"}</button>
        <button class="btn" id="copyResultBtn">📋 Copiar parecer</button>
        <button class="btn" id="printResultBtn">🖨️ Imprimir/PDF</button>
      </div>
    `;

    el("favoriteCurrentBtn").addEventListener("click", () => {
      toggleFavorite(query);
      renderOnlineResult(data, query, localMatch);
    });
    el("copyResultBtn").addEventListener("click", copyCurrentAnswer);
    el("printResultBtn").addEventListener("click", () => window.print());

    addHistory(query);
    renderHistory();
    renderFavorites();
    resultArea.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderLocalFallback(product, query, errorMessage) {
    currentQuery = query;
    currentAnswer = "";
    currentSources = [];
    const periods = product?.st?.periods || [];
    const dateValue = referenceDate.value;
    const target = new Date(`${dateValue}T12:00:00`);
    const period = periods.find(item => {
      const from = item.from ? new Date(`${item.from}T12:00:00`) : null;
      const to = item.to ? new Date(`${item.to}T12:00:00`) : null;
      return (!from || target >= from) && (!to || target <= to);
    });

    resultArea.className = "card result-card";
    resultArea.innerHTML = `
      <div class="result-header">
        <div class="result-heading">
          <div>
            <h2>${escapeHtml(product.name)}</h2>
            <p>${escapeHtml(product.summary || "Registro encontrado na base local.")}</p>
            <div class="badges">
              <span class="badge danger">Consulta online indisponível</span>
              <span class="badge primary">NCM ${escapeHtml(product.ncm)}</span>
              <span class="badge warning">Resultado local não reconfirmado</span>
            </div>
          </div>
        </div>
      </div>
      <div class="warning-box setup-warning">
        <strong>Não foi possível pesquisar na internet.</strong>
        <p>${escapeHtml(errorMessage)}</p>
      </div>
      <div class="tax-grid">
        ${localBlock("Classificação fiscal", [
          ["NCM", product.ncm],
          ["Observação", product.ncmNotes]
        ])}
        ${localBlock("ICMS próprio", [
          ["Alíquota", product.icms?.rate],
          ["Carga efetiva", product.icms?.effectiveLoad],
          ["Base", product.icms?.basis],
          ["Aplicação", product.icms?.notes]
        ])}
        ${localBlock("Substituição tributária", [
          ["Situação", period?.status?.toUpperCase() || "SEM REGRA LOCAL PARA A DATA"],
          ["CEST", period?.cest],
          ["IVA/MVA", period?.iva],
          ["Base", period?.source],
          ["Observação", period?.note]
        ])}
        ${localBlock("PIS/COFINS", [
          ["Tratamento", product.pisCofins?.status],
          ["CST", product.pisCofins?.cst],
          ["Item", product.pisCofins?.item],
          ["Base", product.pisCofins?.basis]
        ])}
      </div>
      <div class="warning-box legal-warning"><strong>Este é apenas o registro local.</strong><p>Não foi feita conferência online. Corrija a configuração da API antes de usar o resultado.</p></div>
      <div class="result-actions">
        <button class="btn primary" data-open-modal="settingsModal">Abrir configuração</button>
        <button class="btn" id="retryLocalSearchBtn">Tentar consulta online</button>
      </div>
    `;
    bindModalButtons(resultArea);
    el("retryLocalSearchBtn")?.addEventListener("click", () => performSearch(query));
  }

  function localBlock(title, rows) {
    return `<section class="tax-block"><h3>${escapeHtml(title)}</h3>${rows.map(([label, value]) => `
      <div class="tax-row"><div class="tax-label">${escapeHtml(label)}</div><div class="tax-value">${escapeHtml(value ?? "—")}</div></div>
    `).join("")}</section>`;
  }

  function renderApiError(error, query, localMatch) {
    const message = error?.message || "Erro desconhecido ao consultar o serviço.";
    if (localMatch?.product) {
      renderLocalFallback(localMatch.product, query, message);
      return;
    }

    const isConfig = /OPENAI_API_KEY|configur|código de acesso|401|403/i.test(message);
    resultArea.className = "card error-card";
    resultArea.innerHTML = `
      <div class="error-icon">!</div>
      <h2>${isConfig ? "A consulta online ainda não está configurada" : "Não foi possível concluir a consulta"}</h2>
      <p>${escapeHtml(message)}</p>
      ${isConfig ? `
        <div class="setup-steps">
          <div><span>1</span><p>Na Vercel, abra o projeto e entre em <strong>Settings → Environment Variables</strong>.</p></div>
          <div><span>2</span><p>Crie a variável <code>OPENAI_API_KEY</code> com a chave da API da OpenAI.</p></div>
          <div><span>3</span><p>Opcional: crie <code>APP_ACCESS_CODE</code> para impedir uso público do seu saldo.</p></div>
          <div><span>4</span><p>Faça um novo deploy e, se criou o código de acesso, salve-o em <strong>Configuração</strong> neste aplicativo.</p></div>
        </div>
      ` : ""}
      <div class="result-actions centered-actions">
        <button class="btn primary" data-open-modal="settingsModal">Abrir configuração</button>
        <button class="btn" id="retrySearchBtn">Tentar novamente</button>
      </div>
    `;
    bindModalButtons(resultArea);
    el("retrySearchBtn")?.addEventListener("click", () => performSearch(query));
  }

  async function performSearch(query) {
    const cleanQuery = String(query || "").trim();
    if (!cleanQuery) {
      showToast("Digite o nome do produto ou NCM.");
      searchInput.focus();
      return;
    }

    if (activeController) activeController.abort();
    activeController = new AbortController();
    const localMatch = findBestLocalProduct(cleanQuery);

    searchInput.value = cleanQuery;
    searchBtn.disabled = true;
    searchBtn.textContent = "Consultando...";
    renderLoading(cleanQuery, localMatch);

    try {
      const headers = { "Content-Type": "application/json" };
      const accessCode = localStorage.getItem(STORAGE.accessCode) || "";
      if (accessCode) headers["X-App-Code"] = accessCode;

      const response = await fetch("/api/consulta", {
        method: "POST",
        headers,
        signal: activeController.signal,
        body: JSON.stringify({
          query: cleanQuery,
          referenceDate: referenceDate.value || localIsoDate(),
          operationType: operationType.value,
          operationLabel: operationLabel(),
          origin: origin.value,
          originLabel: originLabel(),
          localContext: localMatch ? compactLocalRecord(localMatch.product) : null
        })
      });

      let data = null;
      try { data = await response.json(); }
      catch { data = null; }

      if (!response.ok) {
        const error = new Error(data?.error || `Falha HTTP ${response.status}.`);
        error.status = response.status;
        throw error;
      }
      if (!data?.answer) throw new Error("A API não retornou um parecer tributário.");

      renderOnlineResult(data, cleanQuery, localMatch);
    } catch (error) {
      if (error?.name === "AbortError") return;
      renderApiError(error, cleanQuery, localMatch);
    } finally {
      searchBtn.disabled = false;
      searchBtn.textContent = "Consultar online";
      activeController = null;
    }
  }

  function getHistory() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE.history));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function addHistory(query) {
    const normalized = normalize(query);
    const history = getHistory().filter(item => normalize(item.query) !== normalized);
    history.unshift({
      query,
      date: referenceDate.value,
      operationType: operationType.value,
      origin: origin.value,
      createdAt: new Date().toISOString()
    });
    localStorage.setItem(STORAGE.history, JSON.stringify(history.slice(0, 12)));
  }

  function renderHistory() {
    const history = getHistory();
    const container = el("historyList");
    if (!history.length) {
      container.innerHTML = '<p class="muted">Nenhuma consulta.</p>';
      return;
    }
    container.innerHTML = history.map((item, index) => `
      <div class="side-item">
        <button class="side-item-main" data-history-index="${index}" style="text-align:left">
          <strong>${escapeHtml(item.query)}</strong>
          <small>${formatDate(item.date || localIsoDate())}</small>
        </button>
        <button data-remove-history="${index}" aria-label="Remover">×</button>
      </div>
    `).join("");

    container.querySelectorAll("[data-history-index]").forEach(button => button.addEventListener("click", () => {
      const item = history[Number(button.dataset.historyIndex)];
      if (!item) return;
      referenceDate.value = item.date || localIsoDate();
      operationType.value = item.operationType || "sale";
      origin.value = item.origin || "internal";
      performSearch(item.query);
    }));

    container.querySelectorAll("[data-remove-history]").forEach(button => button.addEventListener("click", () => {
      const index = Number(button.dataset.removeHistory);
      const next = history.filter((_, itemIndex) => itemIndex !== index);
      localStorage.setItem(STORAGE.history, JSON.stringify(next));
      renderHistory();
    }));
  }

  function getFavorites() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE.favorites));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function isFavorite(query) {
    const normalized = normalize(query);
    return getFavorites().some(item => normalize(typeof item === "string" ? item : item.query) === normalized);
  }

  function toggleFavorite(query) {
    const normalized = normalize(query);
    const favorites = getFavorites();
    const exists = favorites.some(item => normalize(typeof item === "string" ? item : item.query) === normalized);
    const next = exists
      ? favorites.filter(item => normalize(typeof item === "string" ? item : item.query) !== normalized)
      : [{ query, date: referenceDate.value, operationType: operationType.value, origin: origin.value }, ...favorites];
    localStorage.setItem(STORAGE.favorites, JSON.stringify(next.slice(0, 20)));
    renderFavorites();
    showToast(exists ? "Removido dos favoritos." : "Consulta adicionada aos favoritos.");
  }

  function renderFavorites() {
    const favorites = getFavorites();
    const container = el("favoritesList");
    if (!favorites.length) {
      container.innerHTML = '<p class="muted">Nenhum favorito.</p>';
      return;
    }

    const normalizedItems = favorites.map(item => typeof item === "string" ? { query: item } : item);
    container.innerHTML = normalizedItems.map((item, index) => `
      <div class="side-item">
        <button class="side-item-main" data-favorite-index="${index}" style="text-align:left">
          <strong>${escapeHtml(item.query)}</strong>
          <small>${item.date ? formatDate(item.date) : "Consulta salva"}</small>
        </button>
        <button data-remove-favorite="${index}" aria-label="Remover">×</button>
      </div>
    `).join("");

    container.querySelectorAll("[data-favorite-index]").forEach(button => button.addEventListener("click", () => {
      const item = normalizedItems[Number(button.dataset.favoriteIndex)];
      if (!item) return;
      if (item.date) referenceDate.value = item.date;
      if (item.operationType) operationType.value = item.operationType;
      if (item.origin) origin.value = item.origin;
      performSearch(item.query);
    }));

    container.querySelectorAll("[data-remove-favorite]").forEach(button => button.addEventListener("click", () => {
      const index = Number(button.dataset.removeFavorite);
      const next = normalizedItems.filter((_, itemIndex) => itemIndex !== index);
      localStorage.setItem(STORAGE.favorites, JSON.stringify(next));
      renderFavorites();
    }));
  }

  async function copyCurrentAnswer() {
    const sourceText = currentSources.map((source, index) => `[${index + 1}] ${source.title || source.url} — ${source.url}`).join("\n");
    const text = `${currentQuery}\n\n${currentAnswer}${sourceText ? `\n\nFONTES\n${sourceText}` : ""}`;
    try {
      await navigator.clipboard.writeText(text);
      showToast("Parecer copiado.");
    } catch {
      showToast("Não foi possível copiar automaticamente.");
    }
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
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2800);
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
      showToast("Base local salva neste navegador.");
      closeModal(el("databaseModal"));
    } catch (error) {
      showToast(error.message || "JSON inválido.");
    }
  }

  function exportDatabase() {
    const blob = new Blob([JSON.stringify(products, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `base-agente-tributario-${localIsoDate()}.json`;
    anchor.click();
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
        showToast("Base local importada.");
      } catch (error) {
        showToast(error.message || "Arquivo inválido.");
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function restoreDatabase() {
    products = clone(originalProducts);
    localStorage.removeItem(STORAGE.customDb);
    refreshDatabaseEditor();
    showToast("Base local original restaurada.");
  }

  function openModal(modal) {
    if (!modal) return;
    if (modal.id === "databaseModal") refreshDatabaseEditor();
    if (modal.id === "settingsModal") el("accessCodeInput").value = localStorage.getItem(STORAGE.accessCode) || "";
    modal.classList.add("open");
  }

  function closeModal(modal) {
    modal?.classList.remove("open");
  }

  function bindModalButtons(root = document) {
    root.querySelectorAll("[data-open-modal]").forEach(button => {
      if (button.dataset.modalBound === "1") return;
      button.dataset.modalBound = "1";
      button.addEventListener("click", () => openModal(el(button.dataset.openModal)));
    });
    root.querySelectorAll("[data-close-modal]").forEach(button => {
      if (button.dataset.modalBound === "1") return;
      button.dataset.modalBound = "1";
      button.addEventListener("click", () => closeModal(button.closest(".modal-backdrop")));
    });
  }

  function renderMeta() {
    const meta = window.TAX_APP_META || {};
    el("versionBadge").textContent = "Online v2";
    const assumptions = [
      "A pesquisa online é feita em cada consulta, mesmo quando o produto não existe na base local.",
      "A base cadastrada funciona apenas como contexto e deve ser reconfirmada na legislação.",
      "A análise considera supermercado varejista em São Paulo, RPA/Lucro Real.",
      "Descrição legal, NCM, CEST, embalagem e vigência precisam coincidir para aplicar ST ou benefício."
    ];
    el("assumptionsList").innerHTML = assumptions.map(text => `<p>• ${escapeHtml(text)}</p>`).join("");
    el("sourceList").innerHTML = (meta.sources || []).map(source => `<a href="${escapeHtml(safeUrl(source.url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.label)} ↗</a>`).join("");
  }

  searchForm.addEventListener("submit", event => {
    event.preventDefault();
    performSearch(searchInput.value);
  });

  document.querySelectorAll("[data-query]").forEach(button => button.addEventListener("click", () => performSearch(button.dataset.query)));

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
  el("saveSettingsBtn").addEventListener("click", () => {
    const value = el("accessCodeInput").value.trim();
    if (value) localStorage.setItem(STORAGE.accessCode, value);
    else localStorage.removeItem(STORAGE.accessCode);
    closeModal(el("settingsModal"));
    showToast("Configuração salva neste navegador.");
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

  referenceDate.value = localIsoDate();
  bindModalButtons();
  renderMeta();
  renderHistory();
  renderFavorites();
})();

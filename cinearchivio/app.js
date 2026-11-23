(() => {
  "use strict";
  const SOURCE = "https://raw.githubusercontent.com/Christiangrilli/Archivio-Audiovisivo/main/03_%20CINEMA/ARCHIVIO_SCENE_FILM.md";
  const $ = (selector) => document.querySelector(selector);
  const state = { films: [], filtered: [], collection: loadCollection(), activeFilm: null };
  const grid = $("#film-grid");
  const detailDialog = $("#detail-dialog");
  const collectionDialog = $("#collection-dialog");

  function loadCollection() {
    try { return JSON.parse(localStorage.getItem("cinearchivio-collection") || "[]"); }
    catch { return []; }
  }
  function saveCollection() {
    localStorage.setItem("cinearchivio-collection", JSON.stringify(state.collection));
    updateCollectionUI();
  }
  function clean(value) {
    return (value || "").replace(/<[^>]*>/g, "").replace(/\*\*/g, "").replace(/\*/g, "").replace(/\s+/g, " ").trim();
  }
  function field(block, label) {
    const re = new RegExp("^[ \\t]*[-*]?[ \\t]*\\*\\*" + label.replace(/[.*+?^$\{\}()|[\]\\\\]/g, "\\$&") + ":\\*\\*[ \\t]*(.*)$", "im");
    const match = block.match(re);
    return match ? clean(match[1]) : "";
  }
  function statusFrom(block) {
    let match = block.match(/\\*\\*Stato:\\*\\*\\s*([^\\n]+)/i);
    if (!match) match = block.match(/^###\\s+Stato della scheda\\s*\\n+([^\\n]+)/im);
    if (!match) match = block.match(/^Stato della scheda\\s*:?\\s*\\n+([^\\n]+)/im);
    const raw = clean(match?.[1] || "");
    if (/pronta/i.test(raw)) return "PRONTA";
    if (/verificare/i.test(raw)) return "DA VERIFICARE";
    if (/completare/i.test(raw)) return "DA COMPLETARE";
    return raw.toUpperCase() || "NON INDICATO";
  }
  function parseFilms(markdown) {
    const matches = [...markdown.matchAll(/^##\s+(\d+)\.\s+(.+)$/gm)];
    return matches.map((match, index) => {
      const start = match.index;
      const end = matches[index + 1]?.index ?? markdown.length;
      const block = markdown.slice(start, end).trim();
      const heading = clean(match[2].replace(/\[↑.*?\]\([^)]*\)/g, ""));
      const yearMatch = heading.match(/\b(18|19|20)\d{2}\b/g);
      const year = yearMatch ? Number(yearMatch[yearMatch.length - 1]) : null;
      const director = year ? (heading.slice(0, heading.lastIndexOf(String(year))).match(/,\s*([^,()]+)$/)?.[1] || "") : "";
      const title = heading.replace(/^\*+/, "").replace(/\*+$/, "").replace(/\s*\([^()]*\)\s*$/, "").trim();
      const concept = field(block, "Concetto principale") || field(block, "Concetto") || "Concetto da individuare";
      const secondary = field(block, "Concetti secondari");
      const tags = (field(block, "Tag").match(/#[\p{L}\p{N}_-]+/gu) || []).map(tag => tag.slice(1).replace(/-/g, " "));
      const level = field(block, "Livello") || field(block, "Livello didattico");
      return { id: Number(match[1]), heading, title: title || heading, year, director: clean(director), concept, secondary, tags, level, status: statusFrom(block), block };
    }).filter(film => film.id);
  }
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  }
  function inlineMarkdown(text) {
    let value = escapeHtml(text);
    value = value.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
    value = value.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>").replace(/`([^`]+)`/g, "<code>$1</code>");
    return value;
  }
  function renderMarkdown(markdown) {
    const lines = markdown.split("\n");
    let html = "", list = null, paragraph = [];
    const flushParagraph = () => { if (paragraph.length) { html += "<p>" + inlineMarkdown(paragraph.join(" ")) + "</p>"; paragraph = []; } };
    const closeList = () => { if (list) { html += list === "ol" ? "</ol>" : "</ul>"; list = null; } };
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) { flushParagraph(); closeList(); continue; }
      if (/^---+$/.test(trimmed)) { flushParagraph(); closeList(); html += "<hr>"; continue; }
      const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
      if (heading) { flushParagraph(); closeList(); const level = Math.min(heading[1].length + 1, 4); html += "<h" + level + ">" + inlineMarkdown(heading[2]) + "</h" + level + ">"; continue; }
      const item = trimmed.match(/^[-*]\s+(.+)$/);
      if (item) { flushParagraph(); if (list !== "ul") { closeList(); html += "<ul>"; list = "ul"; } html += "<li>" + inlineMarkdown(item[1]) + "</li>"; continue; }
      const numbered = trimmed.match(/^\d+[.)]\s+(.+)$/);
      if (numbered) { flushParagraph(); if (list !== "ol") { closeList(); html += "<ol>"; list = "ol"; } html += "<li>" + inlineMarkdown(numbered[1]) + "</li>"; continue; }
      if (trimmed.startsWith(">")) { flushParagraph(); closeList(); html += "<blockquote>" + inlineMarkdown(trimmed.replace(/^>\s?/, "")) + "</blockquote>"; continue; }
      paragraph.push(trimmed);
    }
    flushParagraph(); closeList();
    return html;
  }
  function conceptsList() {
    const concepts = new Set();
    state.films.forEach(film => {
      if (film.concept && film.concept !== "Concetto da individuare") concepts.add(film.concept);
      film.tags.forEach(tag => concepts.add(tag));
    });
    return [...concepts].sort((a,b) => a.localeCompare(b, "it"));
  }
  function buildConceptFilter() {
    const select = $("#concept-filter");
    conceptsList().forEach(concept => {
      const option = document.createElement("option");
      option.value = concept; option.textContent = concept;
      select.append(option);
    });
    $("#concept-count").textContent = conceptsList().length;
  }
  function matchesConcept(film, concept) {
    if (!concept) return true;
    return film.concept.toLowerCase() === concept.toLowerCase() ||
      film.secondary.toLowerCase().includes(concept.toLowerCase()) ||
      film.tags.some(tag => tag.toLowerCase() === concept.toLowerCase());
  }
  function card(film) {
    const selected = state.collection.includes(film.id);
    const statusClass = film.status === "PRONTA" ? "ready" : film.status === "DA VERIFICARE" ? "verify" : "";
    return `<article class="film-card" data-film="${film.id}" tabindex="0" role="button" aria-label="Apri la scheda ${escapeHtml(film.title)}">
      <div class="card-top"><span class="card-number">SCENA N. ${String(film.id).padStart(2,"0")}</span><span class="card-year">${film.year || "—"}</span></div>
      <h3>${escapeHtml(film.title)}</h3><div class="card-director">${escapeHtml(film.director || "Autore non specificato")}</div>
      <div class="card-concept-label">CONCETTO PRINCIPALE</div><div class="card-concept">${escapeHtml(film.concept)}</div>
      <div class="card-bottom"><span class="card-status ${statusClass}">${escapeHtml(film.status)}</span><div class="card-tags">${film.tags.slice(0,2).map(tag=>`<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div></div>
      <button class="card-add ${selected ? "selected" : ""}" data-add="${film.id}" aria-label="${selected ? "Rimuovi dalla" : "Aggiungi alla"} raccolta" title="${selected ? "Rimuovi dalla raccolta" : "Aggiungi alla raccolta"}">${selected ? "✓" : "+"}</button>
    </article>`;
  }
  function applyFilters() {
    const query = $("#search-input").value.trim().toLocaleLowerCase("it");
    const concept = $("#concept-filter").value;
    const level = $("#level-filter").value;
    const status = $("#status-filter").value;
    const sort = $("#sort-select").value;
    state.filtered = state.films.filter(film => {
      const haystack = [film.heading,film.director,film.concept,film.secondary,film.tags.join(" "),film.block].join(" ").toLocaleLowerCase("it");
      return (!query || haystack.includes(query)) && matchesConcept(film, concept) &&
        (!level || film.level.toLowerCase().includes(level.toLowerCase())) &&
        (!status || film.status === status);
    });
    state.filtered.sort((a,b) => sort === "title" ? a.title.localeCompare(b.title,"it") : sort === "year" ? (a.year||9999)-(b.year||9999) : a.id-b.id);
    renderGrid();
  }
  function renderGrid() {
    $("#visible-count").textContent = state.filtered.length;
    $("#results-label").textContent = state.filtered.length + (state.filtered.length === 1 ? " SCENA TROVATA" : " SCENE TROVATE");
    grid.innerHTML = state.filtered.map(card).join("");
    $("#empty-state").hidden = state.filtered.length !== 0;
    grid.hidden = state.filtered.length === 0;
  }
  function updateCollectionUI() {
    $("#collection-count").textContent = state.collection.length;
    $("#lesson-summary").textContent = state.collection.length ? state.collection.length + (state.collection.length === 1 ? " scena selezionata" : " scene selezionate") : "Nessuna scena selezionata";
    renderGrid();
  }
  function toggleCollection(id) {
    state.collection = state.collection.includes(id) ? state.collection.filter(item => item !== id) : [...state.collection,id];
    saveCollection();
  }
  function openFilm(id) {
    const film = state.films.find(item => item.id === id);
    if (!film) return;
    state.activeFilm = film;
    const statusClass = film.status === "PRONTA" ? "ready" : "";
    $("#detail-content").innerHTML = `
      <div class="detail-kicker">SCHEDE DELLE SCENE / N. ${String(film.id).padStart(2,"0")}</div>
      <h2 class="detail-title">${escapeHtml(film.title)}</h2>
      <div class="detail-byline">${escapeHtml(film.director || "Regia non specificata")}${film.year ? " · " + film.year : ""}</div>
      <div class="detail-meta"><span class="meta-pill">${escapeHtml(film.concept)}</span>${film.level ? `<span class="meta-pill">${escapeHtml(film.level)}</span>` : ""}<span class="meta-pill">${escapeHtml(film.status)}</span></div>
      <div class="detail-actions"><button class="action-button" data-add="${film.id}">${state.collection.includes(film.id) ? "✓ NELLA RACCOLTA" : "+ AGGIUNGI ALLA LEZIONE"}</button><button class="action-button secondary" id="copy-title">COPIA RIFERIMENTO</button></div>
      <div class="detail-body">${renderMarkdown(film.block.replace(/^##\s+\d+\.\s+.+\n/,"").replace(/\[↑ Torna all'indice\]\([^)]*\)/g,""))}</div>`;
    detailDialog.showModal();
  }
  function openCollection() {
    const films = state.collection.map(id => state.films.find(film => film.id === id)).filter(Boolean);
    $("#collection-content").innerHTML = `
      <div class="detail-kicker">TAVOLO DI LAVORO / PROGETTAZIONE DIDATTICA</div>
      <h2 class="detail-title">La mia lezione</h2>
      <p class="detail-byline">Una selezione di scene da mettere in relazione durante la progettazione.</p>
      ${films.length ? `<div class="collection-list">${films.map(film=>`<div class="collection-item"><div><strong>${escapeHtml(film.title)}</strong><small> N. ${film.id} · ${escapeHtml(film.concept)} · ${film.year || "Anno n.d."}</small></div><button class="remove-item" data-remove="${film.id}">RIMUOVI</button></div>`).join("")}</div>` : '<div class="collection-empty">Non hai ancora aggiunto scene. Torna all’archivio e usa il simbolo + sulle schede.</div>'}
      <div class="collection-note">La selezione è salvata in questo browser. Puoi stamparla o salvarla in PDF per conservarla come promemoria di progettazione.</div>
      <div class="collection-actions"><button class="action-button" id="print-collection" ${films.length ? "" : "disabled"}>STAMPA / SALVA PDF</button><button class="action-button secondary" id="clear-collection" ${films.length ? "" : "disabled"}>SVUOTA RACCOLTA</button></div>`;
    collectionDialog.showModal();
  }
  async function init() {
    try {
      const response = await fetch(SOURCE, {cache:"no-store"});
      if (!response.ok) throw new Error("Risposta HTTP " + response.status);
      const markdown = await response.text();
      state.films = parseFilms(markdown);
      if (!state.films.length) throw new Error("Non sono state riconosciute schede numerate nell'archivio.");
      $("#total-count").textContent = state.films.length;
      $("#source-status").innerHTML = '<span class="status-dot"></span> Archivio sincronizzato';
      buildConceptFilter(); applyFilters(); updateCollectionUI();
    } catch (error) {
      $("#source-status").classList.add("error");
      $("#source-status").innerHTML = '<span class="status-dot"></span> Archivio non raggiungibile';
      grid.innerHTML = '<div class="loading-state"><p>Non riesco a leggere il documento originale di GitHub.</p><p>Controlla la connessione e riprova.</p><button class="action-button" id="retry-load">RIPROVA</button></div>';
      console.error("Cinearchivio:", error);
    }
  }
  ["search-input","concept-filter","level-filter","status-filter","sort-select"].forEach(id => $("#"+id).addEventListener(id === "search-input" ? "input" : "change", applyFilters));
  $("#reset-filters").addEventListener("click", () => { $("#search-input").value=""; $("#concept-filter").value=""; $("#level-filter").value=""; $("#status-filter").value=""; $("#sort-select").value="number"; applyFilters(); });
  grid.addEventListener("click", event => {
    const add = event.target.closest("[data-add]");
    if (add) { event.stopPropagation(); toggleCollection(Number(add.dataset.add)); if (state.activeFilm) openFilm(state.activeFilm.id); return; }
    const filmCard = event.target.closest("[data-film]");
    if (filmCard) openFilm(Number(filmCard.dataset.film));
  });
  grid.addEventListener("keydown", event => { if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-film]")) { event.preventDefault(); openFilm(Number(event.target.dataset.film)); } });
  $("#detail-content").addEventListener("click", event => {
    const add = event.target.closest("[data-add]");
    if (add) { toggleCollection(Number(add.dataset.add)); openFilm(Number(add.dataset.add)); }
    if (event.target.id === "copy-title" && state.activeFilm) navigator.clipboard?.writeText(state.activeFilm.heading.replace(/\*/g,"")).then(()=>event.target.textContent="COPIATO");
  });
  $("#open-collection").addEventListener("click", openCollection);
  $("#collection-content").addEventListener("click", event => {
    const remove = event.target.closest("[data-remove]");
    if (remove) { toggleCollection(Number(remove.dataset.remove)); openCollection(); }
    if (event.target.id === "clear-collection") { state.collection=[]; saveCollection(); openCollection(); }
    if (event.target.id === "print-collection") window.print();
  });
  document.addEventListener("click", event => {
    if (event.target.matches("[data-close-dialog]")) event.target.closest("dialog").close();
    if (event.target.id === "retry-load") init();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "/" && !["INPUT","TEXTAREA","SELECT"].includes(document.activeElement.tagName)) { event.preventDefault(); $("#search-input").focus(); }
  });
  updateCollectionUI();
  init();
})();
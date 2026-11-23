# CINEARCHIVIO

**Atlante didattico del cinema** — interfaccia web per consultare e utilizzare l'archivio SCENE FILM nella didattica delle Discipline audiovisive.

## Obiettivo

Cinearchivio trasforma il repertorio Markdown SCENE FILM in un archivio consultabile attraverso ricerca libera, filtri e schede di dettaglio. È progettato prioritariamente per il lavoro del docente: individuare una scena a partire da un concetto, verificare il livello e lo stato della scheda, consultare l'analisi e selezionare esempi per una lezione.

## Principio architetturale

I documenti Markdown nella cartella `03_ CINEMA/` restano la fonte editoriale originale. L'applicazione non duplica né modifica i contenuti: legge `ARCHIVIO_SCENE_FILM.md` dal branch principale della repository e ne interpreta le schede numerate.

Questo approccio mantiene separati:
- **contenuti e curatela scientifica:** archivio Markdown;
- **consultazione e strumenti di lavoro:** applicazione web;
- **versionamento e pubblicazione:** GitHub.

## Funzioni della prima versione

- ricerca full-text in titoli, registi, concetti, tag e contenuti delle schede;
- filtri per concetto, livello didattico e stato editoriale;
- ordinamento per numero, titolo e anno;
- scheda di dettaglio con il contenuto Markdown;
- raccolta locale di scene per preparare una lezione;
- stampa della raccolta e salvataggio in PDF dal browser;
- layout responsive per desktop, tablet e smartphone.

La raccolta è salvata nel browser del docente tramite `localStorage`: non è un account sincronizzato e non viene inviata a un server.

## Struttura

```text
cinearchivio/
├── index.html
├── styles.css
├── app.js
└── README.md
```

## Avvio e pubblicazione

L'app è statica e non richiede un backend o un processo di build. Per provarla in locale è sufficiente servirla con un server HTTP nella cartella della repository (ad esempio l'estensione Live Server di Visual Studio Code). L'apertura diretta come file locale può impedire il caricamento del Markdown remoto per le regole CORS del browser.

Per pubblicarla, configurare GitHub Pages scegliendo come sorgente il branch e la cartella `/(root)`, quindi rendere disponibile la directory `/cinearchivio` all'indirizzo del sito Pages. In alternativa si potrà impostare in seguito una pipeline di deploy dedicata.

## Fonte dati

`https://raw.githubusercontent.com/Christiangrilli/Archivio-Audiovisivo/main/03_%20CINEMA/ARCHIVIO_SCENE_FILM.md`

Il parser riconosce le schede che iniziano con un titolo Markdown del tipo `## 1. Titolo del film`. Le schede prive di questo formato non vengono interpretate come schede operative.

## Evoluzione prevista

1. Verifica e consolidamento del parser su tutte le schede.
2. Metadati strutturati e tassonomia controllata dei concetti.
3. Filtri per uso consigliato, tecniche, genere, autore e periodo.
4. Esportazione di una raccolta in un documento didattico.
5. Collegamento più stretto alla guida operativa e ai percorsi tematici.

## Nota sui diritti

L'app non incorpora né distribuisce copie dei film, fotogrammi o locandine. I riferimenti ai film sono testuali e i contenuti consultati sono quelli presenti nella repository. L'eventuale inserimento futuro di immagini o estratti dovrà rispettare i diritti dei rispettivi titolari e le condizioni d'uso.

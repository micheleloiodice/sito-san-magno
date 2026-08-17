# Spazio San Magno — sito e schede botaniche con QR code

Sito statico (nessun database, nessun server applicativo) del bene rurale di
contrada San Magno, con le **20 schede botaniche dell'orto selvatico
raggiungibili soltanto inquadrando il QR code** posto sulla targhetta davanti a
ciascuna pianta.

---

## 1. Com'è fatto il sito

| Percorso | Cosa contiene | Va pubblicato? |
|---|---|---|
| `index.html` | homepage: il luogo, il restauro, l'orto selvatico, attività, territorio, contatti | **sì** |
| `assets/orto.css` | stile delle schede botaniche | **sì** |
| `assets/orto.js` | sblocco e traduzione delle schede | **sì** |
| `orto/01…20-*.html` | le 20 schede botaniche, con i testi **cifrati** | **sì** |
| `robots.txt` | tiene le schede fuori dai motori di ricerca | **sì** |
| `video.webm` | video del restauro (modelli 3D prima/dopo) | **sì** |
| `qr/png/`, `qr/svg/` | i 20 QR code da stampare | no (uso interno) |
| `qr/etichette.html` | foglio A4 di etichette pronte da stampare | no (uso interno) |
| `tools/` | dati sorgente e generatore | no (uso interno) |
| `_riservato/` | **le chiavi di sblocco** | **mai** |
| `spazio-san-magno.html` | bozza originale da cui è nato il sito, conservata come riferimento | no |

Da caricare sul server, quindi, soltanto: `index.html`, `robots.txt`,
`assets/`, `orto/`, `video.webm` e le immagini che aggiungerai.

> `spazio-san-magno.html` non serve più: la homepage è `index.html`. Puoi
> lasciarlo dov'è come promemoria o cancellarlo (una copia resta comunque in
> `tools/originali-orto/`). Non caricarlo online: è un doppione della home e i
> suoi collegamenti alle specie porterebbero alla schermata bloccata.

---

## 2. Come funziona la protezione delle schede

1. I testi di ogni scheda (italiano, inglese, francese) non sono scritti nella
   pagina: sono **cifrati** dentro il blocco `<script id="dati">`. Chi apre il
   codice sorgente vede solo caratteri illeggibili.
2. La **chiave** di lettura non è da nessuna parte nel sito: sta solo dentro il
   QR code della targhetta, che rimanda a un indirizzo come

   ```
   https://www.spaziosanmagno.it/orto/09-biancospino.html#k=yhvST54Npgx8m7ZK1Od4cw
   ```

3. Chi arriva sulla pagina **senza** chiave vede una schermata che spiega, in
   tre lingue, che la scheda si apre inquadrando il QR sul posto.
4. La parte dopo il `#` non viene inviata al server: non finisce nei log del
   sito né nelle statistiche. Appena la scheda si apre, la chiave viene
   **rimossa dalla barra degli indirizzi** (resta valida per la sessione, così
   ricaricare la pagina non richiede un nuovo scan).
5. `robots.txt` e il tag `noindex` tengono le schede fuori da Google.
6. Dalla homepage **non esiste alcun collegamento** alle schede: l'elenco delle
   venti essenze è solo informativo.

**Che livello di riservatezza aspettarsi.** L'obiettivo è che le schede si
vivano lungo il percorso e non siano né navigabili dal sito né indicizzate: su
questo il sistema è solido, perché senza chiave i testi non sono ricostruibili.
Chi ha inquadrato un QR, però, ha in mano la chiave di *quella* pianta e in
teoria può passarla ad altri: è la natura di un sito statico, e non impedisce
l'uso previsto. Le chiavi sono indipendenti l'una dall'altra: conoscerne una non
apre le altre diciannove.

---

## 3. Stampare le targhette

Apri `qr/etichette.html` nel browser e stampa:

- **A4, scala 100%**, senza "adatta alla pagina" (il QR deve restare 41 mm);
- 3 fogli in tutto: 9 + 9 + 2 etichette, con linee tratteggiate di taglio;
- il riquadro con le istruzioni non viene stampato.

Ogni etichetta riporta numero, nome italiano, nome scientifico e l'invito a
inquadrare nelle tre lingue. Il **numero corrisponde a quello dell'elenco in
homepage**, così un visitatore ritrova la pianta nella sequenza del percorso.

Per targhe più grandi, incisioni o stampa tipografica usa i file vettoriali in
`qr/svg/`: non deformare le proporzioni e conserva il bordo bianco attorno al
codice (serve alla lettura).

**Prima di installare le targhette in campo, prova ogni QR stampato con la
fotocamera del telefono.** I codici sono già stati verificati con un
decodificatore automatico, ma la prova sulla stampa reale è l'unica che conta.

---

## 4. Rigenerare tutto

Serve Python (già installato) e la libreria `segno`:

```bash
py -m pip install segno opencv-python-headless
```

`segno` disegna i QR; `opencv-python-headless` è facoltativa ma consigliata:
se presente, il generatore **rilegge ogni QR prodotto** e, se un codice risulta
faticoso da decodificare, ne rigenera automaticamente la grafica finché non è
leggibile (nitido e sfocato come lo vedrebbe una fotocamera).

Poi, dalla cartella del sito:

```bash
py tools\genera.py
```

Ricostruisce le 20 schede cifrate, i QR, il foglio etichette, il CSV delle
chiavi e `robots.txt`.

### Le chiavi non cambiano

Le chiavi vengono generate **una volta sola** e poi rilette da
`_riservato/chiavi-qr.csv`: puoi rilanciare il generatore quante volte vuoi,
**i QR già stampati restano validi**. Conserva una copia di backup di quel file:
senza di esso le chiavi delle targhette in campo non sono recuperabili e le
etichette andrebbero rifatte.

---

## 5. Modificare i testi delle schede

I contenuti stanno in `tools/specie.json`, una voce per pianta, con le tre
lingue affiancate:

```json
{
  "slug": "09-biancospino",
  "num": "09",
  "icona": "<svg …>",
  "lang": {
    "it": {
      "nome": "Biancospino",
      "scientifico": "Crataegus monogyna Jacq.",
      "meta": [ {"lbl": "Famiglia", "val": "Rosaceae"} ],
      "sezioni": [ {"titolo": "Descrizione botanica", "p": ["…"]} ]
    },
    "en": { … }, "fr": { … }
  }
}
```

Modifica il testo, salva in **UTF-8**, rilancia `py tools\genera.py`: le schede
si aggiornano e i QR restano quelli di prima.

I nomi dialettali sono contrassegnati *(da verificare)*: quando li confermi,
togli quella dicitura dalle tre lingue (`da verificare` / `to verify` /
`à vérifier`).

### Aggiungere una pianta

1. Aggiungi una voce in `tools/specie.json` con `slug` nel formato
   `21-nome-pianta` e le tre lingue compilate.
2. Rilancia il generatore: crea scheda, chiave e QR nuovi.
3. Aggiungi la pianta all'elenco in `index.html` (sezione *Orto selvatico*) e
   ristampa il foglio etichette.

---

## 6. Cose ancora da completare

- **Fotografie delle piante**: le schede mostrano un'icona e la dicitura "foto
  in arrivo". Per inserire le foto: aggiungi le immagini al sito e sostituisci
  il blocco `.hero` in `assets/orto.css` / la funzione `vistaScheda` in
  `assets/orto.js` con un `<img>`.
- **Anteprima del video**: l'attributo `poster` è stato rimosso perché
  l'immagine non esiste. Quando avrai un fotogramma da usare come copertina,
  rimetti `poster="poster-restauro.jpg"` nel tag `<video>`: nel codice c'è un
  commento che lo ricorda.
- **Modulo di prenotazione**: il codice è pronto ma va attivato. Segui
  `modulo/LEGGIMI-modulo.md`: due account gratuiti (Resend e Cloudflare), poi
  si incolla l'indirizzo del Worker in `index.html` al posto di
  `DA-CONFIGURARE`. Finché non è attivo il modulo **non** finge di aver
  inviato: propone di scrivere a `info@spaziosanmagno.it` con il messaggio già
  compilato.
- **Sezioni messe in pausa**: il calendario mese per mese delle attività e
  l'elenco dei partner sono stati rimossi dalla homepage in attesa,
  rispettivamente, delle date definitive e della conferma di ciascuna realtà.
  Lo stile CSS di entrambi resta in `index.html`, marcato come non utilizzato,
  per poterli reinserire senza rifare la grafica. Le versioni complete sono
  recuperabili dalla cronologia git e da `tools/originali-orto/`.
- **Dati strutturati della posizione**: la homepage ha il segnaposto Maps con
  le coordinate `41.038645, 16.349511`, ma non i dati `schema.org` che
  aiuterebbero Google a mostrare il luogo nei risultati di ricerca.

---

## 7. Provare il sito in locale

Le schede funzionano anche aprendo i file col doppio clic, ma per una prova
fedele conviene un piccolo server locale:

```bash
py -m http.server 8765
```

Poi apri `http://localhost:8765/index.html`. Per aprire una scheda senza
scansionare nulla, usa `_riservato/indice-schede.html`: elenca le venti piante
con i link già sbloccati, comodo per rileggere e correggere i testi.

---

## 8. Come è pubblicato

Il sito è ospitato su **GitHub Pages**, gratuitamente, dal repository pubblico
`micheleloiodice/sito-san-magno` (ramo `main`, cartella radice). Il dominio
`www.spaziosanmagno.it` punta a Pages con un record CNAME verso
`micheleloiodice.github.io`.

Il repository contiene **solo** i file pubblici: `index.html`, `robots.txt`,
`assets/`, `orto/` e la documentazione. Le cartelle `_riservato/`, `qr/` e
`tools/` restano su questo computer — vedi il paragrafo 1 e il file
`.gitignore`. Essere un repository pubblico non è un problema: le schede sono
cifrate e la chiave non è mai stata caricata.

**Il video non è nel repository.** Pesa 37 MB e l'upload dal browser di GitHub
si fermava a 25 MB, quindi è allegato alla *release* con tag
**`mediaonpublish`**. Il tag `<video>` in `index.html` ha due sorgenti: prima
quella della release, poi il file `video.webm` locale, usata quando apri il
sito dalla cartella o senza rete.

L'indirizzo del video contiene il nome del tag, quindi **tag e pagina devono
combaciare**: se rifai o rinomini la release, aggiorna la riga `<source>` in
`index.html`. Il nome `mediaonpublish` è nato per un refuso — nel campo del tag
era finito anche il testo del pulsante *"Create new tag: … on publish"* — ma
funziona ed è invisibile ai visitatori, quindi si è preferito adeguare la
pagina invece di rifare il caricamento da 37 MB.

### Aggiornare il sito

La cartella su questo computer è la fonte, GitHub è la copia pubblicata:
modifica sempre qui, prova in locale, poi carica. Su GitHub, *Add file →
Upload files*, trascinando i file cambiati: avendo lo stesso nome sostituiscono
i precedenti. Dopo circa un minuto Pages ripubblica; se non vedi il
cambiamento, ricarica con `Ctrl+F5`.

Due avvertenze: **non cancellare il file `CNAME`** creato da GitHub, altrimenti
il dominio si scollega; e non modificare a mano i file in `orto/`, che sono
cifrati — si passa sempre da `tools/specie.json` e dal generatore.

Nota tecnica: la cronologia git locale e quella su GitHub sono separate, perché
i file sono stati caricati la prima volta dal browser. Per questo `git push`
verrebbe rifiutato: va prima riallineata la cronologia.

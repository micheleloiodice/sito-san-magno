/* ============================================================
   Spazio San Magno · Sblocco delle schede botaniche via QR code
   ------------------------------------------------------------
   Ogni scheda in /orto/ contiene i propri testi cifrati (blocco
   <script id="dati">, base64). La chiave di lettura NON e' nel
   sito: sta solo nel QR code stampato sulla targhetta davanti
   alla pianta, che rimanda a
       .../orto/NN-nome.html#k=CHIAVE
   Senza chiave valida la pagina mostra la schermata "bloccata"
   e i testi restano illeggibili anche nel codice sorgente.

   Cifratura: XOR con keystream SHA-256 in modo contatore
              (identica a tools/genera.py) + tag di integrita'.
   Nessuna dipendenza esterna, funziona anche offline e da file://
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- SHA-256 (implementazione autonoma) ---------------- */
  var K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  function rotr(x, n) { return ((x >>> n) | (x << (32 - n))) >>> 0; }

  function sha256(msg) {
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
             0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var l = msg.length;
    var total = ((l + 9 + 63) >> 6) << 6;      // multiplo di 64, spazio per 0x80 + lunghezza
    var m = new Uint8Array(total);
    m.set(msg, 0);
    m[l] = 0x80;
    var bitsHi = Math.floor(l / 536870912);     // (l*8) >> 32
    var bitsLo = (l * 8) >>> 0;
    m[total - 8] = (bitsHi >>> 24) & 255; m[total - 7] = (bitsHi >>> 16) & 255;
    m[total - 6] = (bitsHi >>> 8) & 255;  m[total - 5] = bitsHi & 255;
    m[total - 4] = (bitsLo >>> 24) & 255; m[total - 3] = (bitsLo >>> 16) & 255;
    m[total - 2] = (bitsLo >>> 8) & 255;  m[total - 1] = bitsLo & 255;

    var w = new Uint32Array(64), i, t;
    for (i = 0; i < total; i += 64) {
      for (t = 0; t < 16; t++) {
        w[t] = ((m[i + 4 * t] << 24) | (m[i + 4 * t + 1] << 16) |
                (m[i + 4 * t + 2] << 8) | m[i + 4 * t + 3]) >>> 0;
      }
      for (t = 16; t < 64; t++) {
        var x = w[t - 15], y = w[t - 2];
        var s0 = (rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3)) >>> 0;
        var s1 = (rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10)) >>> 0;
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (t = 0; t < 64; t++) {
        var S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
        var ch = ((e & f) ^ (~e & g)) >>> 0;
        var t1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
        var S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
        var mj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
        var t2 = (S0 + mj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0;
        d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0;
      H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0;
      H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    var out = new Uint8Array(32);
    for (i = 0; i < 8; i++) {
      out[4 * i] = (H[i] >>> 24) & 255; out[4 * i + 1] = (H[i] >>> 16) & 255;
      out[4 * i + 2] = (H[i] >>> 8) & 255; out[4 * i + 3] = H[i] & 255;
    }
    return out;
  }

  /* ---------------- utilita' binarie ---------------- */
  function concat(a, b) {
    var o = new Uint8Array(a.length + b.length);
    o.set(a, 0); o.set(b, a.length); return o;
  }
  function ascii(s) {
    var o = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) o[i] = s.charCodeAt(i) & 255;
    return o;
  }
  function b64bytes(s) {
    s = String(s).replace(/[\s\r\n]+/g, '');
    var raw = atob(s), o = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) o[i] = raw.charCodeAt(i);
    return o;
  }
  function b64urlBytes(s) {
    s = String(s).replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return b64bytes(s);
  }
  function utf8(bytes) {
    if (typeof TextDecoder !== 'undefined') return new TextDecoder('utf-8').decode(bytes);
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += '%' + (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16);
    return decodeURIComponent(s);
  }
  function hex(bytes, n) {
    var s = '';
    for (var i = 0; i < n; i++) s += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16);
    return s;
  }

  /* ---------------- decifratura ---------------- */
  function keystream(key, n) {
    var out = new Uint8Array(n), pos = 0, ctr = 0;
    var seed = concat(key, ascii('ctr')), buf = new Uint8Array(seed.length + 4), p = seed.length;
    buf.set(seed, 0);
    while (pos < n) {
      buf[p] = (ctr >>> 24) & 255; buf[p + 1] = (ctr >>> 16) & 255;
      buf[p + 2] = (ctr >>> 8) & 255; buf[p + 3] = ctr & 255;
      var blk = sha256(buf), take = Math.min(32, n - pos);
      out.set(blk.subarray(0, take), pos);
      pos += take; ctr++;
    }
    return out;
  }

  function decifra(key, payload) {
    var ct = b64bytes(payload.c), ks = keystream(key, ct.length);
    var pt = new Uint8Array(ct.length);
    for (var i = 0; i < ct.length; i++) pt[i] = ct[i] ^ ks[i];
    var tag = hex(sha256(concat(concat(key, ascii('tag')), pt)), 8);
    if (tag !== payload.t) return null;          // chiave errata o dati alterati
    return JSON.parse(utf8(pt));
  }

  /* ---------------- testi dell'interfaccia ---------------- */
  var T = {
    it: {
      bloccoTitolo: 'Scheda accessibile via QR code',
      bloccoP: 'Le schede botaniche dell’orto selvatico si aprono soltanto inquadrando il QR code posto sulla targhetta davanti a ciascuna pianta.',
      bloccoHint: '<strong>Come si fa:</strong> vieni a San Magno, cerca la targhetta davanti alla pianta e inquadra il codice con la fotocamera del telefono. La scheda si apre in italiano, inglese o francese.',
      torna: 'Torna al sito',
      errore: 'Il codice non è valido o è incompleto. Prova a inquadrare di nuovo il QR sulla targhetta.',
      foto: 'foto in arrivo',
      di: 'di',
      prossima: 'Ogni pianta dell’orto selvatico ha la sua targhetta e il suo QR code: continua il percorso e inquadra la prossima.',
      noscript: 'Per leggere la scheda occorre attivare JavaScript nel browser.'
    },
    en: {
      bloccoTitolo: 'Card unlocked by QR code',
      bloccoP: 'The botanical cards of the wild garden open only by scanning the QR code on the label in front of each plant.',
      bloccoHint: '<strong>How it works:</strong> visit San Magno, find the label in front of the plant and scan the code with your phone camera. The card opens in Italian, English or French.',
      torna: 'Back to the website',
      errore: 'This code is invalid or incomplete. Please scan the QR code on the label again.',
      foto: 'photo coming soon',
      di: 'of',
      prossima: 'Every plant in the wild garden has its own label and QR code: carry on along the path and scan the next one.',
      noscript: 'JavaScript must be enabled to read this card.'
    },
    fr: {
      bloccoTitolo: 'Fiche accessible par QR code',
      bloccoP: 'Les fiches botaniques du jardin sauvage s’ouvrent uniquement en scannant le QR code de l’étiquette posée devant chaque plante.',
      bloccoHint: '<strong>Comment faire :</strong> venez à San Magno, trouvez l’étiquette devant la plante et scannez le code avec l’appareil photo de votre téléphone. La fiche s’ouvre en italien, anglais ou français.',
      torna: 'Retour au site',
      errore: 'Ce code n’est pas valide ou il est incomplet. Veuillez scanner à nouveau le QR code de l’étiquette.',
      foto: 'photo à venir',
      di: 'sur',
      prossima: 'Chaque plante du jardin sauvage a son étiquette et son QR code : poursuivez le parcours et scannez la suivante.',
      noscript: 'JavaScript doit être activé pour lire cette fiche.'
    }
  };

  var LINGUE = ['it', 'en', 'fr'];
  var dati = null;          // dati decifrati, se sbloccati
  var stato = 'bloccata';   // 'bloccata' | 'errore' | 'aperta'
  var lingua = 'it';

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---------------- schermate ---------------- */
  function vistaBloccata(t) {
    return '<div class="lock">' +
      '<svg class="qricon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3">' +
      '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>' +
      '<rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v7h-7M17 21h.01"/></svg>' +
      '<h1>' + t.bloccoTitolo + '</h1>' +
      '<p>' + t.bloccoP + '</p>' +
      (stato === 'errore' ? '<p class="err">' + t.errore + '</p>' : '') +
      '<div class="hint">' + t.bloccoHint + '</div>' +
      '<a class="torna" href="../index.html">' + t.torna + '</a>' +
      '</div>';
  }

  function vistaScheda(t) {
    var d = dati.lang[lingua] || dati.lang.it;
    var meta = d.meta.map(function (m) {
      return '<div><span class="lbl">' + esc(m.lbl) + '</span>' + m.val + '</div>';
    }).join('');
    var sezioni = d.sezioni.map(function (s) {
      return '<h2>' + esc(s.titolo) + '</h2>' +
             s.p.map(function (p) { return '<p>' + p + '</p>'; }).join('');
    }).join('');
    return '<div class="hero">' +
      '<span class="num">' + esc(dati.num) + '<span class="tot">/' + esc(dati.tot) + '</span></span>' +
      dati.icona +
      '<span class="ph">' + t.foto + '</span></div>' +
      '<div class="body">' +
      '<p class="scan">' + esc(d.scan) + '</p>' +
      '<h1>' + esc(d.nome) + '</h1>' +
      '<p class="sci">' + esc(d.scientifico) + '</p>' +
      '<div class="meta">' + meta + '</div>' +
      sezioni +
      '<div class="chiudi">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">' +
      '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>' +
      '<rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v7h-7M17 21h.01"/></svg>' +
      '<span>' + t.prossima + '</span></div>' +
      '</div>';
  }

  function disegna() {
    var t = T[lingua] || T.it;
    var app = document.getElementById('app');
    app.innerHTML = (stato === 'aperta') ? vistaScheda(t) : vistaBloccata(t);
    document.documentElement.lang = lingua;
    document.title = (stato === 'aperta')
      ? (dati.lang[lingua] || dati.lang.it).nome + ' · Spazio San Magno'
      : t.bloccoTitolo + ' · Spazio San Magno';
    var bs = document.querySelectorAll('.switch button');
    for (var i = 0; i < bs.length; i++) {
      bs[i].className = (bs[i].getAttribute('data-l') === lingua) ? 'on' : '';
    }
  }

  window.setLang = function (c) {
    if (LINGUE.indexOf(c) < 0) return;
    lingua = c;
    try { localStorage.setItem('ssm-lingua', c); } catch (e) { }
    disegna();
  };

  /* ---------------- avvio ---------------- */
  function chiaveDaUrl() {
    var h = location.hash.replace(/^#/, '');
    var m = /(?:^|[&;])k=([A-Za-z0-9\-_]+)/.exec(h);
    if (m) return m[1];
    if (/^[A-Za-z0-9\-_]{20,}$/.test(h)) return h;            // #CHIAVE senza prefisso
    m = /[?&]k=([A-Za-z0-9\-_]+)/.exec(location.search);
    return m ? m[1] : null;
  }

  function avvia() {
    var nav = (navigator.language || 'it').slice(0, 2).toLowerCase();
    var salvata = null;
    try { salvata = localStorage.getItem('ssm-lingua'); } catch (e) { }
    lingua = (LINGUE.indexOf(salvata) >= 0) ? salvata
           : (LINGUE.indexOf(nav) >= 0 ? nav : 'it');

    var el = document.getElementById('dati');
    var payload = null;
    try { payload = JSON.parse(el.textContent || el.innerHTML); } catch (e) { }

    var slug = (location.pathname.split('/').pop() || 'scheda');
    var kb64 = chiaveDaUrl();
    var daUrl = !!kb64;
    if (!kb64) { try { kb64 = sessionStorage.getItem('ssm-k-' + slug); } catch (e) { } }

    if (kb64 && payload) {
      var key = null;
      try { key = b64urlBytes(kb64); } catch (e) { }
      var d = (key && key.length >= 8) ? decifra(key, payload) : null;
      if (d) {
        dati = d; stato = 'aperta';
        // la chiave resta nella sessione: ricaricare la pagina non richiede un nuovo scan,
        // e nel frattempo sparisce dalla barra degli indirizzi e dalla cronologia.
        if (daUrl) {
          try {
            sessionStorage.setItem('ssm-k-' + slug, kb64);
            history.replaceState(null, '', location.pathname);
          } catch (e) { }
        }
      } else {
        stato = 'errore';
        try { sessionStorage.removeItem('ssm-k-' + slug); } catch (e) { }
      }
    }
    disegna();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', avvia);
  } else { avvia(); }

  // Se la chiave arriva mentre la pagina e' gia' aperta (il visitatore inquadra
  // il QR restando sulla scheda bloccata) il browser cambia solo il frammento
  // senza ricaricare: rieseguiamo lo sblocco a mano.
  window.addEventListener('hashchange', function () {
    if (stato !== 'aperta' && chiaveDaUrl()) avvia();
  });
})();

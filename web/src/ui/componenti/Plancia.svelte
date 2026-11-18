<script lang="ts">
  // Plancia 3x3: righe A (parola), B (imitazione) e partita; colonne Registra, Al contrario, Originale.
  // Ogni pad resta sempre nello stesso posto; la guida evidenzia il prossimo da premere.
  import { gioco, MAX_RECORD_MS, SVELA_MS } from "../gioco.svelte";
  import { guida, originaleASvela, type Pad as IdPad } from "../guida";
  import { HOLD_TO_PLAY_MS } from "../holdButton";
  import type { PlayMode, SlotId } from "../sessione";
  import { sessione, store } from "../state.svelte";
  import { riempi, secondi, t } from "../testi";
  import ConfermaInline from "./ConfermaInline.svelte";
  import Pad, { type StatoPad } from "./Pad.svelte";

  const s = $derived(sessione.stato);
  const r = $derived(gioco.registrazione);
  const prossimi = $derived(r || gioco.confermaRifaiA ? [] : guida(s, gioco.ascoltiA).prossimi);
  const svela = $derived(originaleASvela(s));

  function suona(id: SlotId, mode: PlayMode): boolean {
    return s.playing?.slot === id && s.playing.mode === mode;
  }

  /** Stato di un pad: spento se non si puo' usare, attivo se suona o e' scelto, prossimo se lo indica la guida. */
  function stato(id: IdPad, usabile: boolean, attivo = false): StatoPad {
    if (!usabile) return "spento";
    if (attivo) return "attivo";
    return prossimi.includes(id) ? "prossimo" : "pronto";
  }

  function registra(id: SlotId) {
    const mia = r?.slot === id ? r : null;
    const occupato = (r !== null && !mia) || (mia?.avvio ?? false) || (mia?.elaborazione ?? false);
    const usabile = !s.revealed && !occupato && (id === "A" || s.slots.A.original !== null);
    const haAudio = s.slots[id].original !== null;
    let etichetta: string = haAudio ? t.rifai : id === "A" ? t.registra : t.imita;
    let sotto = haAudio ? secondi(s.slots[id].duration) : "";
    if (mia?.avvio) sotto = t.attendo;
    else if (mia?.elaborazione) sotto = t.elaboro;
    else if (mia) {
      etichetta = t.stop;
      sotto = riempi(t.timer, { trascorso: secondi(mia.trascorso / 1000), massimo: secondi(MAX_RECORD_MS / 1000) });
    }
    return {
      stato: mia && !mia.avvio && !mia.elaborazione ? ("registra" as const) : stato(id === "A" ? "registraA" : "registraB", usabile),
      etichetta,
      sotto,
      registrando: mia !== null,
      restante: mia && !mia.avvio && !mia.elaborazione ? Math.max(0, 1 - mia.trascorso / MAX_RECORD_MS) : undefined,
    };
  }

  const regA = $derived(registra("A"));
  const regB = $derived(registra("B"));
  const libero = $derived(r === null);
  const A = $derived(s.slots.A);
  const B = $derived(s.slots.B);
  const statoOriginaleA = $derived.by((): StatoPad => {
    if (!A.original || !libero) return "spento";
    if (suona("A", "original")) return "attivo";
    if (svela) return "sigillato";
    return prossimi.includes("originaleA") ? "prossimo" : "pronto";
  });
</script>

<div class="plancia-box">
  <div class="intestazioni" aria-hidden="true">
    <span>{t.colRegistra}</span><span>{t.colContrario}</span><span>{t.colOriginale}</span>
  </div>

  <div class="plancia" role="group" aria-label={t.titoloApp}>
    <!-- Riga A: la parola -->
    <div class="riga giocatore-a" id="slot-A" data-state={A.status} role="group" aria-label={t.rigaA}>
      <Pad
        azione="record-a"
        stato={regA.stato}
        icona={regA.registrando ? "stop" : "microfono"}
        etichetta={regA.etichetta}
        sotto={regA.sotto}
        lettera="A"
        ariaLabel={t.ariaRegistraA}
        ariaPressed={regA.registrando}
        restante={regA.restante}
        onPremi={() => gioco.premiRegistra("A")}
      />
      <Pad
        azione="play-a-reversed"
        stato={stato("contrarioA", A.original !== null && libero, suona("A", "reversed"))}
        icona={suona("A", "reversed") ? "stop" : "contrario"}
        etichetta={t.contrario}
        sotto={A.original ? secondi(A.duration) : ""}
        lettera="A"
        badge={gioco.ascoltiA > 0 ? riempi(t.ascolti, { n: gioco.ascoltiA }) : ""}
        ariaLabel={t.ariaContrarioA}
        ariaPressed={suona("A", "reversed")}
        onPremi={() => gioco.premiAscolta("A", "reversed")}
      />
      <div class="contenitore-trattieni">
        <p class="suggerimento" class:visibile={gioco.suggerimento} data-role="hold-hint" aria-live="polite">
          {gioco.suggerimento ? t.tieniPremuto : ""}
        </p>
        <Pad
          azione="play-a-original"
          stato={statoOriginaleA}
          evidenzia={statoOriginaleA === "sigillato" && prossimi.includes("originaleA")}
          icona={suona("A", "original") ? "stop" : "play"}
          etichetta={svela ? t.svela : t.originale}
          sotto={s.revealed || suona("A", "original") ? (A.original ? secondi(A.duration) : "") : t.tieniPremuto}
          lettera="A"
          ariaLabel={svela ? t.ariaSvela : t.ariaOriginaleA}
          ariaPressed={suona("A", "original")}
          aiuto={s.revealed ? undefined : svela ? t.svelaAiuto : t.originaleAiuto}
          hold={{
            ms: svela ? SVELA_MS : HOLD_TO_PLAY_MS,
            onConfirm: () => gioco.premiOriginaleA(),
            onCancel: ({ reason }) => gioco.pressioneAnnullata(reason),
            bypass: () => {
              const st = store.getState();
              return st.revealed || (st.playing?.slot === "A" && st.playing.mode === "original");
            },
          }}
        />
      </div>
    </div>

    <!-- Riga B: l'imitazione -->
    <div class="riga giocatore-b" id="slot-B" data-state={B.status} role="group" aria-label={t.rigaB}>
      <Pad
        azione="record-b"
        stato={regB.stato}
        icona={regB.registrando ? "stop" : "microfono"}
        etichetta={regB.etichetta}
        sotto={regB.sotto}
        lettera="B"
        ariaLabel={t.ariaRegistraB}
        ariaPressed={regB.registrando}
        restante={regB.restante}
        onPremi={() => gioco.premiRegistra("B")}
      />
      <Pad
        azione="play-b-reversed"
        stato={stato("contrarioB", B.original !== null && libero, suona("B", "reversed"))}
        icona={suona("B", "reversed") ? "stop" : "contrario"}
        etichetta={t.contrario}
        sotto={B.original ? secondi(B.duration) : ""}
        lettera="B"
        ariaLabel={t.ariaContrarioB}
        ariaPressed={suona("B", "reversed")}
        onPremi={() => gioco.premiAscolta("B", "reversed")}
      />
      <Pad
        azione="play-b-original"
        stato={stato("originaleB", B.original !== null && libero, suona("B", "original"))}
        icona={suona("B", "original") ? "stop" : "play"}
        etichetta={t.originale}
        sotto={B.original ? secondi(B.duration) : ""}
        lettera="B"
        ariaLabel={t.ariaOriginaleB}
        ariaPressed={suona("B", "original")}
        onPremi={() => gioco.premiAscolta("B", "original")}
      />
    </div>

    <!-- Riga partita: attiva dopo Svela -->
    <div class="riga" id="score" role="group" aria-label={t.punteggio}>
      <div class="presa">
        <Pad
          azione="guessed"
          stato={stato("presa", s.revealed && libero, s.verdict === "guessed")}
          icona="giusto"
          etichetta={t.presa}
          ariaLabel={t.ariaPresa}
          ariaPressed={s.verdict === "guessed"}
          onPremi={() => store.judge("guessed")}
        />
      </div>
      <div class="mancata">
        <Pad
          azione="missed"
          stato={stato("mancata", s.revealed && libero, s.verdict === "missed")}
          icona="sbagliato"
          etichetta={t.mancata}
          ariaLabel={t.ariaMancata}
          ariaPressed={s.verdict === "missed"}
          onPremi={() => store.judge("missed")}
        />
      </div>
      <div class="giocatore-a">
        <Pad
          azione="next-round"
          stato={stato("nuovoRound", s.revealed && libero)}
          icona="avanti"
          etichetta={riempi(t.prossimoRound, { n: s.round + 1 })}
          ariaLabel={t.ariaNuovoRound}
          onPremi={() => gioco.nuovoRound()}
        />
      </div>
    </div>

    <ConfermaInline
      aperto={gioco.confermaRifaiA}
      sovrapposta
      ruolo="rerecord-confirm"
      domanda={t.rifaiADomanda}
      etichettaSi={t.rifaiAConferma}
      etichettaNo={t.annullaBreve}
      azioneSi="confirm-rerecord"
      azioneNo="cancel-rerecord"
      onSi={() => gioco.confermaRifaiParola()}
      onNo={() => gioco.annullaRifaiParola()}
      ritorno={() => document.querySelector<HTMLElement>("[data-action=record-a]")}
    />
  </div>
</div>

<style>
  .plancia-box {
    flex: none;
    display: grid;
    gap: 4px;
  }
  .intestazioni {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spazio-2);
    font: 600 0.6875rem/1.2 ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    text-align: center;
    color: var(--colore-su-superficie-variante);
  }
  /* Pad quasi quadrati; su schermi bassi si accorciano per lasciare spazio al display */
  .plancia {
    position: relative;
    display: grid;
    gap: var(--spazio-2);
    --alto-pad: clamp(84px, min(calc((100cqw - 16px) / 3 * 1.05), calc((100cqh - 190px) / 3)), 140px);
  }
  .riga {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spazio-2);
    height: var(--alto-pad);
  }
  .riga > :global(*) {
    min-width: 0;
  }
  .presa {
    --accento: #2e8b4f;
    --su-accento: #ffffff;
  }
  .mancata {
    --accento: var(--colore-errore);
    --su-accento: var(--colore-su-errore);
  }
  .contenitore-trattieni {
    height: 100%;
  }
  .contenitore-trattieni :global(.suggerimento) {
    left: auto;
    right: 0;
    transform: translate(0, 4px);
  }
  .contenitore-trattieni :global(.suggerimento.visibile) {
    transform: translate(0, 0);
  }
</style>

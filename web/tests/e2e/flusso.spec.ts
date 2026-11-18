// One smoke test of the whole round on the real app (fake mic): A tries, passes to B,
// B loops (listen, imitate, retry), gives the phone back to A, then reveals and starts round 2.
import { test, expect } from "@playwright/test";
import { act, main, openApp, press, record, spyCount, spySince } from "./helpers";

test("round completo con prove ripetute e ritorno ad A", async ({ page }) => {
  test.setTimeout(90_000);
  await openApp(page);

  // A: can't pass without a word; records, listens, re-records.
  await expect(act(page, "pass-to-b")).toBeDisabled();
  await record(page, "A");
  let n = await spyCount(page);
  await act(page, "play-a-original").click();
  await expect.poll(() => spySince(page, n)).toEqual([{ slot: "A", mode: "original" }]);
  await record(page, "A");
  await act(page, "pass-to-b").click();
  await expect(main(page)).toHaveAttribute("data-fase", "passaAB");
  await act(page, "start-b").click();
  await expect(main(page)).toHaveAttribute("data-fase", "provaB");

  // B: listens to A reversed, imitates (auto-play of B reversed), listens again, retries.
  n = await spyCount(page);
  await act(page, "play-a-reversed").click();
  await record(page, "B");
  await expect.poll(() => spySince(page, n)).toEqual([
    { slot: "A", mode: "reversed" },
    { slot: "B", mode: "reversed" },
  ]);
  await act(page, "play-a-reversed").click();
  await record(page, "B");
  await expect(act(page, "play-b-reversed")).toBeEnabled();

  // B gives the phone back to A (confirm: B's tries are dropped), A re-records and passes again.
  await act(page, "back-to-a").click();
  await act(page, "confirm-back-to-a").click();
  await expect(main(page)).toHaveAttribute("data-fase", "passaBA");
  await act(page, "start-a").click();
  await expect(act(page, "play-a-original")).toBeEnabled();
  await record(page, "A");
  await act(page, "pass-to-b").click();
  await act(page, "start-b").click();
  await expect(act(page, "play-b-reversed")).toBeDisabled();
  await record(page, "B");

  // Reveal needs a long press: a short tap does nothing.
  await press(page, act(page, "reveal"), 100);
  await expect(main(page)).toHaveAttribute("data-fase", "provaB");
  n = await spyCount(page);
  await press(page, act(page, "reveal"), 900);
  await expect(main(page)).toHaveAttribute("data-fase", "esito");
  await expect.poll(() => spySince(page, n)).toContainEqual({ slot: "A", mode: "original" });

  // Verdict and next round.
  await act(page, "guessed").click();
  await act(page, "next-round").click();
  await expect(main(page)).toHaveAttribute("data-fase", "provaA");
  await expect(page.locator("[data-role=round]")).toHaveText("Round 2");
  await expect(act(page, "play-a-original")).toBeDisabled();
});

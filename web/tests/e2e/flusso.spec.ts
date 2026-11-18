// One smoke test of a whole round on the pad board (fake mic): A records and checks the word,
// B loops (listen, imitate, retry), A re-records (B's try is dropped), B reveals, round 2 starts.
import { test, expect } from "@playwright/test";
import { act, openApp, press, record, spyCount, spySince } from "./helpers";

test("round completo sulla plancia con prove ripetute", async ({ page }) => {
  test.setTimeout(90_000);
  await openApp(page);
  const pad = (name: string) => act(page, name);

  // A records; the next pad (A reversed) is highlighted; A checks the word with a short hold.
  await expect(pad("record-a")).toHaveAttribute("data-stato", "prossimo");
  await expect(pad("record-b")).toBeDisabled();
  await record(page, "A");
  await expect(pad("play-a-reversed")).toHaveAttribute("data-stato", "prossimo");
  let n = await spyCount(page);
  await press(page, pad("play-a-original"), 400);
  await expect.poll(() => spySince(page, n)).toEqual([{ slot: "A", mode: "original" }]);
  await expect(page.locator("#app")).toHaveAttribute("data-revealed", "false");

  // B listens to A reversed, imitates (B reversed plays by itself), listens again and retries.
  n = await spyCount(page);
  await pad("play-a-reversed").click();
  await record(page, "B");
  await expect.poll(() => spySince(page, n)).toEqual([
    { slot: "A", mode: "reversed" },
    { slot: "B", mode: "reversed" },
  ]);
  await pad("play-a-reversed").click();
  await record(page, "B");
  await expect(pad("play-a-original")).toHaveAttribute("data-stato", "sigillato");

  // A re-records within the round: confirm, B's imitation is dropped.
  await pad("record-a").click();
  await pad("confirm-rerecord").click();
  await expect(page.locator("#slot-A")).toHaveAttribute("data-state", "recording");
  await page.waitForTimeout(1500);
  await pad("record-a").click();
  await expect(page.locator("#slot-B")).toHaveAttribute("data-state", "empty", { timeout: 10_000 });
  await pad("play-a-reversed").click();
  await record(page, "B");

  // Svela needs a long press: a short one does not reveal.
  await press(page, pad("play-a-original"), 100);
  await expect(page.locator("#app")).toHaveAttribute("data-revealed", "false");
  n = await spyCount(page);
  await press(page, pad("play-a-original"), 900);
  await expect(page.locator("#app")).toHaveAttribute("data-revealed", "true");
  await expect.poll(() => spySince(page, n)).toContainEqual({ slot: "A", mode: "original" });

  // Verdict and next round.
  await pad("guessed").click();
  await expect(pad("guessed")).toHaveAttribute("aria-pressed", "true");
  await pad("next-round").click();
  await expect(page.locator("[data-role=round]")).toHaveText("Round 2");
  await expect(page.locator("#slot-A")).toHaveAttribute("data-state", "empty");
  await expect(pad("guessed")).toBeDisabled();
});

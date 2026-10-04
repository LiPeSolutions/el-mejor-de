import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAutosave } from "./autosave";

/** An autosave whose requests stay open until the test answers them. */
function setup() {
  const requests: { value: string; done: () => void; fail: (cause: unknown) => void }[] = [];
  const statuses: string[] = [];
  const saver = createAutosave<string>(
    (value) => new Promise<void>((done, fail) => requests.push({ value, done, fail })),
    (status) => statuses.push(status.state),
  );
  return { saver, requests, statuses, sent: () => requests.map((request) => request.value) };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("autosave", () => {
  it("waits until the changes rest for 600 ms, and sends the last one", async () => {
    const { saver, sent } = setup();
    saver.change("a");
    await vi.advanceTimersByTimeAsync(300);
    saver.change("b");
    await vi.advanceTimersByTimeAsync(599);
    expect(sent()).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(sent()).toEqual(["b"]);
  });

  it("never sends two at a time, and what changed meanwhile goes after", async () => {
    const { saver, requests, sent } = setup();
    saver.change("a");
    await vi.advanceTimersByTimeAsync(600);
    saver.change("b");
    saver.change("c");
    await vi.advanceTimersByTimeAsync(600);
    // "a" hasn't answered yet: nothing else goes.
    expect(sent()).toEqual(["a"]);
    requests[0]!.done();
    await vi.advanceTimersByTimeAsync(0);
    expect(sent()).toEqual(["a", "c"]);
    expect(saver.pending()).toBe(true);
    requests[1]!.done();
    await vi.advanceTimersByTimeAsync(0);
    expect(saver.pending()).toBe(false);
  });

  it("goes from saving to saved, and back to rest 2 s later", async () => {
    const { saver, requests, statuses } = setup();
    saver.change("a");
    expect(statuses).toEqual(["saving"]);
    await vi.advanceTimersByTimeAsync(600);
    requests[0]!.done();
    await vi.advanceTimersByTimeAsync(0);
    expect(statuses).toEqual(["saving", "saved"]);
    await vi.advanceTimersByTimeAsync(1999);
    expect(statuses).toEqual(["saving", "saved"]);
    await vi.advanceTimersByTimeAsync(1);
    expect(statuses).toEqual(["saving", "saved", "idle"]);
  });

  it("keeps a failed change and sends it again when asked", async () => {
    const { saver, requests, statuses, sent } = setup();
    saver.change("a");
    await vi.advanceTimersByTimeAsync(600);
    requests[0]!.fail(new TypeError("offline"));
    await vi.advanceTimersByTimeAsync(0);
    expect(statuses.at(-1)).toBe("failed");
    expect(saver.failed()).toBe(true);
    expect(saver.pending()).toBe(true);
    const flushed = saver.flush();
    expect(sent()).toEqual(["a", "a"]);
    requests[1]!.done();
    await expect(flushed).resolves.toBe(true);
    expect(statuses.at(-1)).toBe("saved");
  });

  it("sends right away when flushed, and says whether it was saved", async () => {
    const { saver, requests, sent } = setup();
    saver.change("a");
    const flushed = saver.flush();
    expect(sent()).toEqual(["a"]);
    requests[0]!.fail(new TypeError("offline"));
    await expect(flushed).resolves.toBe(false);
    // Nothing new to send, but it isn't saved.
    const again = saver.flush();
    requests[1]!.done();
    await expect(again).resolves.toBe(true);
    await expect(saver.flush()).resolves.toBe(true);
  });

  it("a newer change wins over a failed one", async () => {
    const { saver, requests, sent } = setup();
    saver.change("a");
    await vi.advanceTimersByTimeAsync(600);
    saver.change("b");
    requests[0]!.fail(new TypeError("offline"));
    await vi.advanceTimersByTimeAsync(600);
    expect(sent()).toEqual(["a", "b"]);
  });
});

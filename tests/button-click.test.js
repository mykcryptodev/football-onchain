import { spawnSync } from "node:child_process";

import { expect, test } from "bun:test";

// Exercise the actual component's click callback with hooks isolated in a child
// process; no React/SDK mock can leak into the rest of the suite.
for (const feedback of ["pending", "resolved", "rejected"]) {
  test(`Button dispatches synchronously exactly once with ${feedback} haptics`, () => {
    const child = spawnSync(
      process.execPath,
      [
        "--eval",
        `
      import { mock } from "bun:test";
      const React = await import("react");
      mock.module("react", () => ({ ...React,
        useCallback: callback => callback, useMemo: factory => factory(),
      }));
      let feedbackCalls = 0;
      mock.module("@/hooks/useHaptics", () => ({ useHaptics: () => ({
        impactOccurred: () => {
          feedbackCalls++;
          return ${JSON.stringify(feedback)} === "pending" ? new Promise(() => {})
            : ${JSON.stringify(feedback)} === "rejected" ? Promise.reject(new Error("no haptics"))
            : Promise.resolve();
        },
      }) }));
      mock.module("@/lib/utils", () => ({ cn: (...values) => values.filter(Boolean).join(" ") }));
      const { Button } = await import("./src/components/ui/button");
      let clicks = 0;
      const event = { currentTarget: { id: "submit" }, defaultPrevented: false,
        preventDefault() { this.defaultPrevented = true; } };
      const element = Button({ onClick: e => {
        if (e !== event || e.currentTarget.id !== "submit") throw new Error("Lost event");
        clicks++; e.preventDefault();
      }});
      element.props.onClick(event);
      const synchronousClicks = clicks;
      await new Promise(resolve => setTimeout(resolve, 0));
      console.log(JSON.stringify({ synchronousClicks, clicks, feedbackCalls, prevented: event.defaultPrevented }));
    `,
      ],
      { encoding: "utf8", cwd: process.cwd() },
    );
    expect(child.status).toBe(0);
    expect(child.stderr).toBe("");
    expect(JSON.parse(child.stdout)).toEqual({
      synchronousClicks: 1,
      clicks: 1,
      feedbackCalls: 1,
      prevented: true,
    });
  });
}

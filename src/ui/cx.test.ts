import { expect, test } from "vite-plus/test";

import { cx } from "./cx.ts";

test("joins truthy class names", () => {
  expect(cx("a", false, "b", null, undefined)).toBe("a b");
});

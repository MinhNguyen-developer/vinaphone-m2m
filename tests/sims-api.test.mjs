import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

// Exercise the real API module, replacing only its HTTP boundary.
function loadSimsApi(get) {
  const source = readFileSync(
    new URL("../src/api/sims.api.ts", import.meta.url),
    "utf8",
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  });
  const exports = {};
  new Function("require", "exports", outputText)((name) => {
    assert.equal(name, "./client");
    return { apiClient: { get } };
  }, exports);
  return exports.simsApi;
}

test("loads every SIM page instead of one unbounded response", async () => {
  const calls = [];
  const firstPage = Array.from({ length: 500 }, (_, id) => ({
    id: `sim-${id}`,
  }));
  const api = loadSimsApi(async (url, config) => {
    calls.push({ url, params: config?.params });
    const page = config?.params.page ?? 1;
    return {
      data: {
        data: page === 1 ? firstPage : [{ id: "sim-500" }],
        total: 501,
        page,
        pageSize: 500,
      },
    };
  });
  const result = await api.getAll();
  assert.equal(result.length, 501);
  assert.deepEqual(result.at(-1), { id: "sim-500" });
  assert.deepEqual(calls, [
    { url: "/sims/all", params: { page: 1, pageSize: 500 } },
    { url: "/sims/all", params: { page: 2, pageSize: 500 } },
  ]);
});

test("a failed page rejects instead of supplying an incomplete picker list", async () => {
  const api = loadSimsApi(async (_url, config) => {
    if (config?.params.page === 2) throw new Error("HTTP failure");
    return {
      data: { data: [{ id: "sim-1" }], total: 2, page: 1, pageSize: 500 },
    };
  });
  await assert.rejects(api.getAll(), /HTTP failure/);
});

test("supports the legacy array response during backend rollout", async () => {
  const api = loadSimsApi(async () => ({ data: [{ id: "legacy-sim" }] }));
  assert.deepEqual(await api.getAll(), [{ id: "legacy-sim" }]);
});

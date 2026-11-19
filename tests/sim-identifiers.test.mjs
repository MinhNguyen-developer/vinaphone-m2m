import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveSimIdentifiers } from "../src/utils/simIdentifiers.ts";

const sims = [
  {
    id: "sim-1",
    phoneNumber: "84912345678",
    internalImsi: "1234567890",
    imsi: "452021234567890",
  },
  {
    id: "sim-2",
    phoneNumber: "84987654321",
    internalImsi: null,
    imsi: "452029876543210",
  },
];

test("manual and CSV identifiers resolve phones and internal IMSIs without duplicate SIMs", () => {
  assert.deepEqual(
    resolveSimIdentifiers(
      " 84912345678\n1234567890,9876543210;84987654321\r\n84912345678 ",
      sims,
    ),
    { simIds: ["sim-1", "sim-2"], notFound: [] },
  );
});

test("reports only unknown identifiers and preserves exact matching and leading zeroes", () => {
  assert.deepEqual(
    resolveSimIdentifiers(
      "0001234567\tunknown\nunknown;12345;452021234567890",
      [
        ...sims,
        {
          id: "sim-3",
          phoneNumber: "84000123456",
          internalImsi: "0001234567",
          imsi: null,
        },
      ],
    ),
    { simIds: ["sim-3"], notFound: ["unknown", "12345", "452021234567890"] },
  );
});

test("empty input does not select any SIM", () => {
  assert.deepEqual(resolveSimIdentifiers(" \n,;\r\t", sims), {
    simIds: [],
    notFound: [],
  });
});

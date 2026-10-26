// Run: npm test
import assert from "node:assert/strict";
import test from "node:test";
import { formatPaise, parseRupees } from "./money.ts";

test("parseRupees", () => {
  assert.equal(parseRupees("250"), 25000);
  assert.equal(parseRupees("₹1,250.50"), 125050);
  assert.equal(parseRupees("0.1"), 10);
  assert.equal(parseRupees("19.99"), 1999);
  for (const bad of ["", "0", "-5", "1.234", "abc", "12345678", "1e3"]) assert.equal(parseRupees(bad), null, bad);
});

test("formatPaise", () => {
  assert.equal(formatPaise(12500000), "₹1,25,000");
  assert.equal(formatPaise(125050), "₹1,250.5");
});

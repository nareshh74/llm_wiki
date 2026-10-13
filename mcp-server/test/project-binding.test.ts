import assert from "node:assert/strict"
import { test } from "node:test"
import { McpProjectBinding, withActiveProject } from "../src/project-binding.js"

const alpha = { id: "p1", name: "Alpha", path: "/wiki/alpha", current: true }
const beta = { id: "p2", name: "Beta", path: "/wiki/beta", current: false }

test("pin resolves current to a stable project id", () => {
  const binding = new McpProjectBinding()
  binding.pin("current", [alpha, beta], alpha)
  assert.equal(binding.resolve(), "p1")
  assert.equal(binding.resolve("current"), "p1")
})

test("pinned sessions reject cross-project overrides", () => {
  const binding = new McpProjectBinding()
  binding.pin("p1", [alpha, beta], alpha)
  assert.equal(binding.resolve("/wiki/alpha"), "p1")
  assert.throws(() => binding.resolve("p2"), /override p2 was rejected/)
})

test("unbound sessions preserve the current-project compatibility default", () => {
  const binding = new McpProjectBinding()
  assert.equal(binding.resolve(), "current")
  assert.equal(binding.resolve("p2"), "p2")
})

test("fixed scope defaults to its configured project and cannot be cleared or overridden", () => {
  const binding = new McpProjectBinding("p1")
  assert.equal(binding.resolve(), "p1")
  assert.equal(binding.resolve("current"), "p1")
  assert.throws(() => binding.resolve("p2"), /fixed/)
  assert.throws(() => binding.clear(), /fixed/)
  binding.pin("p1", [alpha, beta], beta)
  assert.equal(binding.resolve("/wiki/alpha"), "p1")
  assert.throws(() => binding.pin("p2", [alpha, beta], beta), /fixed/)
  assert.throws(() => binding.pin("current", [alpha, beta], beta), /fixed/)
})

test("fixed path resolves to a stable UUID regardless of desktop project", () => {
  const binding = new McpProjectBinding("/wiki/alpha")
  binding.pin("/wiki/alpha", [alpha, beta], beta)
  assert.equal(binding.resolve(), "p1")
  assert.equal(binding.resolve("current"), "p1")
  assert.throws(() => binding.resolve("/wiki/beta"), /fixed/)
})

test("fixed scope must be explicit, nonempty and not the mutable current alias", () => {
  for (const selector of ["", "current", " p1", "p1 "]) {
    assert.throws(() => new McpProjectBinding(selector), /explicit/)
  }
})

test("responses carry a structural active-project reminder", () => {
  assert.match(withActiveProject("result", alpha, "p1"), /^\[activeProject: Alpha \(p1\)\]/)
})

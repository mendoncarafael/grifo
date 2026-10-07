// Rodar com: node lib/calculo.test.mjs
import assert from "node:assert/strict";
import { calcular, numero } from "./calculo.ts";

const aba = ["Data\tPagamento\tValor (R$)", "05/01/2026\tPix\t0.1", "10/01/2026\tBoleto\t100", "03/02/2026\tPix\t0.2", "04/02/2026\tpix\t1234.56"].join("\n");
const conta = (c) => calcular({ aba: 1, ...c }, [aba]);

assert.equal(conta({ operacao: "soma", coluna: "Valor (R$)" }), "1.334,86");
assert.equal(conta({ operacao: "soma", coluna: "valor (r$)", filtros: [{ coluna: "Pagamento", igual: "Pix" }] }), "1.234,86");
assert.equal(conta({ operacao: "contagem", filtros: [{ coluna: "Data", contem: "/02/2026" }] }), "2");
assert.equal(conta({ operacao: "maximo", coluna: "Valor (R$)" }), "1.234,56");
assert.equal(conta({ operacao: "media", coluna: "Valor (R$)", filtros: [{ coluna: "Pagamento", igual: "Boleto" }] }), "100,00");
assert.equal(conta({ operacao: "soma", coluna: "Valor (R$)", filtros: [{ coluna: "Pagamento", igual: "Cheque" }] }), "0,00");
assert.equal(conta({ operacao: "soma", coluna: "Não existe" }), null);
assert.equal(calcular({ aba: 9, operacao: "contagem" }, [aba]), null);

assert.equal(numero("R$ 1.234,56"), 1234.56);
assert.equal(numero("1,234.56"), 1234.56);
assert.equal(numero("7103.44"), 7103.44);
assert.ok(Number.isNaN(numero("Pix")));

console.log("calculo: ok");

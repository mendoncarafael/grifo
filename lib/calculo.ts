// Contas sobre uma aba de planilha, feitas no servidor: a IA só descreve a conta
// (aba, operação, coluna, filtros) e o número exato sai daqui.

const norm = (s: unknown) => String(s ?? "").replace(/\s+/g, " ").trim().toLowerCase();

// ponytail: sem vírgula, o ponto é lido como decimal ("1.234" = 1,234), que é como o SheetJS
// exporta números sem formato. Planilha que mostre milhar com ponto e sem centavos seria lida errado.
export function numero(celula: string): number {
  let s = celula.replace(/[^\d.,-]/g, "");
  if (s.includes(",") && s.includes("."))
    s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else s = s.replace(",", ".");
  return s === "" ? NaN : Number(s);
}

// Devolve o resultado já formatado em pt-BR, ou null se a conta pedida não puder ser feita.
// ponytail: assume o cabeçalho na primeira linha da aba; planilha com título acima do
// cabeçalho devolve null. Detectar a linha de cabeçalho se isso aparecer.
export function calcular(c: any, paginas: string[]): string | null {
  const texto = paginas[Number(c?.aba) - 1];
  if (typeof texto !== "string") return null;
  const [cabecalho, ...linhas] = texto.split("\n").map((l) => l.split("\t"));
  const coluna = (nome: unknown) => cabecalho.findIndex((h) => norm(h) === norm(nome));

  const filtros: { i: number; igual: unknown; contem: unknown }[] = (Array.isArray(c.filtros) ? c.filtros : []).map(
    (f: any) => ({ i: coluna(f?.coluna), igual: f?.igual, contem: f?.contem }),
  );
  if (filtros.some((f) => f.i < 0)) return null;
  const escolhidas = linhas.filter((l) =>
    filtros.every((f) => (f.igual != null ? norm(l[f.i]) === norm(f.igual) : norm(l[f.i]).includes(norm(f.contem)))),
  );

  if (c.operacao === "contagem") return String(escolhidas.length);

  const i = coluna(c.coluna);
  if (i < 0) return null;
  // Em centavos, para a soma não acumular erro de ponto flutuante.
  const centavos = escolhidas.map((l) => Math.round(numero(l[i] ?? "") * 100)).filter(Number.isFinite);
  const soma = centavos.reduce((t, n) => t + n, 0);
  let resultado: number;
  if (c.operacao === "soma") resultado = soma;
  else if (!centavos.length) return null;
  else if (c.operacao === "media") resultado = soma / centavos.length;
  else if (c.operacao === "maximo") resultado = Math.max(...centavos);
  else if (c.operacao === "minimo") resultado = Math.min(...centavos);
  else return null;

  return (resultado / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

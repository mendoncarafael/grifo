import { extractText, getDocumentProxy } from "unpdf";
import * as XLSX from "xlsx";

const erro = (mensagem: string, status: number) => Response.json({ erro: mensagem }, { status });

// Assinaturas de arquivo: .xlsx é um zip ("PK"), .xls é um contêiner OLE.
// Sem isso o SheetJS aceita qualquer texto como se fosse CSV.
const ehExcel = (b: Uint8Array) => (b[0] === 0x50 && b[1] === 0x4b) || (b[0] === 0xd0 && b[1] === 0xcf);

export async function POST(req: Request) {
  const arquivo = (await req.formData()).get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size > 20 * 1024 * 1024) return erro("Envie um arquivo de até 20 MB.", 400);
  const bytes = new Uint8Array(await arquivo.arrayBuffer());

  // Planilha: cada aba vira uma "página", com as células separadas por tabulação.
  if (/\.xlsx?$/i.test(arquivo.name)) {
    if (!ehExcel(bytes)) return erro("Não foi possível ler esta planilha.", 400);
    let abas: string[], paginas: string[];
    try {
      const pasta = XLSX.read(bytes);
      abas = pasta.SheetNames;
      // Células vazias no fim de cada linha são removidas: só gastam o limite de leitura da IA.
      paginas = abas.map((nome) =>
        XLSX.utils.sheet_to_csv(pasta.Sheets[nome], { FS: "\t", blankrows: false }).replace(/\t+$/gm, ""),
      );
    } catch {
      return erro("Não foi possível ler esta planilha.", 400);
    }
    if (!paginas.some((p) => p.trim())) return erro("Esta planilha está vazia.", 422);
    return Response.json({ paginas, abas });
  }

  let paginas: string[];
  try {
    paginas = (await extractText(await getDocumentProxy(bytes), { mergePages: false })).text;
  } catch {
    return erro("Não foi possível ler este PDF.", 400);
  }

  // ponytail: sem OCR — PDF digitalizado (só imagem) é recusado; adicionar OCR se aparecer demanda.
  if (!paginas.some((p) => p.trim()))
    return erro("Este PDF não tem texto selecionável (parece ser uma imagem digitalizada).", 422);

  return Response.json({ paginas });
}

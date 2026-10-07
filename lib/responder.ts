export type Fonte = { pagina: number; trecho: string };

export type Resposta = {
  texto: string;
  destaque?: string;
  itens?: { rotulo: string; valor: string }[];
  fontes?: Fonte[];
};

export type Turno = { role: "user" | "assistant"; content: string };

// A chave da IA fica no servidor (app/api/perguntar); aqui só chamamos a rota.
export async function responder(
  doc: { paginas: string[]; abas?: string[] },
  historico: Turno[],
  pergunta: string,
): Promise<Resposta> {
  const r = await fetch("/api/perguntar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paginas: doc.paginas, abas: doc.abas, historico, pergunta }),
  });
  const dados = await r.json();
  if (!r.ok) throw new Error(dados.erro);
  return dados;
}

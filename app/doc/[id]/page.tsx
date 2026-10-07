"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Fonte } from "../../../lib/responder";
import { Icone, useGrifo, type Documento } from "../../shell";

const SUGESTOES = ["Resumir o documento", "Listar todos os valores", "Quais são as datas importantes?"];
const VOLTAR = "M19 12H5M11 6l-6 6 6 6";

const tamanho = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;

const resumo = (doc: Documento) =>
  [doc.paginas && `${doc.paginas.length} ${doc.abas ? "aba" : "página"}${doc.paginas.length === 1 ? "" : "s"}`, tamanho(doc.tamanho)]
    .filter(Boolean)
    .join(" · ");

// Página do PDF ou nome da aba da planilha.
const rotulo = (doc: Documento, n: number) => (doc.abas ? (doc.abas[n - 1] ?? `Aba ${n}`) : `Página ${n}`);

const normalizar = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

// ponytail: grifa a linha inteira cujo texto contém o trecho citado (ou está contido nele);
// se a IA parafrasear em vez de copiar, nada é grifado. Pedir linha/coluna à IA se precisar de exatidão.
function Planilha({ texto, trecho }: { texto: string; trecho?: string }) {
  const alvo = trecho ? normalizar(trecho) : "";
  return (
    <div className="planilha">
      <table>
        <tbody>
          {texto.split("\n").map((linha, i) => {
            const l = normalizar(linha);
            const grifada = alvo && l && (l.includes(alvo) || (l.length > 8 && alvo.includes(l)));
            return (
              <tr key={i} className={grifada ? "grifada" : undefined}>
                {linha.split("\t").map((celula, j) => (
                  <td key={j}>{celula}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function Doc() {
  const { id } = useParams<{ id: string }>();
  const { docs, carregado, pendente, perguntar, remover, urlDe } = useGrifo();
  const router = useRouter();
  const doc = docs.find((d) => d.id === id);
  const [fonte, setFonte] = useState<Fonte | null>(null);
  const [pagina, setPagina] = useState(1);
  const [pdfAberto, setPdfAberto] = useState(false);
  const fim = useRef<HTMLDivElement>(null);
  const ocupado = pendente === id;

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth" });
  }, [doc?.mensagens.length, ocupado]);

  if (!carregado) return null;

  if (!doc)
    return (
      <main className="pagina">
        <h1>Documento não encontrado.</h1>
        <Link href="/" className="botao">Voltar ao início</Link>
      </main>
    );

  const enviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const campo = e.currentTarget.elements.namedItem("pergunta") as HTMLInputElement | HTMLTextAreaElement;
    const texto = campo.value.trim();
    if (!texto || ocupado) return;
    campo.value = "";
    perguntar(doc.id, texto);
  };

  if (doc.mensagens.length === 0)
    return (
      <main className="pagina">
        <Link href="/" className="redondo so-mobile" aria-label="Voltar"><Icone d={VOLTAR} /></Link>

        <div className="arquivo">
          <span className="miniatura">{doc.abas ? "XLS" : "PDF"}</span>
          <span className="texto">
            <strong>{doc.nome}</strong>
            <span className="suave">{resumo(doc)}</span>
          </span>
          <button
            className="redondo sem-borda"
            aria-label="Remover arquivo"
            onClick={() => {
              remover(doc.id);
              router.push("/");
            }}
          >
            <Icone d="M6 6l12 12M18 6L6 18" />
          </button>
        </div>

        <form onSubmit={enviar} className="secao">
          <label htmlFor="pergunta" className="titulo">O que você quer saber?</label>
          <textarea
            id="pergunta"
            name="pergunta"
            rows={4}
            required
            autoFocus
            placeholder="Ex.: quero saber qual foi o total gasto"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <button type="submit" className="botao grande">
            Perguntar
            <Icone d="M5 12h14M13 6l6 6-6 6" />
          </button>
        </form>

        <section className="secao">
          <h2 className="rotulo">Ou comece por aqui</h2>
          <div className="chips">
            {SUGESTOES.map((s) => (
              <button key={s} className="chip" onClick={() => perguntar(doc.id, s)}>{s}</button>
            ))}
          </div>
        </section>
      </main>
    );

  const url = urlDe(doc.id);

  return (
    <div className="chat-layout">
      <main className="chat">
        <header className="barra">
          <Link href="/" className="redondo so-mobile" aria-label="Voltar"><Icone d={VOLTAR} /></Link>
          <span className="texto">
            <strong>{doc.nome}</strong>
            <span className="suave">{resumo(doc)}</span>
          </span>
          <button className="redondo so-mobile" aria-label="Abrir o documento" onClick={() => setPdfAberto(true)}>
            <Icone d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5" />
          </button>
        </header>

        <div className="mensagens" aria-live="polite">
          {doc.mensagens.map((m, i) =>
            m.autor === "usuario" ? (
              <div key={i} className="balao">{m.texto}</div>
            ) : (
              <div key={i} className="resposta">
                <p>{m.texto}</p>
                {m.destaque && <div className="destaque"><span className="grifo">{m.destaque}</span></div>}
                {m.itens && (
                  <dl className="itens">
                    {m.itens.map((item) => (
                      <div key={item.rotulo}>
                        <dt>{item.rotulo}</dt>
                        <dd>{item.valor}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {m.fontes && (
                  <div className="chips fontes">
                    <span className="suave">Encontrado em</span>
                    {m.fontes.map((f) => (
                      <button
                        key={f.pagina + f.trecho}
                        className="chip"
                        aria-pressed={f === fonte}
                        onClick={() => {
                          setFonte(f);
                          setPagina(f.pagina);
                          setPdfAberto(true);
                        }}
                      >
                        {rotulo(doc, f.pagina)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ),
          )}
          {ocupado && (
            <div className="procurando">
              <span className="pontos" aria-hidden="true"><i /><i /><i /></span>
              Procurando no documento…
            </div>
          )}
          <div ref={fim} />
        </div>

        <form onSubmit={enviar} className="compositor">
          <label htmlFor="msg" className="oculto">Pergunte sobre este documento</label>
          <input id="msg" name="pergunta" type="text" placeholder="Pergunte sobre este documento" autoComplete="off" />
          <button type="submit" className="redondo escuro" aria-label="Enviar pergunta" disabled={ocupado}>
            <Icone d="M12 19V5M6 11l6-6 6 6" tamanho={22} />
          </button>
        </form>
      </main>

      <aside className="pdf" data-aberto={pdfAberto} aria-label="Documento">
        <div className="barra">
          <button className="redondo so-mobile" aria-label="Voltar ao chat" onClick={() => setPdfAberto(false)}>
            <Icone d={VOLTAR} />
          </button>
          {doc.abas ? (
            <div className="abas">
              {doc.abas.map((nome, i) => (
                <button key={i} className="chip" aria-pressed={pagina === i + 1} onClick={() => setPagina(i + 1)}>
                  {nome}
                </button>
              ))}
            </div>
          ) : (
            <strong>Página {pagina}</strong>
          )}
        </div>
        {doc.abas ? (
          <Planilha texto={doc.paginas?.[pagina - 1] ?? ""} trecho={fonte?.pagina === pagina ? fonte.trecho : undefined} />
        ) : url ? (
          // ponytail: visualizador nativo do navegador — não grifa o trecho dentro da
          // página e não abre embutido no Chrome do Android (daí o link abaixo).
          // Trocar por pdf.js quando a IA devolver a posição do trecho.
          <>
            <iframe key={pagina} src={`${url}#page=${pagina}`} title={doc.nome} />
            <a href={url} target="_blank" rel="noreferrer" className="so-mobile abrir">Abrir o PDF em outra aba</a>
          </>
        ) : (
          <p className="aviso">O arquivo não fica salvo ao recarregar a página. Envie o PDF de novo para visualizá-lo.</p>
        )}
        {fonte && (
          <div className="trecho">
            <h2 className="rotulo">Trecho usado na resposta</h2>
            <blockquote>“<span className="grifo">{fonte.trecho}</span>”</blockquote>
          </div>
        )}
      </aside>
    </div>
  );
}

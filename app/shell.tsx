"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { responder, type Resposta } from "../lib/responder";

export type Mensagem = { autor: "usuario" | "grifo" } & Resposta;
// `paginas` é o texto de cada página (ou aba); falta em documentos enviados antes de a IA existir.
// `abas` são os nomes das abas e só existe quando o documento é uma planilha.
export type Documento = {
  id: string;
  nome: string;
  tamanho: number;
  paginas?: string[];
  abas?: string[];
  mensagens: Mensagem[];
};

type Grifo = {
  docs: Documento[];
  carregado: boolean;
  pendente: string | null;
  adicionar: (arquivo: File) => Promise<{ id: string } | { erro: string }>;
  remover: (id: string) => void;
  perguntar: (id: string, texto: string) => Promise<void>;
  urlDe: (id: string) => string | undefined;
};

const Contexto = createContext<Grifo | null>(null);
export const useGrifo = () => useContext(Contexto)!;

const CHAVE = "grifo:docs";

export const ultimaPergunta = (doc: Documento) =>
  doc.mensagens.findLast((m) => m.autor === "usuario")?.texto;

export function Icone({ d, tamanho = 20 }: { d: string; tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const [docs, setDocs] = useState<Documento[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [pendente, setPendente] = useState<string | null>(null);
  // ponytail: os PDFs ficam só na memória e somem ao recarregar a página;
  // guardar em IndexedDB (ou no backend) quando a IA entrar.
  const urls = useRef(new Map<string, string>());

  useEffect(() => {
    try {
      setDocs(JSON.parse(localStorage.getItem(CHAVE) ?? "[]"));
    } catch {}
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (!carregado) return;
    try {
      localStorage.setItem(CHAVE, JSON.stringify(docs));
    } catch {}
  }, [docs, carregado]);

  const acrescentar = (id: string, m: Mensagem) =>
    setDocs((ds) => ds.map((d) => (d.id === id ? { ...d, mensagens: [...d.mensagens, m] } : d)));

  const grifo: Grifo = {
    docs,
    carregado,
    pendente,
    async adicionar(arquivo) {
      if (!/\.(pdf|xlsx?)$/i.test(arquivo.name))
        return { erro: "Esse tipo de arquivo não é aceito. Escolha um PDF ou uma planilha Excel (.xlsx ou .xls)." };
      const corpo = new FormData();
      corpo.append("arquivo", arquivo);
      try {
        const r = await fetch("/api/extrair", { method: "POST", body: corpo });
        const dados = await r.json();
        if (!r.ok) return { erro: dados.erro };
        const id = crypto.randomUUID();
        if (!dados.abas) urls.current.set(id, URL.createObjectURL(arquivo));
        setDocs((ds) => [
          { id, nome: arquivo.name, tamanho: arquivo.size, paginas: dados.paginas, abas: dados.abas, mensagens: [] },
          ...ds,
        ]);
        return { id };
      } catch {
        return { erro: "Não foi possível enviar o arquivo. Tente de novo." };
      }
    },
    remover(id) {
      const url = urls.current.get(id);
      if (url) URL.revokeObjectURL(url);
      urls.current.delete(id);
      setDocs((ds) => ds.filter((d) => d.id !== id));
    },
    async perguntar(id, texto) {
      const doc = docs.find((d) => d.id === id);
      acrescentar(id, { autor: "usuario", texto });
      setPendente(id);
      try {
        const paginas = doc?.paginas;
        if (!paginas) throw new Error("Este documento foi enviado antes de a IA existir. Envie o arquivo de novo.");
        const historico = doc.mensagens.slice(-10).map((m) => ({
          role: m.autor === "usuario" ? ("user" as const) : ("assistant" as const),
          content: [m.texto, m.destaque].filter(Boolean).join(" "),
        }));
        acrescentar(id, { autor: "grifo", ...(await responder({ paginas, abas: doc.abas }, historico, texto)) });
      } catch (e) {
        const mensagem = e instanceof Error && e.message ? e.message : "Não consegui responder agora. Tente de novo.";
        acrescentar(id, { autor: "grifo", texto: mensagem });
      } finally {
        setPendente(null);
      }
    },
    urlDe: (id) => urls.current.get(id),
  };

  const { id: atual } = useParams<{ id?: string }>();

  return (
    <Contexto.Provider value={grifo}>
      <div className="app">
        <nav className="sidebar" aria-label="Documentos">
          <Link href="/" className="logo"><span className="grifo">Grifo</span></Link>
          <Link href="/" className="botao">
            <Icone d="M12 5v14M5 12h14" tamanho={18} />
            Novo documento
          </Link>
          <div className="lista">
            <h2 className="rotulo">Recentes</h2>
            {docs.length === 0 && <p className="vazio">Nenhum documento ainda.</p>}
            {docs.map((d) => (
              <Link key={d.id} href={`/doc/${d.id}`} className="item" aria-current={d.id === atual ? "page" : undefined}>
                <strong>{d.nome}</strong>
                <span>{ultimaPergunta(d) ? `“${ultimaPergunta(d)}”` : "Sem perguntas ainda"}</span>
              </Link>
            ))}
          </div>
        </nav>
        <div className="conteudo">{children}</div>
      </div>
    </Contexto.Provider>
  );
}

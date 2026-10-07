"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icone, ultimaPergunta, useGrifo } from "./shell";

const EXEMPLOS = [
  ["Comprovantes e faturas", "“Qual foi o total gasto?”"],
  ["Contratos", "“Quando vence e qual é a multa?”"],
  ["Relatórios longos", "“Resuma em cinco pontos.”"],
];

export default function Inicio() {
  const { docs, adicionar } = useGrifo();
  const router = useRouter();
  const [erro, setErro] = useState("");
  const [lendo, setLendo] = useState(false);

  const enviar = async (arquivo?: File) => {
    if (!arquivo || lendo) return;
    setErro("");
    setLendo(true);
    const resultado = await adicionar(arquivo);
    if ("id" in resultado) return router.push(`/doc/${resultado.id}`);
    setLendo(false);
    setErro(resultado.erro);
  };

  return (
    <main className="pagina">
      <div className="logo so-mobile"><span className="grifo">Grifo</span></div>

      <h1>Envie um PDF ou Excel e pergunte o que quiser saber.</h1>

      <label
        className="dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          enviar(e.dataTransfer.files[0]);
        }}
      >
        <input
          type="file"
          accept=".pdf,.xlsx,.xls"
          className="oculto"
          disabled={lendo}
          onChange={(e) => {
            enviar(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <span className="bolinha"><Icone d="M12 19V5M6 11l6-6 6 6" tamanho={26} /></span>
        <strong className="so-mobile">Enviar um arquivo</strong>
        <span className="suave so-mobile">Toque para escolher um PDF ou Excel</span>
        <strong className="so-desktop">Arraste um PDF ou Excel para cá</strong>
        <span className="suave so-desktop">ou <u>escolha um arquivo</u> do computador</span>
      </label>
      {lendo && <p role="status" className="suave">Lendo o arquivo…</p>}
      {erro && <p role="alert" className="erro">{erro}</p>}

      {docs.length > 0 && (
        <section className="so-mobile secao">
          <h2 className="rotulo">Recentes</h2>
          {docs.map((d) => (
            <Link key={d.id} href={`/doc/${d.id}`} className="cartao-doc">
              <span className="miniatura">{d.abas ? "XLS" : "PDF"}</span>
              <span className="texto">
                <strong>{d.nome}</strong>
                <span className="suave">{ultimaPergunta(d) ? `“${ultimaPergunta(d)}”` : "Sem perguntas ainda"}</span>
              </span>
            </Link>
          ))}
        </section>
      )}

      <section className="so-desktop secao">
        <h2 className="rotulo">Exemplos do que perguntar</h2>
        <div className="exemplos">
          {EXEMPLOS.map(([tipo, pergunta]) => (
            <div key={tipo} className="exemplo">
              <span className="suave">{tipo}</span>
              <strong>{pergunta}</strong>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

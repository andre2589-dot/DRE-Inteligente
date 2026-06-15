import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

async function main() {
  console.log("==================================================");
  console.log("📋 INICIANDO AUDITORIA DE SINCRONIZAÇÃO SUPABASE");
  console.log("==================================================");

  const isConfigured = !!(supabaseUrl && supabaseAnonKey);
  console.log(`URL Supabase Configurada: ${supabaseUrl ? "SIM" : "NÃO"}`);
  console.log(`Anon Key Configurada: ${supabaseAnonKey ? "SIM" : "NÃO"}`);

  if (!isConfigured) {
    console.log("⚠️ Supabase não configurado via variáveis de ambiente.");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const tables = ["companies", "plano_contas", "transactions", "ai_conversations", "uploaded_files"];

  console.log("\n1. CONSULTAS DE TABELAS:");
  console.log("-----------------------------------------------------------------");
  console.log("Tabela | Quantidade | Tempo de Resposta (ms) | Status");
  console.log("-----------------------------------------------------------------");

  for (const table of tables) {
    const start = Date.now();
    try {
      const { data, count, error } = await supabase
        .from(table)
        .select("*", { count: "exact" });
      const duration = Date.now() - start;

      if (error) {
        console.log(`${table} | - | ${duration}ms | ERROR: ${error.message}`);
      } else {
        console.log(`${table} | ${count ?? (data ? data.length : 0)} | ${duration}ms | OK`);
      }
    } catch (e: any) {
      console.log(`${table} | - | - | EXCEPTION: ${e.message}`);
    }
  }

  console.log("-----------------------------------------------------------------");

  console.log("\n2. EMPRESAS REGISTRADAS:");
  const { data: companies, error: compErr } = await supabase.from("companies").select("*");
  if (compErr) {
    console.log(`Erro ao buscar empresas: ${compErr.message}`);
  } else if (companies) {
    companies.forEach(c => {
      console.log(`- Empresa: [${c.id}] ${c.name} | Setor: ${c.sector} | CNPJ: ${c.cnpj}`);
    });
  }

  console.log("\n3. TRANSAÇÕES POR EMPRESA:");
  const { data: txs, error: txErr } = await supabase.from("transactions").select("company_id, value");
  if (txErr) {
    console.log(`Erro ao buscar transações: ${txErr.message}`);
  } else if (txs) {
    const counts: Record<string, { count: number; sum: number }> = {};
    txs.forEach(t => {
      const cid = t.company_id || "undefined";
      if (!counts[cid]) counts[cid] = { count: 0, sum: 0 };
      counts[cid].count++;
      counts[cid].sum += Number(t.value || 0);
    });
    Object.entries(counts).forEach(([cid, info]) => {
      console.log(`- Company ID: [${cid}] | Qtd Transações: ${info.count} | Faturamento/Custo Total Relacional: ${info.sum.toFixed(2)}`);
    });
  }

  console.log("\n4. CONTAS NO PLANO DE CONTAS POR EMPRESA:");
  const { data: pcs, error: pcErr } = await supabase.from("plano_contas").select("company_id, code, name");
  if (pcErr) {
    console.log(`Erro ao buscar plano de contas: ${pcErr.message}`);
  } else if (pcs) {
    const counts: Record<string, number> = {};
    pcs.forEach(p => {
      const cid = p.company_id || "global/compartilhado";
      counts[cid] = (counts[cid] || 0) + 1;
    });
    Object.entries(counts).forEach(([cid, count]) => {
      console.log(`- Company ID: [${cid}] | Contas no Plano de Contas: ${count}`);
    });
  }

  console.log("\n5. ARQUIVOS IMPORTADOS POR EMPRESA:");
  const { data: files, error: fileErr } = await supabase.from("uploaded_files").select("company_id");
  if (fileErr) {
    console.log(`Erro ao buscar arquivos importados: ${fileErr.message}`);
  } else if (files) {
    const counts: Record<string, number> = {};
    files.forEach(f => {
      const cid = f.company_id || "undefined";
      counts[cid] = (counts[cid] || 0) + 1;
    });
    Object.entries(counts).forEach(([cid, count]) => {
      console.log(`- Company ID: [${cid}] | Arquivos Importados: ${count}`);
    });
  }

  console.log("==================================================");
}

main().catch(err => console.error("Error in audit:", err));

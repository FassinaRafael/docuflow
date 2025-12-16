"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useTheme } from "next-themes";
import {
  UploadCloud,
  FileText,
  CheckCircle,
  Loader2,
  RefreshCw,
  Database,
  Trash2,
  Download,
  Moon,
  Sun,
  ShieldCheck,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "uploading" | "processing" | "completed" | "error"
  >("idle");
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  // Controle de Tema
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_URL}/documents`);
      setHistory(res.data);
    } catch (error) {
      console.error("Erro histórico", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir registro permanentemente?")) return;
    try {
      await axios.delete(`${API_URL}/documents/${id}`);
      setHistory((prev) => prev.filter((doc) => doc.id !== id));
    } catch (error) {
      alert("Erro ao deletar.");
    }
  };

  const handleDownloadJson = (doc: any) => {
    const jsonString = JSON.stringify(doc.extracted_data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `docuflow_${doc.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus("idle");
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setStatus("uploading");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await axios.post(`${API_URL}/upload`, formData);
      setStatus("processing");
      const workflowRes = await axios.post(
        `${API_URL}/workflow/${uploadRes.data.filename}`
      );
      pollResult(workflowRes.data.workflow_id);
    } catch (error) {
      console.error(error);
      setStatus("error");
      setLoading(false);
    }
  };

  const pollResult = async (id: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API_URL}/workflow/result/${id}`);
        const data = res.data;
        if (data.status === "FAILED" || data.status === "TERMINATED") {
          setStatus("error");
          setLoading(false);
          clearInterval(interval);
          return;
        }
        if (data.result && data.result.document_type) {
          setResult(data.result);
          setStatus("completed");
          setLoading(false);
          clearInterval(interval);
          fetchHistory();
        }
      } catch (e) {
        setStatus("error");
        setLoading(false);
        clearInterval(interval);
      }
    }, 2000);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen font-sans transition-colors duration-300 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-slate-50 selection:bg-indigo-500/30">
      {/* HEADER MODERNO */}
      <header className="border-b border-slate-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">DocuFlow</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full hover:bg-slate-200 dark:hover:bg-zinc-800"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-10 py-12">
        {/* HERO SECTION */}
        <div className="text-center space-y-4 py-8">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
            Auditoria Inteligente
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
            Automatize a conformidade de documentos usando IA Generativa. Envie
            um PDF e deixe nossa orquestração cuidar do resto.
          </p>
        </div>

        {/* UPLOAD CARD - GLASSMORPHISM */}
        <Card className="border-slate-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 backdrop-blur-sm shadow-xl shadow-indigo-500/5">
          <CardContent className="pt-6 space-y-6">
            <div
              className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center space-y-4 transition-all duration-300
                ${
                  file
                    ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20"
                    : "border-slate-300 dark:border-zinc-700 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-zinc-800/50"
                }
              `}
            >
              <div className="p-4 bg-white dark:bg-zinc-800 rounded-full shadow-sm">
                <UploadCloud className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="text-center">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                    Clique para enviar
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {" "}
                    ou arraste o arquivo
                  </span>
                </label>
                <p className="text-xs text-slate-400 mt-2">
                  PDF, PNG ou JPG (max 10MB)
                </p>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg"
                  onChange={handleFileChange}
                />
              </div>
              {file && (
                <Badge
                  variant="secondary"
                  className="pl-2 pr-4 py-1 gap-2 text-sm bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100"
                >
                  <FileText className="h-4 w-4" /> {file.name}
                </Badge>
              )}
            </div>

            <Button
              onClick={handleUpload}
              disabled={!file || loading}
              className="w-full h-12 text-base font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 transition-all"
            >
              {loading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                "Iniciar Processamento"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* RESULTADO */}
        {status === "processing" && (
          <Alert className="border-indigo-200 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-800 text-indigo-900 dark:text-indigo-100 animate-pulse">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400" />
            <AlertTitle>Processando Workflow</AlertTitle>
            <AlertDescription>
              O Temporal está orquestrando a extração de dados com o Worker...
            </AlertDescription>
          </Alert>
        )}

        {status === "completed" && result && (
          <div className="grid gap-6 md:grid-cols-2 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/10 dark:border-green-800 backdrop-blur-sm">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-lg text-green-700 dark:text-green-400 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" /> Análise Concluída
                </CardTitle>
                <Badge className="bg-green-600">
                  {result.confidence_score}% Score
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-green-600/80 dark:text-green-500/80 uppercase tracking-wider">
                    Entidade
                  </span>
                  <p className="font-semibold text-lg">{result.entity_name}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-green-600/80 dark:text-green-500/80 uppercase tracking-wider">
                    Resumo IA
                  </span>
                  <p className="text-sm leading-relaxed opacity-90">
                    {result.summary}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
              <CardHeader className="bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-100 dark:border-zinc-800 py-3">
                <CardTitle className="text-sm font-mono text-slate-500">
                  payload.json
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="bg-slate-950 p-4 text-xs font-mono text-emerald-400 overflow-auto max-h-[250px] scrollbar-thin scrollbar-thumb-slate-700">
                  <pre>{JSON.stringify(result, null, 2)}</pre>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TABELA DE HISTÓRICO */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Database className="h-5 w-5 text-indigo-500" /> Histórico
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchHistory}
              className="dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
            </Button>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-zinc-800/50 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Arquivo</th>
                  <th className="px-6 py-4">Entidade</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {history.map((doc) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-slate-400 text-xs">
                      #{doc.id}
                    </td>
                    <td className="px-6 py-4 font-medium truncate max-w-[150px]">
                      {doc.filename}
                    </td>
                    <td className="px-6 py-4">
                      {doc.extracted_data?.entity_name || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                        ${
                          doc.status === "completed"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDownloadJson(doc)}
                      >
                        <Download className="h-4 w-4 text-slate-400 hover:text-indigo-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDelete(doc.id)}
                      >
                        <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {history.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm">
                Nenhum registro encontrado.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

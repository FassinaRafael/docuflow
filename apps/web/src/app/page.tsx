"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import {
  UploadCloud,
  FileText,
  CheckCircle,
  Loader2,
  RefreshCw,
  Database,
  Trash2,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const API_URL = "http://localhost:8000";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "uploading" | "processing" | "completed" | "error"
  >("idle");
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_URL}/documents`);
      setHistory(res.data);
    } catch (error) {
      console.error("Erro ao buscar histórico", error);
    }
  };

  // --- NOVA FUNÇÃO: DELETAR ---
  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este documento?")) return;
    try {
      await axios.delete(`${API_URL}/documents/${id}`);
      // Remove da lista visualmente sem precisar recarregar tudo
      setHistory((prev) => prev.filter((doc) => doc.id !== id));
    } catch (error) {
      alert("Erro ao deletar documento.");
    }
  };

  // --- NOVA FUNÇÃO: DOWNLOAD JSON ---
  const handleDownloadJson = (doc: any) => {
    const jsonString = JSON.stringify(doc.extracted_data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `docuflow_result_${doc.id}.json`;
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
      const filename = uploadRes.data.filename;

      setStatus("processing");
      const workflowRes = await axios.post(`${API_URL}/workflow/${filename}`);
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

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            DocuFlow Compliance
          </h1>
          <p className="text-slate-500">
            Extração Inteligente de Documentos com IA e Auditoria
          </p>
        </div>

        {/* AREA DE UPLOAD */}
        <Card>
          <CardHeader>
            <CardTitle>Nova Análise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 flex flex-col items-center justify-center space-y-4 hover:bg-slate-50 transition">
              <UploadCloud className="h-10 w-10 text-slate-400" />
              <div className="text-center">
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer font-medium text-blue-600 hover:text-blue-500"
                >
                  Clique para selecionar
                </label>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg"
                  onChange={handleFileChange}
                />
              </div>
              {file && (
                <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm">
                  <FileText className="h-4 w-4" />
                  {file.name}
                </div>
              )}
            </div>
            <Button
              onClick={handleUpload}
              disabled={!file || loading}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Iniciar Processamento"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* STATUS */}
        {status === "processing" && (
          <Alert className="bg-blue-50 border-blue-200">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <AlertTitle>Processando Workflow</AlertTitle>
            <AlertDescription>
              O Worker está analisando com IA...
            </AlertDescription>
          </Alert>
        )}

        {status === "completed" && result && (
          <div className="grid gap-6 md:grid-cols-2 animate-in fade-in slide-in-from-bottom-4">
            <Card className="border-green-200 bg-green-50/30">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-green-800 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" /> Sucesso
                  </CardTitle>
                  <Badge className="bg-green-600 hover:bg-green-700">
                    {result.confidence_score}% Confiança
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-xs font-bold text-green-700 uppercase">
                    Entidade
                  </span>
                  <p className="font-medium text-slate-900">
                    {result.entity_name}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-bold text-green-700 uppercase">
                    Resumo
                  </span>
                  <p className="text-sm text-slate-700 mt-1">
                    {result.summary}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>JSON</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-950 text-slate-50 p-4 rounded-lg text-xs font-mono overflow-auto max-h-[200px]">
                  <pre>{JSON.stringify(result, null, 2)}</pre>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TABELA DE HISTÓRICO COM AÇÕES */}
        <div className="pt-8 border-t border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Database className="h-6 w-6" /> Base de Documentos
            </h2>
            <Button variant="outline" size="sm" onClick={fetchHistory}>
              <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
            </Button>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">Arquivo</th>
                  <th className="px-6 py-3">Entidade</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-mono text-slate-400">
                      #{doc.id}
                    </td>
                    <td
                      className="px-6 py-3 truncate max-w-[150px]"
                      title={doc.filename}
                    >
                      {doc.filename}
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-900">
                      {doc.extracted_data?.entity_name || "-"}
                    </td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownloadJson(doc)}
                        title="Baixar JSON"
                      >
                        <Download className="h-4 w-4 text-slate-500 hover:text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(doc.id)}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4 text-slate-500 hover:text-red-600" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-slate-400"
                    >
                      Nenhum documento processado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

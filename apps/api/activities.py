from temporalio import activity
from dataclasses import dataclass
from ocr_service import process_document_text
from llm_service import analyze_document_content
from schemas import ExtractedData
from database import SessionLocal
from models import DocumentModel
import json

@dataclass
class ProcessingResult:
    filename: str
    status: str
    data: dict

class DocumentActivities:
    @activity.defn
    async def extract_text_activity(self, filename: str) -> str:
        """
        Atividade 1: Baixa do MinIO e faz OCR.
        Retorna o texto bruto.
        """
        activity.logger.info(f"Iniciando OCR para: {filename}")
        
        result = process_document_text(filename)
        
        if "error" in result:
            raise Exception(result["error"])
            
        return result["content"]

    @activity.defn
    async def analyze_with_ai_activity(self, text: str) -> dict:
        """
        Atividade 2: Pega o texto e manda pro Gemini.
        Retorna o JSON estruturado (como dict).
        """
        activity.logger.info("Enviando texto para IA...")
        
        extracted_data = analyze_document_content(text)
        
        return extracted_data.model_dump()
    
    @activity.defn
    async def save_to_db_activity(self, data: dict) -> str:
        activity.logger.info("Salvando resultado no PostgreSQL...")
        
        db = SessionLocal()
        try:
            # Verifica se já existe (pelo nome do arquivo)
            existing_doc = db.query(DocumentModel).filter(DocumentModel.filename == data.get("filename")).first()
            
            if existing_doc:
                # Atualiza
                existing_doc.status = "completed"
                existing_doc.extracted_data = data
                db.commit()
                return f"Documento {existing_doc.id} atualizado."
            else:
                # Cria novo
                new_doc = DocumentModel(
                    filename=data.get("filename", "unknown"),
                    status="completed",
                    extracted_data=data
                )
                db.add(new_doc)
                db.commit()
                return "Novo documento salvo."
        except Exception as e:
            activity.logger.error(f"Erro ao salvar no banco: {e}")
            raise e
        finally:
            db.close()
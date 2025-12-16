import os
import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from temporalio.client import Client

# Imports locais
from database import get_db, engine, Base
from storage import init_bucket, upload_file_to_s3
from models import DocumentModel
from workflows import DocumentProcessingWorkflow

# Cria as tabelas no banco ao iniciar
Base.metadata.create_all(bind=engine)

app = FastAPI(title="DocuFlow API")

# Configuração de CORS (Permite o Frontend acessar)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pega o endereço do Temporal (Do Docker ou Localhost)
TEMPORAL_HOST = os.getenv("TEMPORAL_HOST", "localhost:7233")

@app.on_event("startup")
def startup_event():
    init_bucket()

# --- ROTA 1: UPLOAD ---
@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    if file.content_type not in ["application/pdf", "image/png", "image/jpeg"]:
        raise HTTPException(status_code=400, detail="Apenas PDF, PNG ou JPEG.")

    file_extension = file.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    
    url = upload_file_to_s3(file.file, unique_filename)

    if not url:
        raise HTTPException(status_code=500, detail="Erro no Storage.")

    return {
        "filename": unique_filename,
        "original_name": file.filename,
        "status": "stored",
        "location": "minio"
    }

# --- ROTA 2: INICIAR WORKFLOW ---
@app.post("/workflow/{filename}")
async def start_workflow(filename: str):
    try:
        # Conexão dinâmica
        client = await Client.connect(TEMPORAL_HOST)

        handle = await client.start_workflow(
            DocumentProcessingWorkflow.run,
            filename,
            id=f"docuflow-{filename}",
            task_queue="docuflow-queue",
        )

        return {
            "message": "Processamento iniciado!",
            "workflow_id": handle.id,
            "run_id": handle.result_run_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao iniciar workflow: {str(e)}")

# --- ROTA 3: CONSULTAR RESULTADO (Polling) ---
@app.get("/workflow/result/{workflow_id}")
async def get_result(workflow_id: str):
    try:
        client = await Client.connect(TEMPORAL_HOST)
        handle = client.get_workflow_handle(workflow_id)
        
        desc = await handle.describe()
        status = desc.status.name # RUNNING, COMPLETED, FAILED
        
        if status == "RUNNING":
            return {"status": "RUNNING", "message": "Processando..."}
        
        if status != "COMPLETED":
            return {"status": status, "message": "Falhou ou cancelado."}

        result = await handle.result()
        return result
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar resultado: {str(e)}")

# --- ROTA 4: LISTAR HISTÓRICO (Dashboard) ---
@app.get("/documents")
def list_documents(db: Session = Depends(get_db)):
    return db.query(DocumentModel).order_by(DocumentModel.id.desc()).all()

# --- ROTA 5: DELETAR DOCUMENTO (NOVA) ---
@app.delete("/documents/{doc_id}")
def delete_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(DocumentModel).filter(DocumentModel.id == doc_id).first()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    
    # Remove do Banco de Dados
    db.delete(doc)
    db.commit()
    
    return {"message": "Documento deletado com sucesso", "id": doc_id}

@app.get("/")
def read_root():
    return {"message": "DocuFlow API is running inside Docker! 🐳"}
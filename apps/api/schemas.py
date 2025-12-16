from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum

class DocumentType(str, Enum):
    CONTRACT = "contrato"
    INVOICE = "nota_fiscal"
    SYLLABUS = "plano_ensino"
    ID_CARD = "documento_identidade"
    OTHER = "outros"

class ExtractedData(BaseModel):
    document_type: DocumentType = Field(..., description="Tipo do documento")
    
    entity_name: Optional[str] = Field(description="Nome da entidade principal")
    document_date: Optional[str] = Field(description="Data encontrada (YYYY-MM-DD)")
    
    summary: str = Field(..., description="Resumo em 1 frase")
    
    key_values: List[str] = Field(description="Valores ou códigos importantes")
    
    confidence_score: int = Field(..., description="Confiança 0-100")
import os
import json
import google.generativeai as genai
from dotenv import load_dotenv
from schemas import ExtractedData
from google.generativeai.types import HarmCategory, HarmBlockThreshold

load_dotenv()

GENAI_KEY = os.getenv("GOOGLE_API_KEY")
if GENAI_KEY:
    genai.configure(api_key=GENAI_KEY)

def analyze_document_content(text_content: str) -> ExtractedData:
    if not GENAI_KEY:
         return ExtractedData(
            document_type="outros",
            entity_name=None,
            document_date=None,
            summary="[ERRO] Chave Google API não encontrada no .env",
            key_values=[],
            confidence_score=0
        )

    generation_config = {
        "temperature": 0.1,
        "response_mime_type": "application/json",
        "response_schema": ExtractedData
    }

    # --- NOVO: Configuração para não bloquear nada ---
    safety_settings = {
        HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
    }

    model = genai.GenerativeModel(
        model_name="gemini-flash-latest", 
        generation_config=generation_config,
        safety_settings=safety_settings, # Adicionamos aqui
        system_instruction="Você é um assistente de Backoffice. Extraia os dados do texto OCR abaixo estritamente no formato JSON solicitado."
    )

    try:
        response = model.generate_content(f"Texto extraído do documento:\n---\n{text_content[:30000]}")
        
        # Verificação extra de segurança antes de acessar .text
        if not response.parts:
            raise ValueError(f"O Gemini bloqueou a resposta. Finish Reason: {response.candidates[0].finish_reason}")

        json_response = json.loads(response.text)
        return ExtractedData(**json_response)

    except Exception as e:
        print(f"Erro no Gemini: {e}")
        return ExtractedData(
            document_type="outros",
            entity_name=None,
            document_date=None,
            summary=f"Erro ao processar com IA: {str(e)}",
            key_values=[],
            confidence_score=0
        )
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("ERRO: Chave não encontrada no .env")
else:
    genai.configure(api_key=api_key)
    print("--- Modelos Disponíveis para sua Chave ---")
    try:
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"Nome: {m.name}")
    except Exception as e:
        print(f"Erro ao listar modelos: {e}")
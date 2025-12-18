import io
import pytesseract
from PIL import Image
from pypdf import PdfReader
from storage import get_s3_client, BUCKET_NAME

pytesseract.pytesseract.tesseract_cmd = r'C:\Users\rafael.fassina\AppData\Local\Programs\Tesseract-OCR\tesseract.exe'

def extract_text_from_pdf_native(file_stream):
    """Tenta extrair texto de PDF digital (super rápido)"""
    try:
        reader = PdfReader(file_stream)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        print(f"Erro no pypdf: {e}")
        return None

def extract_text_from_image(file_stream):
    """Usa OCR para extrair texto de Imagens"""
    try:
        image = Image.open(file_stream)
        # lang='por' pode ser usado se baixar o pacote de lingua portuguesa no tesseract
        text = pytesseract.image_to_string(image) 
        return text
    except Exception as e:
        print(f"Erro no Tesseract: {e}")
        return "Erro ao processar imagem. Verifique se o Tesseract está instalado corretamente."

def process_document_text(filename: str):
    """
    1. Baixa do MinIO
    2. Identifica tipo
    3. Extrai texto
    """
    s3 = get_s3_client()
    
    try:
        # 1. Baixar arquivo do MinIO para memória (sem salvar no disco)
        response = s3.get_object(Bucket=BUCKET_NAME, Key=filename)
        file_content = response['Body'].read()
        file_stream = io.BytesIO(file_content)
        
        # 2. Decidir estratégia baseada na extensão
        text = ""
        if filename.lower().endswith('.pdf'):
            # Tenta pypdf primeiro
            text = extract_text_from_pdf_native(file_stream)
            
            # Se retornar vazio, pode ser um PDF escaneado (imagem dentro do PDF)
            if not text or len(text.strip()) < 10:
                text = "[AVISO] PDF parece ser uma imagem escaneada. Para processar scans, precisamos de bibliotecas adicionais (Poppler)."
        else:
            # Assume que é imagem (png, jpg)
            text = extract_text_from_image(file_stream)
            
        return {"filename": filename, "content": text}

    except Exception as e:
        return {"error": str(e)}
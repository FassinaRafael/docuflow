from datetime import timedelta
from temporalio import workflow

with workflow.unsafe.imports_passed_through():
    from activities import DocumentActivities

@workflow.defn
class DocumentProcessingWorkflow:
    @workflow.run
    async def run(self, filename: str) -> dict:
        workflow.logger.info(f"Workflow iniciado para: {filename}")

        # 1. Configurar retry policy e timeouts
        # Se o OCR falhar, tenta de novo em instantes
        
        # 2. Executar Passo 1: OCR
        raw_text = await workflow.execute_activity_method(
            DocumentActivities.extract_text_activity,
            filename,
            start_to_close_timeout=timedelta(minutes=2) # Dá tempo pro Tesseract rodar
        )

        # 3. Executar Passo 2: IA
        extracted_dict = await workflow.execute_activity_method(
            DocumentActivities.analyze_with_ai_activity,
            raw_text,
            start_to_close_timeout=timedelta(minutes=1)
        )

        # Adicionamos o filename ao dicionário para salvar no banco
        extracted_dict["filename"] = filename

        # --- NOVO: Passo 3: Salvar no Banco (Persistência) ---
        await workflow.execute_activity_method(
            DocumentActivities.save_to_db_activity,
            extracted_dict,
            start_to_close_timeout=timedelta(seconds=10)
        )

        workflow.logger.info("Workflow concluído e salvo!")
        
        return {
            "filename": filename,
            "status": "completed",
            "result": extracted_dict
        }
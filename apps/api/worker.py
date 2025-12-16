import asyncio
import os
from temporalio.client import Client
from temporalio.worker import Worker

# Imports locais
from activities import DocumentActivities
from workflows import DocumentProcessingWorkflow

# Pega o endereço do Temporal (Do Docker ou Localhost)
TEMPORAL_HOST = os.getenv("TEMPORAL_HOST", "localhost:7233")

async def main():
    print(f"🔌 Tentando conectar ao Temporal em: {TEMPORAL_HOST}...")
    
    # Conecta ao Servidor Temporal
    client = await Client.connect(TEMPORAL_HOST)

    # Instancia as atividades
    activities = DocumentActivities()

    # Cria o Worker com as 3 atividades registradas
    worker = Worker(
        client,
        task_queue="docuflow-queue",
        workflows=[DocumentProcessingWorkflow],
        activities=[
            activities.extract_text_activity, 
            activities.analyze_with_ai_activity,
            activities.save_to_db_activity
        ],
    )

    print("👷 Worker iniciado dentro do container! Aguardando tarefas...")
    
    await worker.run()

if __name__ == "__main__":
    asyncio.run(main())
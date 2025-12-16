import boto3
import os
from botocore.client import Config

MINIO_HOST = os.getenv("MINIO_ENDPOINT", "localhost:9000")
ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minio_admin")
SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minio_password")
BUCKET_NAME = "docuflow"
ENDPOINT_URL = f"http://{MINIO_HOST}"

def get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=ENDPOINT_URL,
        aws_access_key_id=ACCESS_KEY,
        aws_secret_access_key=SECRET_KEY,
        config=Config(signature_version="s3v4"),
        region_name="us-east-1"
    )

def init_bucket():
    s3 = get_s3_client()
    try:
        s3.head_bucket(Bucket=BUCKET_NAME)
        print(f"✅ Bucket '{BUCKET_NAME}' encontrado.")
    except:
        print(f"⚠️ Bucket '{BUCKET_NAME}' não existe. Criando...")
        try:
            s3.create_bucket(Bucket=BUCKET_NAME)
            print(f"✅ Bucket '{BUCKET_NAME}' criado com sucesso!")
        except Exception as e:
            print(f"❌ Erro crítico ao criar bucket: {e}")

def upload_file_to_s3(file_obj, filename):
    s3 = get_s3_client()
    try:
        s3.upload_fileobj(file_obj, BUCKET_NAME, filename)
        url = f"{ENDPOINT_URL}/{BUCKET_NAME}/{filename}"
        print(f"📤 Upload concluído: {url}")
        return url
    except Exception as e:
        print(f"❌ Erro no upload para o MinIO: {e}")
        return None
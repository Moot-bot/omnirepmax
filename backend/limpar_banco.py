import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def clean_database():
    print("⏳ Conectando ao banco de dados...")
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME')
    
    if not mongo_url or not db_name:
        print("❌ Erro: MONGO_URL ou DB_NAME não configurados no .env")
        return

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    print("🗑️  Limpando coleções operacionais antigas...")
    
    # Coleções que serão apagadas (mantemos 'users' e 'counters')
    collections_to_drop = [
        "representadas", "clientes", "produtos", "pedidos",
        "oportunidades", "visitas", "comissoes", 
        "contas_receber", "contas_pagar",
        "xml_files", "documentos"
    ]

    for col in collections_to_drop:
        try:
            await db[col].drop()
            print(f"   ✅ {col} apagada.")
        except Exception as e:
            print(f"   ⚠️ Erro ao apagar {col}: {e}")

    # Reseta os contadores de numeração de pedidos (para começar do PED-00001)
    try:
        await db.counters.delete_many({"name": "pedidos"})
        print("   🔄 Contador de pedidos resetado.")
    except Exception as e:
        print(f"   ⚠️ Erro ao resetar contador: {e}")

    print("🎉 Banco de dados limpo com sucesso!")
    print("👉 Reinicie o servidor Uvicorn para que o sistema crie as tabelas novas.")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(clean_database())
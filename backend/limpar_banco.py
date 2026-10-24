import asyncio, os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv()

async def clean():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    collections = ["representadas", "clientes", "produtos", "pedidos", "oportunidades", "visitas", "comissoes", "contas_receber", "contas_pagar", "xml_files", "documentos", "faturamentos"]
    for col in collections:
        await db[col].drop()
        print(f"✅ {col} apagada.")
    await db.counters.delete_many({"name": "pedidos"})
    print("🔄 Contador de pedidos resetado.")
    print("🎉 Banco limpo! Reinicie o servidor para rodar o novo seed.")

if __name__ == "__main__":
    asyncio.run(clean())
#!/usr/bin/env python3
"""
Corrige acentos quebrados (ex.: "GestÃ£o" → "Gestão", "ComeÃ§ar" → "Começar") em todos os
arquivos do frontend e padroniza a codificação em UTF-8.

Uso (na pasta do frontend):
    python corrigir_acentos.py            → só mostra o que mudaria
    python corrigir_acentos.py --aplicar  → corrige (guarda cópia em .backup_acentos/)

Causa do problema: arquivos UTF-8 abertos como Windows-1252 por algum editor/ferramenta
e salvos de novo. Cada "ã" vira "Ã£", cada "ç" vira "Ã§" etc.
"""
import re, sys, shutil
from pathlib import Path

PASTAS = ["src", "public"]
EXTENSOES = {".js", ".jsx", ".ts", ".tsx", ".css", ".html", ".json", ".md", ".txt"}
IGNORAR = {"node_modules", "build", ".git", ".backup_acentos"}
MOJIBAKE = re.compile("[ÃÂâ][\u0080-¿‘-›ŒœŠšŸŽžƒˆ˜]")

def consertar_linha(s: str) -> str:
    if not MOJIBAKE.search(s):
        return s
    out = bytearray()
    for ch in s:
        try:
            out += ch.encode("cp1252")
        except UnicodeEncodeError:
            o = ord(ch)
            out += bytes([o]) if o < 256 else ch.encode("utf-8")
    try:
        novo = out.decode("utf-8")
    except UnicodeDecodeError:
        # linha com partes quebradas e partes corretas: conserta trecho a trecho
        return _por_trecho(s)
    return novo if len(MOJIBAKE.findall(novo)) < len(MOJIBAKE.findall(s)) else s

def _por_trecho(s: str) -> str:
    def troca(m):
        try:
            return m.group(0).encode("cp1252").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            return m.group(0)
    return re.sub("(?:[ÃÂâ][\u0080-¿‘-›ŒœŠšŸŽžƒˆ˜]{1,2})+", troca, s)

def main():
    aplicar = "--aplicar" in sys.argv
    raiz = Path(".").resolve()
    alterados, convertidos = [], []
    for pasta in PASTAS:
        base = raiz / pasta
        if not base.exists():
            continue
        for arq in base.rglob("*"):
            if not arq.is_file() or arq.suffix.lower() not in EXTENSOES or any(p in IGNORAR for p in arq.parts):
                continue
            dados = arq.read_bytes()
            try:
                texto = dados.decode("utf-8-sig")
                era_utf8 = not dados.startswith(b"\xef\xbb\xbf")
            except UnicodeDecodeError:
                texto = dados.decode("cp1252", errors="replace")   # arquivo salvo em ANSI/Latin-1
                era_utf8 = False
            linhas = texto.split("\n")
            novas = [consertar_linha(l) for l in linhas]
            mudou = [(i + 1, a, b) for i, (a, b) in enumerate(zip(linhas, novas)) if a != b]
            if not mudou and era_utf8:
                continue
            rel = arq.relative_to(raiz)
            if mudou:
                alterados.append(rel)
                print(f"\n{rel}  ({len(mudou)} linha(s))")
                for n, a, b in mudou[:3]:
                    print(f"   {n}: {a.strip()[:70]}\n   →  {b.strip()[:70]}")
                if len(mudou) > 3:
                    print(f"   … e mais {len(mudou) - 3}")
            if not era_utf8:
                convertidos.append(rel)
            if aplicar:
                destino = raiz / ".backup_acentos" / rel
                destino.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(arq, destino)
                arq.write_text("\n".join(novas), encoding="utf-8", newline="")
    print("\n" + "=" * 60)
    print(f"Arquivos com acentos quebrados: {len(alterados)}")
    print(f"Arquivos que não estavam em UTF-8 (sem BOM): {len(convertidos)}")
    if not aplicar:
        print("\nNada foi alterado. Rode com --aplicar para corrigir.")
    else:
        print("\n✅ Corrigido. Cópias dos originais em .backup_acentos/ (pode apagar depois de conferir).")

if __name__ == "__main__":
    main()

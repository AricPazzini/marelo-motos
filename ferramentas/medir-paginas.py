"""
Descobre em que pagina cada titulo do documento cai.

O campo de sumario do Word nao e preenchido pelo LibreOffice, e nao ha
Word nesta maquina. A saida e montar o sumario com numeros de verdade —
e para isso alguem precisa dizer em que pagina cada titulo esta. Quem
sabe isso e o proprio LibreOffice, que pagina o documento: abrimos o
arquivo, andamos ate cada titulo e perguntamos a pagina.

Grava `sumario.json` ao lado do .docx, que o gerador le na proxima
execucao.

Como rodar:
  "C:\\Program Files\\LibreOffice\\program\\python.exe" ferramentas/medir-paginas.py "arquivo.docx"
"""

import json
import os
import subprocess
import sys
import time
import uno
from com.sun.star.beans import PropertyValue


def como_url(caminho):
    return uno.systemPathToFileUrl(os.path.abspath(caminho))


def propriedade(nome, valor):
    p = PropertyValue()
    p.Name = nome
    p.Value = valor
    return p


def conectar(tentativas=30):
    contexto_local = uno.getComponentContext()
    resolvedor = contexto_local.ServiceManager.createInstanceWithContext(
        "com.sun.star.bridge.UnoUrlResolver", contexto_local)
    endereco = "uno:socket,host=127.0.0.1,port=2002;urp;StarOffice.ComponentContext"
    for tentativa in range(tentativas):
        try:
            return resolvedor.resolve(endereco)
        except Exception:
            if tentativa == 0:
                subprocess.Popen([
                    r"C:\Program Files\LibreOffice\program\soffice.exe",
                    "--headless", "--norestore", "--invisible",
                    "--accept=socket,host=127.0.0.1,port=2002;urp;",
                ])
            time.sleep(1)
    raise RuntimeError("O LibreOffice nao respondeu na porta 2002.")


def medir(entrada):
    contexto = conectar()
    desktop = contexto.ServiceManager.createInstanceWithContext(
        "com.sun.star.frame.Desktop", contexto)

    # precisa de janela (ainda que invisivel) para existir cursor de tela,
    # que e quem sabe o numero da pagina
    documento = desktop.loadComponentFromURL(
        como_url(entrada), "_blank", 0, (propriedade("Hidden", True),))

    try:
        time.sleep(2)  # deixa a paginacao terminar
        cursor = documento.getCurrentController().getViewCursor()
        achados = []

        enumeracao = documento.getText().createEnumeration()
        while enumeracao.hasMoreElements():
            paragrafo = enumeracao.nextElement()
            if not paragrafo.supportsService("com.sun.star.text.Paragraph"):
                continue
            estilo = paragrafo.ParaStyleName
            if not estilo.startswith("Heading"):
                continue
            texto = paragrafo.getString().strip()
            if not texto:
                continue
            cursor.gotoRange(paragrafo.getStart(), False)
            achados.append({
                "nivel": int(estilo.replace("Heading", "").strip() or 1),
                "texto": texto,
                "pagina": cursor.getPage(),
            })

        destino = os.path.join(os.path.dirname(os.path.abspath(entrada)), "sumario.json")
        with open(destino, "w", encoding="utf-8") as arquivo:
            json.dump(achados, arquivo, ensure_ascii=False, indent=1)

        print(f"  {len(achados)} titulos medidos")
        for a in achados[:6]:
            print(f"    p.{a['pagina']:>3}  {'  ' * (a['nivel'] - 1)}{a['texto'][:58]}")
        if len(achados) > 6:
            print(f"    ... e mais {len(achados) - 6}")
        print(f"  Gravado em {destino}")
    finally:
        documento.close(False)


if __name__ == "__main__":
    medir(sys.argv[1])

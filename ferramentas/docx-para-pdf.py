"""
Converte o .docx em PDF ATUALIZANDO o sumario antes de exportar.

O `soffice --convert-to pdf` da linha de comando nao atualiza campos, e
por isso o sumario sai em branco — ele e um campo, preenchido so quando
o editor recalcula. Aqui o documento e aberto pelo LibreOffice de
verdade, os indices sao atualizados e so entao vira PDF.

Como rodar (o Python e o do proprio LibreOffice):
  "C:\\Program Files\\LibreOffice\\program\\python.exe" ferramentas/docx-para-pdf.py "caminho\\arquivo.docx"
"""

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
    """Sobe um LibreOffice invisivel e espera ele aceitar conexao."""
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


def converter(entrada, saida=None):
    saida = saida or os.path.splitext(entrada)[0] + ".pdf"

    contexto = conectar()
    desktop = contexto.ServiceManager.createInstanceWithContext(
        "com.sun.star.frame.Desktop", contexto)

    documento = desktop.loadComponentFromURL(
        como_url(entrada), "_blank", 0, (propriedade("Hidden", True),))

    try:
        # 1. os indices (o sumario e um deles)
        indices = documento.getDocumentIndexes()
        for i in range(indices.getCount()):
            indices.getByIndex(i).update()

        # 2. os demais campos (numero de pagina, referencias cruzadas)
        try:
            documento.getTextFields().refresh()
        except Exception:
            pass

        # o recalculo do layout precisa terminar antes de exportar
        time.sleep(1.5)

        documento.storeToURL(como_url(saida), (
            propriedade("FilterName", "writer_pdf_Export"),
        ))
        print(f"  PDF gerado com o sumario preenchido:\n  {saida}")
        print(f"  Indices atualizados: {indices.getCount()}")
    finally:
        documento.close(False)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("  Informe o arquivo .docx.")
        sys.exit(1)
    converter(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)

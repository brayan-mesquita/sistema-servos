# Especificação de Layout e Cores para Planilhas - Legendários

Este documento especifica a estrutura de dados, paleta de cores e o layout visual oficial da identidade visual dos **Legendários** para a geração de planilhas Excel/CSV de alocação de servos. O objetivo é permitir que outra Inteligência Artificial crie ou formate planilhas idênticas ao design system do portal web.

---

## 1. Identidade Visual (Cores Oficial e Design)

Para que a planilha pareça uma extensão direta do portal web (Premium Dark Mode com detalhes Laranjas), utilize as seguintes definições hexadecimais:

### Paleta de Cores (Hex / RGB)
* **Cor de Destaque / Marca (Laranja):** `#FF5500` (RGB: 255, 85, 0)
  * *Uso:* Cabeçalhos principais, abas ativas, botões de ação e células em destaque.
* **Cor de Fundo Escuro (Carvão/Dark):** `#121212` (RGB: 18, 18, 18)
  * *Uso:* Fundo alternativo para cabeçalhos primários com texto em branco.
* **Cor das Bordas e Linhas de Grade:** `#2A2A2A` (RGB: 42, 42, 42)
  * *Uso:* Linhas de separação e contornos de tabelas.
* **Status Verde (Ativo/Recrutado):** `#10B981` (RGB: 16, 185, 129)
  * *Uso:* Células com status de servo "Recrutado".
* **Status Vermelho (Bloqueado):** `#EF4444` (RGB: 239, 68, 68)
  * *Uso:* Servos com pendências ou marcados como "Bloqueados".
* **Texto Geral Escuro (Modo Claro):** `#1F2937` (RGB: 31, 41, 55)
  * *Uso:* Cor padrão das fontes se a planilha for impressa em papel branco.

---

## 2. Estrutura de Colunas e Dados (Colunas do Banco)

Toda exportação ou importação de servos deve conter, no mínimo, a seguinte estrutura de colunas:

| Nome da Coluna | Tipo de Dado | Descrição | Exemplo de Preenchimento |
| :--- | :--- | :--- | :--- |
| **Nome** | Texto | Nome completo do servo (em Title Case) | João da Silva |
| **Telefone** | Texto / Numérico | Número com DDI 55 (sem símbolos) | 5511999998888 |
| **Email** | Texto | Endereço de e-mail do voluntário | joao@servos.com |
| **Idade** | Inteiro | Idade calculada com base no nascimento | 34 |
| **Opção 1** | Texto | 1ª opção de setor escolhida | Segurança |
| **Opção 2** | Texto | 2ª opção de setor escolhida | ADM |
| **Setor Alocado** | Texto | Setor final de recrutamento | Segurança |
| **Status** | Texto | Situação do servo no recrutamento | Recrutado / Disponível |
| **Bloqueado** | Booleano | Flag se atende aos requisitos | Sim / Não (ou True/False) |
| **Número Legendário**| Texto | Código único do participante | LGND-4521 |
| **Igreja** | Texto | Igreja onde congrega | Presbiteriana Central |
| **Nome Pastor** | Texto | Nome do líder religioso dele | Pastor Roberto |
| **Telefone Pastor** | Texto | Contato do líder religioso | 5511988887777 |
| **Serviu Tops** | Inteiro | Número de desafios que já serviu | 3 |
| **Anotações** | Texto | Observações internas do coordenador | Possui carro próprio e rádio. |

---

## 3. Estrutura de Divisão por Abas (Abas por Setores)

A planilha de alocação de servos deve ser estruturada com **Abas Separadas (Tabs)** para cada um dos 9 setores oficiais, além de uma aba de **Visão Geral (Dashboard)**.

### Abas a serem criadas:
1. **Geral / Dashboard** (Gráficos e contagem de vagas preenchidas de cada setor).
2. **Eventos**
3. **Segurança**
4. **Logística**
5. **DIP**
6. **ADM**
7. **Hakunas**
8. **Mídia**
9. **QAP**
10. **Comunicação**

---

## 4. Script Python Exemplo (Para outra IA gerar a planilha)

Caso queira que outra IA escreva um script para exportar o banco de dados PostgreSQL do EasyPanel diretamente para este formato estilizado Excel (.xlsx) usando Python e a biblioteca `openpyxl`, forneça este código:

```python
import pandas as pd
from openpyxl import Workbook
from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def create_styled_excel(data_volunteers, output_path):
    wb = Workbook()
    
    # Define estilos oficiais dos Legendários
    fill_header = PatternFill(start_color="121212", end_color="121212", fill_type="solid") # Dark Charcoal
    fill_orange = PatternFill(start_color="FF5500", end_color="FF5500", fill_type="solid") # Orange Accent
    fill_green = PatternFill(start_color="D1FAE5", end_color="D1FAE5", fill_type="solid")  # Light green for Recruited
    fill_zebra = PatternFill(start_color="F9FAFB", end_color="F9FAFB", fill_type="solid")  # Zebra alternate
    
    font_header = Font(name="Arial", size=11, bold=True, color="FFFFFF")
    font_bold = Font(name="Arial", size=10, bold=True, color="000000")
    font_normal = Font(name="Arial", size=10, color="000000")
    
    align_center = Alignment(horizontal="center", vertical="center")
    align_left = Alignment(horizontal="left", vertical="center")
    
    thin_border = Border(
        left=Side(style='thin', color='E5E7EB'),
        right=Side(style='thin', color='E5E7EB'),
        top=Side(style='thin', color='E5E7EB'),
        bottom=Side(style='thin', color='E5E7EB')
    )

    # 1. ABA GERAL: Todos os servos ativos
    ws_general = wb.active
    ws_general.title = "Geral"
    
    # Setores oficiais para criar abas
    setores = ['Eventos', 'Segurança', 'Logística', 'DIP', 'ADM', 'Hakunas', 'Mídia', 'QAP', 'Comunicação']
    
    # Criar abas para cada setor
    for setor in setores:
        ws = wb.create_sheet(title=setor)
        
        # Filtrar servos alocados neste setor
        df_sector = data_volunteers[data_volunteers['Setor Alocado'] == setor]
        
        # Cabeçalhos
        headers = ["Nome", "Telefone", "Opção 1", "Opção 2", "Número Legendário", "Status", "Serviu Tops", "Anotações"]
        ws.append(headers)
        
        # Estilizar cabeçalho (Fundo laranja, texto branco)
        for col in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col)
            cell.fill = fill_orange
            cell.font = font_header
            cell.alignment = align_center
            cell.border = thin_border
            
        # Inserir dados e aplicar estilo zebra + bordas
        for row_idx, row_data in enumerate(df_sector[headers].values, start=2):
            for col_idx, value in enumerate(row_data, start=1):
                cell = ws.cell(row=row_idx, column=col_idx, value=value)
                cell.font = font_normal
                cell.border = thin_border
                
                # Zebra striping
                if row_idx % 2 == 0:
                    cell.fill = fill_zebra
                
                # Alinhamento
                if col_idx in [2, 5, 6, 7]: # Telefone, Num LGND, Status, Tops
                    cell.alignment = align_center
                else:
                    cell.alignment = align_left
                    
                # Destacar status Recrutado com verde sutil
                if col_idx == 6 and value == "Recruited":
                    cell.fill = fill_green
                    cell.font = font_bold
        
        # Ajuste automático de largura de colunas
        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 4, 12)
            
    wb.save(output_path)
```

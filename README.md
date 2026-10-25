# Controle Financeiro

App web simples para controle financeiro pessoal. Funciona no celular e no computador.

## O que faz

- Lançar entradas e saídas (data, descrição, categoria, valor)
- Resumo do mês: total de entradas, saídas e saldo
- Gráficos: gastos por categoria e entradas x saídas dos últimos 6 meses
- Baixar planilha para o Excel (CSV)
- Backup e restauração dos dados (arquivo .json)

## Onde ficam os dados

Os dados ficam salvos **no navegador do aparelho** (localStorage). Nada é enviado para a internet.
Por isso, cada aparelho tem os seus próprios dados. Para levar os dados para outro aparelho,
use **Fazer backup** em um e **Restaurar backup** no outro.

## Como rodar

Basta abrir o `index.html` no navegador. Não precisa instalar nada.

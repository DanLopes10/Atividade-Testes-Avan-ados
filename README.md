# Relatório - Atividade Prática: Testes Avançados e SQA

## Registro de Anomalias (Caixa Preta)

| Cenário | Esperado | Obtido na versão original |
| :--- | :--- | :--- |
| 10 dias | 5% de desconto | 10% de desconto |
| dias = -5 | HTTP 400 | HTTP 200 com valores negativos |
| dias = 2.5 ou "5" | HTTP 400 | HTTP 200 |
| diária ausente | HTTP 400 | HTTP 200 com resultado NaN |
| diária = "abc" | HTTP 400 | HTTP 200 com resultado NaN |
| cupom em reserva menor que R$ 50 (ex.: 1 dia a R$ 50 com 5% de desconto aplicável) | total mínimo 0 | total negativo |

## Bugs corrigidos em `src/app.ts`

1. **Bug do 10º dia:** a condição `dias > 3 && dias < 10` foi substituída por faixas `dias <= 3`, `dias <= 10` e acima disso, alinhadas à especificação.
2. **Valores negativos e tipagem de dias:** `!dias` foi substituído por validação de tipo `number`, inteiro e no intervalo de 1 a 30.
3. **Total negativo com cupom:** o total passa por `Math.max(0, ...)`.
4. **Diária ausente ou string:** a validação exige `typeof number`, finito e maior ou igual a 50. Comparações com `undefined` e `NaN` retornavam `false` e deixavam a requisição passar.

Também foi adicionado arredondamento em 2 casas decimais para evitar erros de ponto flutuante.

## Análise de Cobertura

Execute `npm run test:coverage` e abra `coverage/lcov-report/index.html`. Com a suíte de caixa preta mais os testes de caixa branca, todos os ramos de `app.ts` (validação de dias, validação de diária, três faixas de desconto, cupom válido, cupom inválido ou ausente e clamp do total) são exercitados, superando a meta de 85% de branches e linhas.

Linhas em vermelho indicam código nunca executado; em amarelo, branches (como o `else` de um `if`) em que apenas um dos lados foi percorrido.

## Respostas Conceituais

**1. O dilema da cobertura de código.** Não. Cobertura de linhas mede apenas se uma linha foi executada, não se o resultado foi verificado nem se todas as combinações de requisitos foram testadas. Na versão original, um teste com 5 dias e outro com 12 dias executavam todas as linhas do bloco de desconto, mas o bug do 10º dia só aparece ao testar exatamente o valor limite. Do mesmo modo, `!dias` era executada por qualquer teste, porém dias negativos passavam sem serem detectados. Cobertura mostra o que não foi testado; não prova a ausência de defeitos.

**2. Estratégias de integração.**
- A abordagem com `supertest` se encaixa na camada de testes de integração da pirâmide (meio), acima dos testes unitários com mocks, pois exercita rota, middleware (`express.json`) e lógica juntos, e abaixo dos testes end-to-end, por não usar rede real nem interface.
- A principal vantagem sobre o Big Bang é a integração incremental: falhas são detectadas cedo e localizadas no componente recém-integrado, em vez de surgirem todas de uma vez, com causa difícil de isolar.

**3. Caixa preta vs. caixa branca.**
- Divergências de regras de negócio: a caixa preta foi mais eficaz, pois parte da especificação e dos valores limites (como o 10º dia) sem ser influenciada pela implementação.
- Caminhos mortos e condições mal formuladas: a caixa branca foi mais eficaz, pois o relatório de cobertura e a leitura do código expõem ramos não executados e condições como `dias > 3 && dias < 10`, além do `!dias` que mascara valores negativos.

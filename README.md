# cognicao

**Bateria FE**: testes de função executiva e memória de trabalho que rodam no navegador, no celular ou no computador.

Página: https://agamemnon140.github.io/cognicao/

## Módulos

| Módulo | Domínio | Índice primário | Tempo |
|---|---|---|---|
| Flanker (setas) | Controle atencional | Efeito de congruência em RT | ≈ 4 min |
| Stroop (cores) | Controle atencional | Efeito de interferência em RT | ≈ 4 min |
| Go/No-Go | Inibição de resposta | Taxa de comissões | ≈ 3 min |
| 2-back (letras) | Atualização | d′ | ≈ 3 min |
| 3-back (letras) | Atualização, carga alta | d′ e d′ contra iscas | ≈ 8 min |
| Span de dígitos inverso | Memória de trabalho | Maior span correto | ≈ 3 min |
| Alternância de tarefa | Flexibilidade | Custo de troca em RT | ≈ 5 min |

A bateria completa leva ≈ 35–40 min. Dá para marcar só alguns módulos; o atalho "só memória de trabalho" marca 2-back, 3-back e span (≈ 15 min).

## O 3-back

Existe porque o 2-back satura: 100% de acertos sem falso alarme não distingue nada acima daquele nível.

- 3 blocos de 40 ensaios pontuados, cada um precedido de 3 letras de entrada: 36 alvos, 12 iscas de 2-back, 12 iscas de 4-back e 60 não-alvos, sempre nessas contagens.
- As iscas são letras iguais à de 2 ou de 4 posições atrás. Quem responde por familiaridade cai nelas; o **d′ contra iscas** mede isso separado do d′ global.
- O teto é conhecido (d′ máximo ≈ 4,73) e a sessão que o atinge é marcada como tal.
- O custo de carga (d′ do 2-back menos d′ do 3-back) só é calculado quando nenhuma das duas sessões está no teto.

## Dados

Nada é enviado a servidor. A sessão completa existe só na aba aberta, até você baixar o JSON ou o CSV; o navegador guarda apenas o resumo de cada sessão (`localStorage`), para as normas locais.

## Limites

Não é teste clínico e não tem normas populacionais. A aba Protocolo da página descreve administração, escores, comparação com baterias amplas e limitações, com as referências.

## Desenvolvimento

Arquivo único (`index.html`), sem build e sem dependências.

```sh
node scripts/verificar.cjs   # gerador e escore do 3-back, sem navegador
```

Para testes automatizados no navegador, `window.FE_FAST = true` antes de iniciar encurta ensaios e janelas, e `window.__FE.onTrial` recebe cada ensaio com a resposta correta.

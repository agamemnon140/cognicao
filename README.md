# cognicao

**Bateria cognitiva**: testes que rodam no navegador, no celular ou no computador, em duas sessões independentes.

Página: https://agamemnon140.github.io/cognicao/

## Sessão A · função executiva e memória de trabalho (≈ 35–40 min)

| Módulo | Domínio | Índice primário | Tempo |
|---|---|---|---|
| Flanker (setas) | Controle atencional | Efeito de congruência em RT | ≈ 4 min |
| Stroop (cores) | Controle atencional | Efeito de interferência em RT | ≈ 4 min |
| Go/No-Go | Inibição de resposta | Taxa de comissões | ≈ 3 min |
| 2-back (letras) | Atualização | d′ | ≈ 3 min |
| 3-back (letras) | Atualização, carga alta | d′ e d′ contra iscas | ≈ 8 min |
| Span de dígitos inverso | Memória de trabalho | Maior span correto | ≈ 3 min |
| Alternância de tarefa | Flexibilidade | Custo de troca em RT | ≈ 5 min |

O atalho "só memória de trabalho" marca 2-back, 3-back e span (≈ 15 min).

### O 3-back

Existe porque o 2-back satura: 100% de acertos sem falso alarme não distingue nada acima daquele nível.

- 3 blocos de 40 ensaios pontuados, cada um precedido de 3 letras de entrada: 36 alvos, 12 iscas de 2-back, 12 iscas de 4-back e 60 não-alvos, sempre nessas contagens.
- As iscas são letras iguais à de 2 ou de 4 posições atrás. Quem responde por familiaridade cai nelas; o **d′ contra iscas** mede isso separado do d′ global.
- O teto é conhecido (d′ máximo ≈ 4,73) e a sessão que o atinge é marcada como tal.
- O custo de carga (d′ do 2-back menos d′ do 3-back) só é calculado quando nenhuma das duas sessões está no teto.

## Sessão B · raciocínio e espaço (≈ 40 min)

| Módulo | Habilidade | Escore | Tempo |
|---|---|---|---|
| Matrizes | Raciocínio fluido, indução | Nível estimado | ≈ 18 min |
| Séries de números e letras | Raciocínio fluido, sequências | Nível estimado | ≈ 8 min |
| Dobradura de papel | Visuoespacial, visualização | Nível estimado | ≈ 8 min |
| Rotação mental 3D | Visuoespacial, rotação | Acurácia e ms por grau | ≈ 7 min |

- **Itens gerados por código** a partir da semente da sessão: não se repetem no reteste. `?seed=N` na URL reproduz uma forma.
- **Resposta construída** nas três tarefas de nível: monta-se a figura que falta, digita-se o próximo termo, marcam-se as casas furadas. Sem alternativas não há acerto por chute nem por eliminação.
- **Escada adaptativa** de 8 níveis, com passo 2 até o primeiro erro. O escore é o nível em que a pessoa acertaria metade dos itens, com IC95; quando o intervalo encosta no limite da escala, a sessão é marcada como teto.
- **Matrizes**: níveis 1–6 com uma a cinco regras sobre forma, cor, tamanho, moldura e ponto; níveis 7–8 com XOR, E e OU.
- **Séries**: um resolvedor descarta o item se alguma hipótese que explica os termos mostrados previr outro próximo termo.
- **Rotação 3D**: figuras quirais de 10 cubos, par igual ou espelhado, a 40°, 80°, 120° ou 160°.

## Dados

Nada é enviado a servidor. A sessão completa existe só na aba aberta, até você baixar o JSON ou o CSV; o navegador guarda apenas o resumo de cada sessão (`localStorage`), para as normas locais.

## Limites

Não é teste clínico e não tem normas populacionais. Na sessão B, a ordem de dificuldade dos níveis vem do desenho dos itens, não de calibração com dados, e a escala não se converte em QI. A aba Protocolo da página descreve administração, escores e limitações, com as referências.

## Desenvolvimento

Arquivo único (`index.html`), sem build e sem dependências.

```sh
node scripts/verificar.cjs         # gerador e escore do 3-back
node scripts/verificar-fase1.cjs   # geradores e escore da sessão B (--rapido para uma passada curta)
```

Os dois rodam sem navegador. `verificar-fase1.cjs` confere cada gerador por um caminho independente do que a página usa: regras das matrizes relidas das células, séries resolvidas só pelos termos mostrados, furos da dobradura recalculados dobrando casa por casa, quiralidade das figuras por outra enumeração de rotações, e a escada com sujeitos simulados.

Para testes automatizados no navegador, `window.FE_FAST = true` antes de iniciar encurta ensaios e janelas, e `window.__FE.onTrial` recebe cada ensaio com a resposta correta.

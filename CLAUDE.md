# CLAUDE.md

Este arquivo dá contexto ao Claude Code sobre o projeto. Mantenha atualizado conforme o projeto evoluir.

> **Esta é a branch `scan-only`.** É uma variante reduzida do V-Dex, sem MongoDB nem conta de
> usuário: só o escaneamento de cartas, com voz e "Pergunte à Pokédex", tudo buscado e traduzido
> ao vivo a cada requisição (sem cache). Não existem `auth.js`, `models/`, nem as rotas/páginas de
> login, capturas, mini-jogos ou pet virtual que a branch `main` tem — foram removidas de
> propósito, não é um esquecimento. Antes de tentar usar algo relacionado a usuário/banco nessa
> branch, confira se a funcionalidade não foi uma dessas removidas.

## Visão geral do projeto

Pokedex web, **mobile-first**, que consome a PokeAPI e permite ao usuário apontar a câmera do celular
para uma carta física de Pokémon e receber as informações do Pokémon identificado.

## Stack

- **Frontend + Backend**: Next.js (App Router), tudo em um projeto único.
  - Não usar `react-router-dom` — o roteamento é feito pelo próprio Next.js (pasta `app/`).
- **Banco de dados**: MongoDB, via Mongoose.
- **Dados de Pokémon**: [PokeAPI](https://pokeapi.co/) (pública, sem autenticação, respeitar rate limit).
- **Reconhecimento de carta**: Google Gemini API (`@google/genai`, modelo com visão, ex. `gemini-flash-lite-latest`)
  chamada **somente pelo backend** — a API key nunca deve ser exposta no client. Escolhido por ter tier
  gratuito sem exigir cartão de crédito/saldo pré-pago (diferente da OpenAI).
- **Voz da Pokédex (texto-pra-voz)**: [Fish Audio](https://fish.audio) (modelo `s2.1-pro-free`, voz customizada
  escolhida pelo usuário via `FISH_AUDIO_VOICE_ID`), chamada só pelo backend (`app/api/speak`). Fallback pro
  Gemini TTS (`lib/gemini.js`) se o Fish Audio falhar — o tier gratuito do Fish Audio é promocional e pode
  expirar a qualquer momento sem aviso.
- **Autenticação**: [Auth.js v5](https://authjs.dev) (`next-auth@beta`) com provider Credentials (login/senha
  próprios, sem OAuth), sessão via JWT em cookie (sem adapter de banco pra sessão). Senha nunca em texto puro —
  hash com `bcryptjs` (`models/User.js` guarda só `passwordHash`). Configuração central em `auth.js` na raiz.

## Arquitetura do fluxo de scan

1. Client captura foto da carta (`<input type="file" accept="image/*" capture="environment">` ou `react-webcam`).
2. Client envia a imagem (base64) para `POST /api/scan-card`.
3. Backend chama o Gemini pedindo o nome do Pokémon identificado na imagem (JSON schema estruturado).
4. Backend verifica cache no MongoDB (hash da imagem ou nome já consultado); se não existir, busca na PokeAPI.
5. Backend salva no MongoDB: cache do Pokémon, histórico de scan do usuário.
6. Resposta formatada volta pro client, que renderiza a tela de resultado.

## Estrutura de pastas (sugerida)

```
app/
  api/
    scan-card/route.js       # recebe imagem, chama o Gemini, retorna nome do Pokémon
    pokemon/[name]/route.js  # busca na PokeAPI com cache no Mongo
  pokedex/page.js             # lista/grid de Pokémon
  scan/page.js                 # tela de captura de câmera
  pokemon/[name]/page.js      # tela de detalhe do Pokémon
lib/
  mongodb.js                   # conexão com o Mongo (singleton)
  pokeapi.js                   # funções de consulta à PokeAPI
  gemini.js                    # client do Gemini configurado (visão + TTS fallback)
  fish.js                      # client do Fish Audio (voz da Pokédex, TTS principal)
models/
  Pokemon.js                   # schema de cache
  ScanHistory.js                # schema de histórico do usuário
  User.js                       # schema de usuário (login, email, passwordHash, createdAt)
auth.js                         # config do Auth.js (raiz do projeto)
```

## Variáveis de ambiente

```
MONGODB_URI=
GEMINI_API_KEY=
FISH_AUDIO_API_KEY=
FISH_AUDIO_VOICE_ID=
AUTH_SECRET=
ADMIN_SEED_SECRET=  # opcional — só necessária pra usar POST /api/admin/seed-dex
```

Nunca commitar `.env.local`. Sempre usar `process.env` só em código de servidor (API routes, `lib/`).

**Vercel**: depois de adicionar/editar uma env var no painel, é preciso **forçar um novo deploy** (não
basta salvar) — funções serverless já "mornas" continuam com o `process.env` antigo em memória
indefinidamente, causando comportamento inconsistente (algumas requisições com a chave, outras sem, de
forma aparentemente aleatória) até que um novo deploy substitua todas as instâncias de uma vez.

## Convenções

- Componentes de UI: mobile-first por padrão; testar sempre em viewport estreita antes de expandir pra desktop.
- Toda chamada ao Gemini e à PokeAPI acontece no backend (API routes), nunca direto do client.
- Nomes de Pokémon retornados do Gemini devem ser normalizados (lowercase, sem acentos) antes de consultar a PokeAPI, que espera o nome em inglês minúsculo.
- Cachear no MongoDB toda resposta da PokeAPI já consultada, evitando bater na API externa repetidamente.
- Limitar (rate limit) o endpoint `/api/scan-card` por usuário/IP — mesmo no tier gratuito do Gemini, há limite de requisições por dia.
- Se o Gemini retornar baixa confiança ou não identificar o Pokémon, o backend deve responder com um estado claro de "não identificado", nunca inventar um resultado.

## Comandos úteis

```
npm run dev       # ambiente de desenvolvimento
npm run build     # build de produção
npm run lint      # lint do projeto
```

## Melhorias futuras

- **Girar a sprite do Pokémon (flip 2D frente/costas)**: hoje as sprites são todas 2D (PNG estático,
  arte oficial, ou GIF animado só de idle) — não existe modelo 3D via PokeAPI. A ideia mais viável é um
  flip em CSS (`rotateY`) trocando entre a sprite de frente já usada e a sprite de costas que a PokeAPI
  também fornece (`sprites.back_default` — ainda não é buscada/guardada em `lib/pokeapi.js` nem no schema
  de `models/Pokemon.js`, precisaria adicionar). Dá a sensação de "virar" o Pokémon ao tocar na sprite,
  mas é uma troca entre duas imagens fixas, não uma rotação 3D contínua.
- **Modelos 3D reais (avaliado e descartado por enquanto)**: o repositório
  [PokeMiners/pogo_assets](https://github.com/PokeMiners/pogo_assets) tem modelos 3D reais (`.fbx`
  rigado + texturas PNG) minerados do Pokémon GO, um por Pokémon/forma. Dois motivos pra não usar:
  (1) legal — o próprio README do repo diz que o conteúdo é "somente para uso educacional", risco maior
  que o do sprite repo da PokeAPI que já usamos; (2) técnico — exigiria Three.js/WebGL + loader de FBX,
  arquivos de alguns MB cada (multiplicado por 900+ Pokémon), sem CDN público pronto pra isso, incompatível
  com a prioridade mobile-first/leve do projeto.

## O que evitar

- Não usar `react-router-dom` junto com o roteamento do Next.js.
- Não expor `GEMINI_API_KEY`, `FISH_AUDIO_API_KEY`, `MONGODB_URI` nem `AUTH_SECRET` no bundle do client.
- Nunca salvar senha em texto puro — sempre hash com `bcryptjs` antes de gravar em `User.passwordHash`.
- Não fazer chamadas diretas à PokeAPI a partir do componente React sem passar pelo backend/cache.
- Não usar `localStorage`/`sessionStorage` em componentes que rodem em ambientes que não suportam (ex. previews/artifacts) — usar estado em memória ou o MongoDB via API.

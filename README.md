# V-Dex (scan-only)

<p align="center">
  <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" width="56" alt="Pokébola" />
  <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png" width="150" alt="Pikachu" />
  <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" width="56" alt="Pokébola" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
</p>

> Esta é a variante **scan-only** do V-Dex: só o essencial de escanear uma carta física de Pokémon
> e ver as informações dela, com voz e sem precisar de banco de dados. Pra a versão completa (com
> conta, histórico de capturas, mini-jogos e pet virtual), veja a branch
> [`main`](https://github.com/BrenoMendonca/v-dex/tree/main).

## <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" width="20" valign="middle" alt="" /> Sumário

- [Por que essa variante existe](#por-que-essa-variante-existe)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Pré-requisitos](#pré-requisitos)
- [Instalando e rodando](#instalando-e-rodando)
- [Fazendo o deploy (Vercel)](#fazendo-o-deploy-vercel)
- [Scripts disponíveis](#scripts-disponíveis)
- [Aviso sobre custos](#aviso-sobre-custos)
- [Autor](#autor)

## <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" width="20" valign="middle" alt="" /> Por que essa variante existe

A versão completa do V-Dex precisa de um MongoDB pra guardar contas, histórico de capturas,
mini-jogos e o pet virtual. Essa variante existe pra quem só quer experimentar o escaneamento sem
configurar banco nenhum: a única chave obrigatória é a do Google Gemini.

A troca: sem banco não tem onde guardar o resultado de um Pokémon já buscado antes, então cada
escaneamento busca e traduz tudo de novo, ao vivo, mesmo repetindo o mesmo Pokémon. Fica mais lento
e consome mais cota gratuita do Gemini por scan, mas em compensação não precisa de nenhuma conta de
banco de dados pra rodar.

## <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" width="20" valign="middle" alt="" /> Funcionalidades

- **Escaneamento de cartas**: tira uma foto de uma carta física e identifica o Pokémon via Google
  Gemini (visão computacional), buscando os dados na PokeAPI e traduzindo automaticamente.
- **Voz da Pokédex**: ouça a descrição de qualquer Pokémon, com onboarding narrado na primeira vez.
- **Pergunte à Pokédex**: pergunte qualquer coisa sobre um Pokémon, por texto ou áudio, e receba
  uma resposta falada.
- **Navegação por evolução**: toque numa evolução ou outra forma do Pokémon escaneado pra ver os
  dados dela na hora, sem escanear de novo.

Sem login, sem histórico de capturas, sem mini-jogos e sem pet virtual (isso tudo depende de conta
de usuário, que por sua vez depende de banco de dados).

## <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" width="20" valign="middle" alt="" /> Tecnologias

- **Frontend e Backend**: Next.js (App Router)
- **Dados de Pokémon**: [PokeAPI](https://pokeapi.co) (pública, sem chave)
- **Reconhecimento de carta e tradução**: [Google Gemini](https://ai.google.dev)
- **Voz da Pokédex**: [Fish Audio](https://fish.audio) (opcional, com fallback pro Gemini)

## <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" width="20" valign="middle" alt="" /> Pré-requisitos

> Este guia foi escrito pensando em qualquer nível de experiência. Se você nunca configurou uma
> variável de ambiente antes, não se preocupe: cada passo abaixo explica exatamente onde clicar.

Antes de começar, verifique se você tem:

- [Node.js](https://nodejs.org) 20 ou mais recente instalado
- Uma conta gratuita no [Google AI Studio](https://aistudio.google.com/apikey) (passo a passo na
  próxima seção)

## <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" width="20" valign="middle" alt="" /> Instalando e rodando

### 1. Clone e instale as dependências

```bash
git clone -b scan-only https://github.com/BrenoMendonca/v-dex.git
cd v-dex
npm install
```

### 2. Configure as variáveis de ambiente

> **O que é isso?** Um arquivo `.env` guarda configurações e chaves secretas fora do código. O
> código lê o valor de `process.env.NOME_DA_VARIAVEL`, e cada pessoa que roda o projeto preenche
> seu próprio arquivo local com as próprias chaves. Por isso o `.env.local` nunca é enviado pro
> GitHub (ele está no `.gitignore`). O `.env.example` é só um modelo com os nomes vazios.

Copie o arquivo de exemplo:

```bash
cp .env.example .env.local
```

Depois preencha cada variável seguindo o passo a passo abaixo. Nunca commite o `.env.local`.

| Variável | Obrigatória? | Pra que serve |
|---|---|---|
| `GEMINI_API_KEY` | Sim | Chave do Google Gemini, usada pra identificar o Pokémon na foto da carta e traduzir os textos da Pokédex. |
| `FISH_AUDIO_API_KEY` | Não | Chave da Fish Audio, dá uma voz mais natural à Pokédex. Sem ela, o app usa a voz do Gemini. |
| `FISH_AUDIO_VOICE_ID` | Não | Qual voz da Fish Audio usar. Só faz sentido junto com a chave acima. |
| `ALLOWED_DEV_ORIGIN` | Não | Libera acesso ao `npm run dev` a partir de outro aparelho na sua rede local (ex: testar no celular). |

<details>
<summary><code>GEMINI_API_KEY</code> (obrigatória)</summary>

1. Acesse [Google AI Studio](https://aistudio.google.com/apikey) e faça login com uma conta Google.
2. Clique em **Create API key**.
3. Copie a chave gerada. O tier gratuito não exige cartão de crédito.

</details>

<details>
<summary><code>FISH_AUDIO_API_KEY</code> e <code>FISH_AUDIO_VOICE_ID</code> (opcionais)</summary>

Dão à Pokédex uma voz mais natural. Sem essas duas variáveis, o app usa automaticamente a voz do
Gemini como alternativa; a aplicação funciona igual, só muda a voz.

1. Crie uma conta em [fish.audio](https://fish.audio).
2. Gere uma API key nas configurações da conta (`FISH_AUDIO_API_KEY`).
3. Escolha uma voz na biblioteca pública do site (ou clone a sua própria) e copie o ID de
   referência dela (`FISH_AUDIO_VOICE_ID`).

O tier gratuito do Fish Audio é promocional e pode expirar a qualquer momento sem aviso. Por isso
o fallback automático pro Gemini existe.

</details>

<details>
<summary><code>ALLOWED_DEV_ORIGIN</code> (opcional)</summary>

Só necessária se você quiser testar em outro aparelho na mesma rede local durante o
desenvolvimento (ex: abrir o app no celular apontando pro IP do seu computador). Coloque esse IP
aqui. Sem essa variável, `npm run dev` funciona normalmente em `localhost`.

</details>

### 3. Rode o servidor de desenvolvimento

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" width="20" valign="middle" alt="" /> Fazendo o deploy (Vercel)

Depois de rodar localmente, dá pra colocar sua própria versão no ar de graça usando a
[Vercel](https://vercel.com) (a empresa por trás do Next.js). Não é preciso saber nada de servidor
pra isso.

### Deploy em um clique

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/BrenoMendonca/v-dex/tree/scan-only&env=GEMINI_API_KEY&envDescription=Veja%20como%20conseguir%20a%20chave%20na%20se%C3%A7%C3%A3o%20%22Instalando%20e%20rodando%22%20do%20README&envLink=https://github.com/BrenoMendonca/v-dex/tree/scan-only%23instalando-e-rodando)

Clique no botão, entre com sua conta do GitHub e preencha `GEMINI_API_KEY` quando a Vercel pedir.

### Passo a passo manual

1. Suba seu próprio fork ou cópia desta branch pro seu GitHub.
2. Acesse [vercel.com](https://vercel.com) e crie uma conta gratuita (dá pra entrar direto com o
   GitHub, sem precisar de cartão de crédito).
3. Clique em **Add New**, depois **Project**, e selecione o repositório (escolha a branch
   `scan-only` na configuração de deploy).
4. Na tela de configuração, abra **Environment Variables** e adicione `GEMINI_API_KEY` (e as
   opcionais, se quiser).
5. Clique em **Deploy** e espere o build terminar. Ao final, a Vercel te dá um link público pra
   acessar o app.

Como não há banco de dados nessa variante, não existe o problema de liberar IP de rede que a
versão completa tem. Só um detalhe continua valendo: **mudou uma variável de ambiente depois do
primeiro deploy? Force um novo deploy** em **Deployments → Redeploy**, senão algumas requisições
continuam usando o valor antigo por um tempo.

## <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" width="20" valign="middle" alt="" /> Scripts disponíveis

```bash
npm run dev       # ambiente de desenvolvimento
npm run build     # build de produção
npm run start     # roda o build de produção
npm run lint      # lint do projeto
```

## <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" width="20" valign="middle" alt="" /> Aviso sobre custos

Sem cache, cada escaneamento (mesmo de um Pokémon repetido) busca e traduz tudo de novo via
Gemini. O tier gratuito aguenta um uso pessoal tranquilo, mas se você expuser sua própria instância
publicamente, é uma boa prática adicionar autenticação ou limite de requisições nas rotas de API
antes de divulgar o link, pra evitar que outra pessoa consuma sua cota gratuita rapidamente.

## <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" width="20" valign="middle" alt="" /> Autor

<p align="left">
  <img src="public/Images/breno-mendonca-autor.jpeg" width="140" alt="Foto de Breno Mendonça" />
</p>

Feito por **Breno Mendonça**.

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/breno-mendon%C3%A7a-305338143/)

---

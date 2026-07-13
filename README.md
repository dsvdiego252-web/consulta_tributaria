# Agente Tributário SP — Consulta Online

Esta versão não fica limitada à base local. Toda consulta é enviada ao endpoint `/api/consulta`, que usa a OpenAI Responses API com pesquisa na web. A base `data.js` funciona apenas como contexto complementar e é conferida novamente na internet.

## Estrutura do projeto

Envie todos estes arquivos e pastas para a raiz do repositório:

- `index.html`
- `styles.css`
- `app.js`
- `data.js`
- `manifest.webmanifest`
- `service-worker.js`
- `vercel.json`
- pasta `api`
  - `consulta.js`
- pasta `icons`
  - `icon-192.png`
  - `icon-512.png`

## Importante

Esta versão precisa ser publicada na **Vercel**. O GitHub pode continuar sendo usado como repositório, mas o GitHub Pages sozinho não executa o arquivo `api/consulta.js`.

## Configurar na Vercel

1. Abra o projeto na Vercel.
2. Entre em **Settings > Environment Variables**.
3. Crie a variável:
   - Nome: `OPENAI_API_KEY`
   - Valor: sua chave da API da OpenAI.
4. Recomendado: crie também:
   - Nome: `APP_ACCESS_CODE`
   - Valor: um código particular escolhido por você.
5. Opcionalmente, crie:
   - Nome: `OPENAI_MODEL`
   - Valor: `gpt-5.6`
6. Marque os ambientes Production, Preview e Development, conforme desejar.
7. Faça um novo deploy.

A chave `OPENAI_API_KEY` nunca deve ser escrita no HTML, no JavaScript do navegador ou enviada ao GitHub.

## Código de acesso

Se você criou `APP_ACCESS_CODE` na Vercel:

1. Abra o aplicativo publicado.
2. Clique em **Configuração**.
3. Digite o mesmo código.
4. Clique em **Salvar configuração**.

Esse código evita que uma pessoa que encontre o endereço do site use livremente o saldo da sua API. Ele não substitui autenticação completa, mas reduz o uso casual não autorizado.

## Cobrança da API

A assinatura do ChatGPT e a plataforma de API possuem cobranças separadas. Para o endpoint funcionar, a conta da API precisa ter faturamento ou créditos disponíveis.

## Como a consulta funciona

1. O usuário informa produto ou NCM, data, finalidade e origem.
2. O sistema procura um possível registro na base local.
3. O endpoint envia a consulta e o eventual registro local para a IA.
4. A IA pesquisa a web e prioriza legislação e páginas oficiais.
5. O aplicativo mostra o parecer, as citações e os links das fontes.
6. Se a API estiver indisponível e houver registro local, ele é exibido apenas como resultado não reconfirmado.

## Segurança

- A chave da OpenAI fica somente no servidor da Vercel.
- As respostas da API não são armazenadas pelo service worker.
- O endpoint limita o tamanho da consulta.
- A resposta não deve ser usada sem conferência profissional da legislação, descrição, composição, embalagem e vigência.

# Agente Tributário SP

Aplicativo HTML/PWA para consultas tributárias de produtos de supermercado no Estado de São Paulo.

## Arquivos para subir no GitHub

Suba todos os arquivos e pastas mantendo esta estrutura:

- `index.html`
- `styles.css`
- `data.js`
- `app.js`
- `manifest.webmanifest`
- `service-worker.js`
- pasta `icons`
  - `icon-192.png`
  - `icon-512.png`

## Publicar no GitHub Pages

1. Crie um repositório público.
2. Envie todos os arquivos para a raiz do repositório.
3. Abra **Settings > Pages**.
4. Em **Build and deployment**, escolha **Deploy from a branch**.
5. Selecione a branch `main` e a pasta `/root`.
6. Salve e aguarde o link do GitHub Pages.

## Instalar no celular

A instalação PWA funciona quando o site está publicado em HTTPS, como GitHub Pages, Vercel ou Netlify. Abrir o `index.html` diretamente no gerenciador de arquivos não ativa o service worker.

No Chrome Android, abra o endereço publicado e use o botão **Instalar** do aplicativo ou o menu do Chrome > **Adicionar à tela inicial / Instalar app**.

## Atualizar a base

Os registros principais ficam no arquivo `data.js`. Também é possível abrir **Base** no aplicativo, editar o JSON e salvar localmente no navegador. As alterações locais não modificam o arquivo no GitHub.

## Limites

A ferramenta é uma base de apoio. NCM, descrição legal, composição, embalagem, CEST, origem/destino, regime e data devem ser confirmados antes de qualquer parametrização definitiva.

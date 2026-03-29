# Mesosphere Docs

This Documentation is built using [Docusaurus 3](https://docusaurus.io/).

## Local Development

If you want to contribute to the documentation, you can run the following commands to start the local development server:

```bash
npm install
npm run start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

You can also run a spellcheck test using the following command:

```bash
npm run test
```

You can enable spell checking in VS Code by installing [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).

## Deployment

To deploy the documentation, you can run the following command:

```bash
npm run build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

## llms.txt

The `llms.txt` file is a file that allows LLMs like Codex or claude to understand the context of the documentation. It was manually generated using [Firecrawl](https://www.firecrawl.dev/blog/How-to-Create-an-llms-txt-File-for-Any-Website).

You need to get an API key from Firecrawl and follow the instructions on the blog post above.

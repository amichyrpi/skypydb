<div align="center">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/apps/docs/public/dark.svg#gh-light-mode-only">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/apps/docs/public/dark.svg#gh-dark-mode-only">
</div>

<p align="center">
    <b>Mesosphere - Open Source Relational and Vector Embeddings Database</b>. <br />
</p>

<div align="center">

![GitHub commit activity](https://img.shields.io/github/commit-activity/m/Ahen-Studio/mesosphere-backend)
[![PyPI](https://img.shields.io/pypi/v/mesosphere.svg)](https://pypi.org/project/mesosphere/)
![NPM Version](https://img.shields.io/npm/v/mesosphere)
[![Crates.io](https://img.shields.io/crates/v/skypydb)](https://crates.io/crates/skypydb)
![GitHub](https://img.shields.io/github/license/Ahen-Studio/mesosphere-backend)
[![Docs](https://img.shields.io/badge/Docs-blue.svg)](https://docs.ahen-studio.com/)

</div>

Made in France with ❤️

## How it works

[Mesosphere](https://mesosphere.ahen-studio.com) is an open-source relational and vector embeddings database with an Apache 2.0 Licensed it is designed to be simple, fast, and easy to use for web developers and backend developers. Read, Write data and perform hard logic by writing functions in Typescript with full type safety.

Mesosphere provides a database, where you write your functions in Typescript and store your data in a relational database. You can also store your files in a database. You can also create, search and delete vectors collections all that in realtime. we provide multiple client libraries to interact with the functions you wrote.

**Client Libraries**

Mesosphere is available in multiple languages. You can use it in your favorite language. We currently support Typescript, Python and Rust.

**Architecture**

Mesosphere is made to be simple, write you server functions in the ./mesosphere folder and deploy them to the backend. Start experimenting with Mesosphere by following our [tutorials](./demo/examples/js/tutorials/chat_app/). Mesosphere use tRPC to create a type-safe API for your functions and a Postgres database to store your data.

## Integration

We provide an integration layer with [mem0](https://github.com/mem0ai/mem0) for you to add memory to a LLM by using our [integration](./demo/examples/python/integration/)

## Languages

Looking for your language? You'll find it at [languages](./i18n/languages.md)

## Documentation

For full documentation, visit [mesosphere.ahen-studio.com/docs](https://mesosphere.ahen-studio.com/docs)

To see how to Contribute, visit [Contribution guidelines](./CONTRIBUTING.md)

## Community & Support

- [Community Forum](https://github.com/Ahen-Studio/mesosphere-backend/discussions). Best for: help with building, discussion about database best practices.
- [GitHub Issues](https://github.com/Ahen-Studio/mesosphere-backend/issues). Best for: bugs and errors you encounter using Supabase.
- [Github Pull Requests](https://github.com/Ahen-Studio/mesosphere-backend/pulls). Best for: contributing to the codebase.

## TODO

## Doable without any problem

- [ ] Remake the docs
- [ ] Remake the i18n translations
- [ ] Make the dashboard
- [ ] Remake examples
- [ ] Remake the backend and the client libraries

## Doable with a lot of problems (need the saas website)

- [ ] Remake the Rust server
  - [ ] Make the server scalable on the cloud
- [ ] Remake the workflows files
  - [ ] Python
  - [ ] Make the Typescript workflows
  - [ ] Rust
  - [ ] Docker
- [ ] Fix the CLI
  - [ ] dev
  - [ ] auth
  - [ ] deploy
- [ ] Fix deployment files
  - [ ] Google cloud

## All Thanks To Our Contributors:

<a href="https://github.com/Ahen-Studio/mesosphere-backend/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Ahen-Studio/mesosphere-backend" />
</a>

## License

[Apache 2.0](./LICENSE)

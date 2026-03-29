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
[![Crates.io](https://img.shields.io/crates/v/mesosphere)](https://crates.io/crates/mesosphere)
![GitHub](https://img.shields.io/github/license/Ahen-Studio/mesosphere-backend)
[![Docs](https://img.shields.io/badge/Docs-blue.svg)](https://docs.usemesosphere.com/)

</div>

Tillverkad i Frankrike med ❤️

## Hur det fungerar

[Mesosphere](https://www.usemesosphere.com/) är en relations- och vektorinbäddningsdatabas med öppen källkod med en Apache 2.0-licensierad. Den är designad för att vara enkel, snabb och lätt att använda för webbutvecklare och backend-utvecklare. Läs, skriv data och utför hård logik genom att skriva funktioner i Typescript med full typsäkerhet.

Mesosphere tillhandahåller en databas, där du skriver dina funktioner i Typescript och lagrar dina data i en relationsdatabas. Du kan också lagra dina filer i en databas. Du kan också skapa, söka och ta bort vektorsamlingar i realtid. vi tillhandahåller flera klientbibliotek för att interagera med funktionerna du skrev.

**Klientbibliotek**

Mesosphere är tillgänglig på flera språk. Du kan använda den på ditt favoritspråk. Vi stöder för närvarande Typescript, Python och Rust.

**Arkitektur**

Mesosphere är gjord för att vara enkel, skriv serverfunktioner till dig i mappen ../mesosphere och distribuera dem till backend. Börja experimentera med Mesosphere genom att följa vår [tutorials](../demo/examples/js/tutorials/chat_app/). Mesosphere använder tRPC för att skapa ett typsäkert API för dina funktioner och en Postgres-databas för att lagra dina data.

## Integration

Vi tillhandahåller ett integrationslager med [mem0](https://github.com/mem0ai/mem0) så att du kan lägga till minne till en LLM genom att använda vår [integration](../demo/examples/python/integration/)

## Språk

Letar du efter ditt språk? Du hittar den på [languages](./languages.md)

## Dokumentation

För fullständig dokumentation, besök [docs.usemesosphere.com](https://docs.usemesosphere.com/)

Om du vill se hur du bidrar besöker du [Contribution guidelines](../CONTRIBUTING.md)

## Community & Support

- [Community Forum](https://github.com/Ahen-Studio/mesosphere-backend/discussions). Bäst för: hjälp med att bygga, diskussion om bästa metoder för databaser.
- [GitHub Issues](https://github.com/Ahen-Studio/mesosphere-backend/issues). Bäst för: buggar och fel du stöter på när du använder Mesosphere.
- [Github Pull Requests](https://github.com/Ahen-Studio/mesosphere-backend/pulls). Bäst för: att bidra till kodbasen.

## Testzon

För att experimentera med funktionerna i Mesosphere och lära dig hur de fungerar, besök [Testzon](../mesosphere-tests/).

## Allt tack till våra bidragsgivare:

<a href="https://github.com/Ahen-Studio/mesosphere-backend/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Ahen-Studio/mesosphere-backend" />
</a>

## Licens

[Apache 2.0](../LICENSE)

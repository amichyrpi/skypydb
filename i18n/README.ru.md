<div align="center">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/apps/docs/public/dark.svg#gh-light-mode-only">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/apps/docs/public/dark.svg#gh-dark-mode-only">
</div>

<p align="center">
    <b>Мезосфера — база данных реляционных и векторных вложений с открытым исходным кодом</b>. <br />
</p>

<div align="center">

![GitHub commit activity](https://img.shields.io/github/commit-activity/m/Ahen-Studio/mesosphere-backend)
[![PyPI](https://img.shields.io/pypi/v/mesosphere.svg)](https://pypi.org/project/mesosphere/)
![NPM Version](https://img.shields.io/npm/v/mesosphere)
[![Crates.io](https://img.shields.io/crates/v/mesosphere)](https://crates.io/crates/mesosphere)
![GitHub](https://img.shields.io/github/license/Ahen-Studio/mesosphere-backend)
[![Docs](https://img.shields.io/badge/Docs-blue.svg)](https://docs.usemesosphere.com/)

</div>

Сделано во Франции с ❤️

## Как это работает

[Mesosphere](https://www.usemesosphere.com/) — это реляционная и векторная база данных с открытым исходным кодом, имеющая лицензию Apache 2.0. Она создана для того, чтобы быть простой, быстрой и легкой в ​​использовании для веб-разработчиков и серверных разработчиков. Чтение, запись данных и выполнение сложной логики путем написания функций в Typescript с полной безопасностью типов.

Mesphere предоставляет базу данных, в которой вы пишете свои функции на Typescript и сохраняете свои данные в реляционной базе данных. Вы также можете хранить свои файлы в базе данных. Вы также можете создавать, искать и удалять коллекции векторов в режиме реального времени. мы предоставляем несколько клиентских библиотек для взаимодействия с написанными вами функциями.

**Клиентские библиотеки**

Мезосфера доступна на нескольких языках. Вы можете использовать его на своем любимом языке. В настоящее время мы поддерживаем Typescript, Python и Rust.

**Архитектура**

Mesphere устроен просто: записывайте серверные функции в папку .../mesosphere и развертывайте их на бэкэнде. Начните экспериментировать с мезосферой, подписавшись на наш [tutorials](.../demo/examples/js/tutorials/chat_app/). Mesphere использует tRPC для создания типобезопасного API для ваших функций и базы данных Postgres для хранения ваших данных.

## Интеграция

Мы предоставляем уровень интеграции с [mem0](https://github.com/mem0ai/mem0), чтобы вы могли добавить память в LLM с помощью нашего [integration](.../demo/examples/python/integration/).

## Языки

Ищете свой язык? Вы найдете его по адресу [languages](./languages.md).

## Документация

Полную документацию можно найти на странице [docs.usemesosphere.com](https://docs.usemesosphere.com/).

Чтобы узнать, как внести свой вклад, посетите [Contribution guidelines](.../CONTRIBUTING.md).

## Сообщество и поддержка

- [Community Forum](https://github.com/Ahen-Studio/mesosphere-backend/discussions). Подходит для: помощи в создании, обсуждения лучших практик работы с базами данных.
- [GitHub Issues](https://github.com/Ahen-Studio/mesosphere-backend/issues). Подходит для: ошибок и ошибок, с которыми вы сталкиваетесь при использовании Mesosphere.
- [Github Pull Requests](https://github.com/Ahen-Studio/mesosphere-backend/pulls). Лучше всего подходит для: внесения вклада в кодовую базу.

## Зона тестирования

Чтобы поэкспериментировать с функциями Mesosphere и узнать, как они работают, посетите [Зона тестирования](.../mesosphere-tests/).

## Все благодаря нашим участникам:

<a href="https://github.com/Ahen-Studio/mesosphere-backend/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Ahen-Studio/mesosphere-backend" />
</a>

## Лицензия

[Apache 2.0](../LICENSE)

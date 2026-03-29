<div align="center">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/apps/docs/public/dark.svg#gh-light-mode-only">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/apps/docs/public/dark.svg#gh-dark-mode-only">
</div>

<p align="center">
    <b>Mesosphere - 开源关系和向量嵌入数据库</b>. <br />
</p>

<div align="center">

![GitHub commit activity](https://img.shields.io/github/commit-activity/m/Ahen-Studio/mesosphere-backend)
[![PyPI](https://img.shields.io/pypi/v/mesosphere.svg)](https://pypi.org/project/mesosphere/)
![NPM Version](https://img.shields.io/npm/v/mesosphere)
[![Crates.io](https://img.shields.io/crates/v/mesosphere)](https://crates.io/crates/mesosphere)
![GitHub](https://img.shields.io/github/license/Ahen-Studio/mesosphere-backend)
[![Docs](https://img.shields.io/badge/Docs-blue.svg)](https://docs.usemesosphere.com/)

</div>

法国制造，❤️

## 它是如何运作的

[Mesosphere](https://www.usemesosphere.com/) 是一个获得 Apache 2.0 许可的开源关系和向量嵌入数据库，其设计简单、快速且易于 Web 开发人员和后端开发人员使用。通过在具有完全类型安全性的 Typescript 中编写函数来读取、写入数据并执行硬逻辑。

Mesosphere 提供了一个数据库，您可以在其中用 Typescript 编写函数并将数据存储在关系数据库中。您还可以将文件存储在数据库中。您还可以实时创建、搜索和删除矢量集合。我们提供多个客户端库来与您编写的函数进行交互。

**客户端库**

Mesosphere 有多种语言版本。您可以用您喜欢的语言使用它。我们目前支持 Typescript、Python 和 Rust。

**建筑学**

Mesosphere 的设计很简单，只需在 ../mesosphere 文件夹中编写服务器函数并将它们部署到后端即可。按照我们的 [tutorials](../demo/examples/js/tutorials/chat_app/) 开始尝试 Mesosphere。 Mesosphere 使用 tRPC 为您的函数创建类型安全的 API，并使用 Postgres 数据库来存储您的数据。

## 一体化

我们提供带有 [mem0](https://github.com/mem0ai/mem0) 的集成层，供您使用我们的 [integration](../demo/examples/python/integration/) 向 LLM 添加内存

## 语言

正在寻找您的语言？您可以在 [languages](./languages.md) 找到它

## 文档

如需完整文档，请访问 [docs.usemesosphere.com](https://docs.usemesosphere.com/)

要了解如何贡献，请访问 [Contribution guidelines](../CONTRIBUTING.md)

## 社区与支持

- [Community Forum](https://github.com/Ahen-Studio/mesosphere-backend/discussions). 最适合：帮助构建、讨论数据库最佳实践。
- [GitHub Issues](https://github.com/Ahen-Studio/mesosphere-backend/issues). 最适合：使用 Mesosphere 遇到的错误和错误。
- [Github Pull Requests](https://github.com/Ahen-Studio/mesosphere-backend/pulls). 最适合：为代码库做出贡献。

## 测试区

如需体验Mesosphere的功能并了解其运作方式，请访问[测试区](../mesosphere-tests/)。

## 感谢我们的贡献者：

<a href="https://github.com/Ahen-Studio/mesosphere-backend/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Ahen-Studio/mesosphere-backend" />
</a>

## 执照

[Apache 2.0](../LICENSE)

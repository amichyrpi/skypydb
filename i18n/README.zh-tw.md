<div align="center">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/apps/docs/public/dark.svg#gh-light-mode-only">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/apps/docs/public/dark.svg#gh-dark-mode-only">
</div>

<p align="center">
    <b>Mesosphere - 開源關係和向量嵌入資料庫</b>. <br />
</p>

<div align="center">

![GitHub commit activity](https://img.shields.io/github/commit-activity/m/Ahen-Studio/mesosphere-backend)
[![PyPI](https://img.shields.io/pypi/v/mesosphere.svg)](https://pypi.org/project/mesosphere/)
![NPM Version](https://img.shields.io/npm/v/mesosphere)
[![Crates.io](https://img.shields.io/crates/v/mesosphere)](https://crates.io/crates/mesosphere)
![GitHub](https://img.shields.io/github/license/Ahen-Studio/mesosphere-backend)
[![Docs](https://img.shields.io/badge/Docs-blue.svg)](https://docs.usemesosphere.com/)

</div>

法國製造，❤️

## 它是如何運作的

[Mesosphere](https://www.usemesosphere.com/) 是一個獲得 Apache 2.0 許可的開源關係和向量嵌入資料庫，其設計簡單、快速且易於 Web 開發人員和後端開發人員使用。透過在具有完全類型安全性的 Typescript 中編寫函數來讀取、寫入資料並執行硬邏輯。

Mesosphere 提供了一個資料庫，您可以在其中用 Typescript 編寫函數並將資料儲存在關聯式資料庫中。您也可以將檔案儲存在資料庫中。您也可以即時建立、搜尋和刪除向量集合。我們提供多個客戶端程式庫來與您編寫的函數進行互動。

**客戶端庫**

Mesosphere 有多種語言版本。您可以用您喜歡的語言使用它。我們目前支援 Typescript、Python 和 Rust。

**建築學**

Mesosphere 的設計很簡單，只需在 ../mesosphere 資料夾中編寫伺服器函數並將它們部署到後端即可。按照我們的 [tutorials](../demo/examples/js/tutorials/chat_app/) 開始嘗試 Mesosphere。 Mesosphere 使用 tRPC 為您的函數建立類型安全的 API，並使用 Postgres 資料庫來儲存您的資料。

## 一體化

我們提供帶有 [mem0](https://github.com/mem0ai/mem0) 的集成層，供您使用我們的 [integration](../demo/examples/python/integration/) 向 LLM 添加內存

## 語言

正在尋找您的語言？您可以在 [languages](./languages.md) 找到它

## 文件

如需完整文檔，請造訪 [docs.usemesosphere.com](https://docs.usemesosphere.com/)

若要了解如何貢獻，請造訪 [Contribution guidelines](../CONTRIBUTING.md)

## 社區與支持

- [Community Forum](https://github.com/Ahen-Studio/mesosphere-backend/discussions). 最適合：幫助建構、討論資料庫最佳實務。
- [GitHub Issues](https://github.com/Ahen-Studio/mesosphere-backend/issues). 最適合：使用 Mesosphere 遇到的錯誤和錯誤。
- [Github Pull Requests](https://github.com/Ahen-Studio/mesosphere-backend/pulls). 最適合：為程式碼庫做出貢獻。

## 測試區

若要試驗 Mesosphere 的功能並了解其工作原理，請造訪 [測試區](../mesosphere-tests/)。

## 感謝我們的貢獻者：

<a href="https://github.com/Ahen-Studio/mesosphere-backend/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Ahen-Studio/mesosphere-backend" />
</a>

## 執照

[FSL-1.1-ALv2](../LICENSE)

<div align="center">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/apps/docs/public/dark.svg#gh-light-mode-only">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/apps/docs/public/dark.svg#gh-dark-mode-only">
</div>

<p align="center">
    <b>Mesosphere - オープンソースのリレーショナルおよびベクトル埋め込みデータベース</b>. <br />
</p>

<div align="center">

![GitHub commit activity](https://img.shields.io/github/commit-activity/m/Ahen-Studio/mesosphere-backend)
[![PyPI](https://img.shields.io/pypi/v/mesosphere.svg)](https://pypi.org/project/mesosphere/)
![NPM Version](https://img.shields.io/npm/v/mesosphere)
[![Crates.io](https://img.shields.io/crates/v/mesosphere)](https://crates.io/crates/mesosphere)
![GitHub](https://img.shields.io/github/license/Ahen-Studio/mesosphere-backend)
[![Docs](https://img.shields.io/badge/Docs-blue.svg)](https://docs.ahen-studio.com/)

</div>

フランス製❤️

## 仕組み

[Mesosphere](https://mesosphere.ahen-studio.com) は、Apache 2.0 ライセンスを備えたオープンソースのリレーショナルおよびベクター埋め込みデータベースで、Web 開発者やバックエンド開発者にとってシンプル、高速、使いやすいように設計されています。完全な型安全性を備えた Typescript で関数を作成することにより、データの読み取り、書き込み、ハード ロジックの実行を行います。

Mesosphere は、Typescript で関数を記述し、データをリレーショナル データベースに保存するデータベースを提供します。ファイルをデータベースに保存することもできます。ベクター コレクションの作成、検索、削除をすべてリアルタイムで行うこともできます。私たちは、あなたが作成した関数と対話するための複数のクライアント ライブラリを提供します。

**クライアントライブラリ**

Mesosphere は複数の言語で利用できます。お好きな言語でご利用いただけます。現在、Typescript、Python、Rust をサポートしています。

**建築**

Mesosphere はシンプルに作られており、サーバー関数を ./mesosphere フォルダーに記述してバックエンドにデプロイします。 [tutorials](./demo/examples/js/tutorials/chat_app/) に従って、Mesosphere の実験を開始してください。 Mesosphere は tRPC を使用して、関数用のタイプセーフ API とデータを保存する Postgres データベースを作成します。

## 統合

[integration](./demo/examples/python/integration/) を使用して LLM にメモリを追加できるように、[mem0](https://github.com/mem0ai/mem0) を備えた統合レイヤーが提供されています。

## 言語

あなたの言語をお探しですか? [languages](./i18n/languages.md) にあります

## ドキュメント

完全なドキュメントについては、[mesosphere.ahen-studio.com/docs](https://mesosphere.ahen-studio.com/docs) にアクセスしてください。

貢献する方法については、[Contribution guidelines](./CONTRIBUTING.md) にアクセスしてください。

## コミュニティとサポート

- [Community Forum](https://github.com/Ahen-Studio/mesosphere-backend/discussions). こんな方に最適: 構築の支援、データベースのベスト プラクティスについてのディスカッション。
- [GitHub Issues](https://github.com/Ahen-Studio/mesosphere-backend/issues). 以下に最適: Supabase の使用中に発生したバグやエラー。
- [Github Pull Requests](https://github.com/Ahen-Studio/mesosphere-backend/pulls). 最適な用途: コードベースへの貢献。

## 貢献者の皆様に感謝します:

<a href="https://github.com/Ahen-Studio/mesosphere-backend/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Ahen-Studio/mesosphere-backend" />
</a>

## ライセンス

[Apache 2.0](../LICENSE)

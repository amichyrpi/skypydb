<div align="center">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/apps/docs/public/dark.svg#gh-light-mode-only">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/apps/docs/public/dark.svg#gh-dark-mode-only">
</div>

<p align="center">
    <b>মেসোস্ফিয়ার - ওপেন সোর্স রিলেশনাল এবং ভেক্টর এমবেডিং ডেটাবেস</b>. <br />
</p>

<div align="center">

![GitHub commit activity](https://img.shields.io/github/commit-activity/m/Ahen-Studio/mesosphere-backend)
[![PyPI](https://img.shields.io/pypi/v/mesosphere.svg)](https://pypi.org/project/mesosphere/)
![NPM Version](https://img.shields.io/npm/v/mesosphere)
[![Crates.io](https://img.shields.io/crates/v/mesosphere)](https://crates.io/crates/mesosphere)
![GitHub](https://img.shields.io/github/license/Ahen-Studio/mesosphere-backend)
[![Docs](https://img.shields.io/badge/Docs-blue.svg)](https://docs.usemesosphere.com/)

</div>

❤️ দিয়ে ফ্রান্সে তৈরি

## এটা কিভাবে কাজ করে

[Mesosphere](https://www.usemesosphere.com/) একটি Apache 2.0 লাইসেন্স সহ একটি ওপেন-সোর্স রিলেশনাল এবং ভেক্টর এম্বেডিং ডেটাবেস এটি ওয়েব ডেভেলপার এবং ব্যাকএন্ড ডেভেলপারদের জন্য সহজ, দ্রুত এবং সহজে ব্যবহার করার জন্য ডিজাইন করা হয়েছে। সম্পূর্ণ টাইপ নিরাপত্তা সহ টাইপস্ক্রিপ্টে ফাংশন লিখে ডাটা পড়ুন, লিখুন এবং হার্ড লজিক সঞ্চালন করুন।

মেসোস্ফিয়ার একটি ডাটাবেস প্রদান করে, যেখানে আপনি টাইপস্ক্রিপ্টে আপনার ফাংশনগুলি লেখেন এবং একটি রিলেশনাল ডাটাবেসে আপনার ডেটা সংরক্ষণ করেন। আপনি একটি ডাটাবেসে আপনার ফাইল সংরক্ষণ করতে পারেন. আপনি রিয়েলটাইমে ভেক্টর সংগ্রহগুলি তৈরি করতে, অনুসন্ধান করতে এবং মুছতে পারেন। আপনার লেখা ফাংশনগুলির সাথে ইন্টারঅ্যাক্ট করার জন্য আমরা একাধিক ক্লায়েন্ট লাইব্রেরি প্রদান করি।

**ক্লায়েন্ট লাইব্রেরি**

মেসোস্ফিয়ার একাধিক ভাষায় পাওয়া যায়। আপনি আপনার প্রিয় ভাষায় এটি ব্যবহার করতে পারেন. আমরা বর্তমানে Typescript, Python এবং Rust সমর্থন করি।

**স্থাপত্য**

মেসোস্ফিয়ারকে সহজ করার জন্য তৈরি করা হয়েছে, আপনার সার্ভার ফাংশনগুলিকে .../mesosphere ফোল্ডারে লিখুন এবং সেগুলিকে ব্যাকএন্ডে স্থাপন করুন৷ আমাদের [tutorials](.../demo/examples/js/tutorials/chat_app/) অনুসরণ করে মেসোস্ফিয়ার নিয়ে পরীক্ষা শুরু করুন। মেসোস্ফিয়ার আপনার ফাংশনগুলির জন্য একটি টাইপ-নিরাপদ API তৈরি করতে এবং আপনার ডেটা সঞ্চয় করার জন্য একটি Postgres ডাটাবেস তৈরি করতে tRPC ব্যবহার করে।

## ইন্টিগ্রেশন

আমাদের [integration](.../demo/examples/python/integration/) ব্যবহার করে একটি LLM-এ মেমরি যোগ করার জন্য আমরা [mem0](https://github.com/mem0ai/mem0) এর সাথে একটি ইন্টিগ্রেশন লেয়ার প্রদান করি

## ভাষা

আপনার ভাষা খুঁজছেন? আপনি এটি [languages](./languages.md) এ পাবেন

## ডকুমেন্টেশন

সম্পূর্ণ ডকুমেন্টেশনের জন্য, [docs.usemesosphere.com](https://docs.usemesosphere.com/) এ যান

কিভাবে অবদান রাখতে হয় তা দেখতে, [Contribution guidelines](.../CONTRIBUTING.md) এ যান

## সম্প্রদায় এবং সমর্থন

- [Community Forum](https://github.com/Ahen-Studio/mesosphere-backend/discussions). এর জন্য সর্বোত্তম: তৈরিতে সহায়তা, ডাটাবেস সেরা অনুশীলন সম্পর্কে আলোচনা।
- [GitHub Issues](https://github.com/Ahen-Studio/mesosphere-backend/issues). এর জন্য সেরা: সুপাবেস ব্যবহার করে আপনি যে বাগ এবং ত্রুটির সম্মুখীন হন।
- [Github Pull Requests](https://github.com/Ahen-Studio/mesosphere-backend/pulls). এর জন্য সেরা: কোডবেসে অবদান রাখা।

## টেস্টিং জোন

Mesosphere এর বৈশিষ্ট্যগুলি নিয়ে পরীক্ষা করতে এবং তারা কীভাবে কাজ করে তা জানতে, [টেস্টিং জোন](.../mesosphere-tests/) এ যান৷

## আমাদের অবদানকারীদের সমস্ত ধন্যবাদ:

<a href="https://github.com/Ahen-Studio/mesosphere-backend/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Ahen-Studio/mesosphere-backend" />
</a>

## লাইসেন্স

[FSL-1.1-ALv2](../LICENSE)

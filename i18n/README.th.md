<div align="center">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/apps/docs/public/dark.svg#gh-light-mode-only">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/apps/docs/public/dark.svg#gh-dark-mode-only">
</div>

<p align="center">
    <b>Mesosphere - ฐานข้อมูลการฝังเชิงสัมพันธ์และเวกเตอร์แบบโอเพ่นซอร์ส</b>. <br />
</p>

<div align="center">

![GitHub commit activity](https://img.shields.io/github/commit-activity/m/Ahen-Studio/mesosphere-backend)
[![PyPI](https://img.shields.io/pypi/v/mesosphere.svg)](https://pypi.org/project/mesosphere/)
![NPM Version](https://img.shields.io/npm/v/mesosphere)
[![Crates.io](https://img.shields.io/crates/v/mesosphere)](https://crates.io/crates/mesosphere)
![GitHub](https://img.shields.io/github/license/Ahen-Studio/mesosphere-backend)
[![Docs](https://img.shields.io/badge/Docs-blue.svg)](https://docs.usemesosphere.com/)

</div>

ผลิตในฝรั่งเศสด้วย ❤️

## มันทำงานอย่างไร

[Mesosphere](https://www.usemesosphere.com/) เป็นฐานข้อมูลการฝังเชิงสัมพันธ์และเวกเตอร์แบบโอเพ่นซอร์สพร้อมลิขสิทธิ์ Apache 2.0 ซึ่งได้รับการออกแบบมาให้เรียบง่าย รวดเร็ว และใช้งานง่ายสำหรับนักพัฒนาเว็บและนักพัฒนาแบ็กเอนด์ อ่าน เขียนข้อมูล และดำเนินการฮาร์ดลอจิกโดยการเขียนฟังก์ชันใน Typescript พร้อมความปลอดภัยเต็มรูปแบบ

Mesosphere จัดเตรียมฐานข้อมูลที่คุณเขียนฟังก์ชันของคุณใน Typescript และจัดเก็บข้อมูลของคุณในฐานข้อมูลเชิงสัมพันธ์ คุณยังสามารถจัดเก็บไฟล์ของคุณในฐานข้อมูลได้ คุณยังสามารถสร้าง ค้นหา และลบคอลเลกชันเวกเตอร์ทั้งหมดได้แบบเรียลไทม์ เรามีไลบรารีไคลเอนต์หลายตัวเพื่อโต้ตอบกับฟังก์ชันที่คุณเขียน

**ไลบรารีไคลเอ็นต์**

Mesosphere มีให้บริการในหลายภาษา คุณสามารถใช้มันในภาษาที่คุณชื่นชอบ ขณะนี้เรารองรับ Typescript, Python และ Rust

**สถาปัตยกรรม**

Mesosphere ถูกสร้างมาให้เรียบง่าย เขียนฟังก์ชันเซิร์ฟเวอร์ลงในโฟลเดอร์ ../mesosphere และปรับใช้กับแบ็กเอนด์ เริ่มต้นการทดลองกับ Mesosphere โดยทำตาม [tutorials](../demo/examples/js/tutorials/chat_app/) ของเรา Mesosphere ใช้ tRPC เพื่อสร้าง API ที่ปลอดภัยสำหรับฟังก์ชันของคุณ และฐานข้อมูล Postgres เพื่อจัดเก็บข้อมูลของคุณ

## บูรณาการ

เราจัดเตรียมเลเยอร์การรวมเข้ากับ [mem0](https://github.com/mem0ai/mem0) เพื่อให้คุณสามารถเพิ่มหน่วยความจำให้กับ LLM ได้โดยใช้ [integration](../demo/examples/python/integration/) ของเรา

## ภาษา

กำลังมองหาภาษาของคุณ? คุณจะพบได้ที่ [languages](./languages.md)

## เอกสารประกอบ

สำหรับเอกสารฉบับเต็ม โปรดไปที่ [docs.usemesosphere.com](https://docs.usemesosphere.com/)

หากต้องการดูวิธีการมีส่วนร่วม โปรดไปที่ [Contribution guidelines](../CONTRIBUTING.md)

## ชุมชนและการสนับสนุน

- [Community Forum](https://github.com/Ahen-Studio/mesosphere-backend/discussions). เหมาะสำหรับ: ความช่วยเหลือในการสร้าง การอภิปรายเกี่ยวกับแนวทางปฏิบัติที่ดีที่สุดของฐานข้อมูล
- [GitHub Issues](https://github.com/Ahen-Studio/mesosphere-backend/issues). ดีที่สุดสำหรับ: ข้อบกพร่องและข้อผิดพลาดที่คุณพบเมื่อใช้ Mesosphere
- [Github Pull Requests](https://github.com/Ahen-Studio/mesosphere-backend/pulls). ดีที่สุดสำหรับ: การมีส่วนร่วมใน codebase

## โซนทดสอบ

หากต้องการทดลองใช้คุณลักษณะต่างๆ ของ Mesosphere และเรียนรู้วิธีการทำงาน โปรดไปที่ [โซนทดสอบ](../mesosphere-tests/)

## ขอขอบคุณผู้สนับสนุนของเรา:

<a href="https://github.com/Ahen-Studio/mesosphere-backend/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Ahen-Studio/mesosphere-backend" />
</a>

## ใบอนุญาต

[Apache 2.0](../LICENSE)

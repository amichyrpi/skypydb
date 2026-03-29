<div align="center">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/apps/docs/public/dark.svg#gh-light-mode-only">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/apps/docs/public/dark.svg#gh-dark-mode-only">
</div>

<p align="center">
    <b>Mesosphere - खुला स्रोत रिलेशनल र भेक्टर इम्बेडिङ डाटाबेस</b>. <br />
</p>

<div align="center">

![GitHub commit activity](https://img.shields.io/github/commit-activity/m/Ahen-Studio/mesosphere-backend)
[![PyPI](https://img.shields.io/pypi/v/mesosphere.svg)](https://pypi.org/project/mesosphere/)
![NPM Version](https://img.shields.io/npm/v/mesosphere)
[![Crates.io](https://img.shields.io/crates/v/mesosphere)](https://crates.io/crates/mesosphere)
![GitHub](https://img.shields.io/github/license/Ahen-Studio/mesosphere-backend)
[![Docs](https://img.shields.io/badge/Docs-blue.svg)](https://docs.usemesosphere.com/)

</div>

❤️ संग फ्रान्स मा निर्मित

## यसले कसरी काम गर्छ

[Mesosphere](https://www.usemesosphere.com/) Apache 2.0 लाइसेन्स भएको खुला स्रोत रिलेसनल र भेक्टर इम्बेडिङ डाटाबेस हो यो वेब विकासकर्ताहरू र ब्याकएन्ड विकासकर्ताहरूको लागि सरल, छिटो, र प्रयोग गर्न सजिलो हुन डिजाइन गरिएको हो। पढ्नुहोस्, डेटा लेख्नुहोस् र पूर्ण प्रकारको सुरक्षाको साथ टाइपस्क्रिप्टमा प्रकार्यहरू लेखेर हार्ड तर्क प्रदर्शन गर्नुहोस्।

मेसोस्फियरले डाटाबेस प्रदान गर्दछ, जहाँ तपाइँ टाइपस्क्रिप्टमा तपाइँको प्रकार्यहरू लेख्नुहुन्छ र तपाइँको डाटालाई रिलेसनल डाटाबेसमा भण्डार गर्नुहुन्छ। तपाईं आफ्नो फाइलहरू डाटाबेसमा भण्डारण गर्न सक्नुहुन्छ। तपाईं वास्तविक समयमा भेक्टर संग्रहहरू सिर्जना गर्न, खोजी गर्न र मेटाउन सक्नुहुन्छ। हामीले तपाईले लेख्नु भएको प्रकार्यहरूसँग अन्तर्क्रिया गर्न धेरै ग्राहक पुस्तकालयहरू प्रदान गर्दछ।

**ग्राहक पुस्तकालयहरू**

Mesosphere धेरै भाषाहरूमा उपलब्ध छ। तपाइँ यसलाई तपाइँको मनपर्ने भाषामा प्रयोग गर्न सक्नुहुन्छ। हामी हाल Typescript, Python र Rust लाई समर्थन गर्छौं।

**वास्तुकला**

मेसोस्फियरलाई सरल बनाउनको लागि बनाइएको छ, .../mesosphere फोल्डरमा तपाइँको सर्भर प्रकार्यहरू लेख्नुहोस् र तिनीहरूलाई ब्याकइन्डमा डिप्लोय गर्नुहोस्। हाम्रो [tutorials](.../demo/examples/js/tutorials/chat_app/) लाई पछ्याएर Mesosphere को साथ प्रयोग सुरु गर्नुहोस्। मेसोस्फियरले तपाईंको प्रकार्यहरूको लागि टाइप-सुरक्षित API र तपाईंको डाटा भण्डारण गर्न पोस्टग्रेस डाटाबेस सिर्जना गर्न tRPC प्रयोग गर्दछ।

## एकीकरण

हामीले हाम्रो [integration](.../demo/examples/python/integration/) प्रयोग गरेर LLM मा मेमोरी थप्नको लागि [mem0](https://github.com/mem0ai/mem0) सँग एकीकरण तह उपलब्ध गराउछौँ।

## भाषाहरू

आफ्नो भाषा खोज्दै हुनुहुन्छ? तपाईंले यसलाई [languages](./languages.md) मा फेला पार्नुहुनेछ

## दस्तावेजीकरण

पूरा कागजातको लागि, [docs.usemesosphere.com](https://docs.usemesosphere.com/) मा जानुहोस्

कसरी योगदान गर्ने भनेर हेर्नको लागि [Contribution guidelines](.../CONTRIBUTING.md) मा जानुहोस्

## समुदाय र समर्थन

- [Community Forum](https://github.com/Ahen-Studio/mesosphere-backend/discussions). यसका लागि उत्तम: निर्माणमा मद्दत, डाटाबेस उत्कृष्ट अभ्यासहरूको बारेमा छलफल।
- [GitHub Issues](https://github.com/Ahen-Studio/mesosphere-backend/issues). यसका लागि उत्तम: सुपाबेस प्रयोग गरेर तपाईंले सामना गर्नुहुने बगहरू र त्रुटिहरू।
- [Github Pull Requests](https://github.com/Ahen-Studio/mesosphere-backend/pulls). यसका लागि उत्तम: कोडबेसमा योगदान गर्दै।

## परीक्षण क्षेत्र

Mesosphere को सुविधाहरू प्रयोग गर्न र तिनीहरूले कसरी काम गर्छन् भनेर जान्नको लागि, [परीक्षण क्षेत्र](.../mesosphere-tests/) मा जानुहोस्।

## हाम्रा योगदानकर्ताहरूलाई सबै धन्यवाद:

<a href="https://github.com/Ahen-Studio/mesosphere-backend/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Ahen-Studio/mesosphere-backend" />
</a>

## इजाजतपत्र

[Apache 2.0](../LICENSE)

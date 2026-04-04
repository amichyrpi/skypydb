import BetaFeature from "@site/src/_BetaFeature.mdx";
import ProfessionalFeatureOnly from "@site/src/_ProfessionalFeatureOnly.mdx";
import { DetailsCard } from "@site/src/DetailsCard.tsx";
import { DocsLink, DocslinksList } from "@site/src/DocslinksList";
import { Step, StepsList } from "@site/src/StepsList";
import MDXComponents from "@theme-original/MDXComponents";
import Admonition from "@theme/Admonition";
import { JSCodeVariants } from "../JSCodeVariants";
import { JSFileExtension } from "../JSFileExtension";
import { LanguageSelector } from "../LanguageSelector";

export default {
  ...MDXComponents,
  Admonition,
  ProfessionalFeatureOnly,
  BetaFeature,
  DetailsCard,
  DocslinksList,
  DocsLink,
  JSFileExtension,
  JSCodeVariants,
  LanguageSelector,
  StepsList,
  Step,
};

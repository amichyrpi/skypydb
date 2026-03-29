import MDXComponents from "@theme-original/MDXComponents";
import Admonition from "@theme/Admonition";
import BetaFeature from "@site/src/_BetaFeature.mdx";
import ProfessionalFeatureOnly from "@site/src/_ProfessionalFeatureOnly.mdx";
import { DetailsCard } from "@site/src/DetailsCard.tsx";
import { DocslinksList, DocsLink } from "@site/src/DocslinksList";
import { JSFileExtension } from "../JSFileExtension";
import { JSCodeVariants } from "../JSCodeVariants";
import { LanguageSelector } from "../LanguageSelector";
import { Step, StepsList } from "@site/src/StepsList";

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

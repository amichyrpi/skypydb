#!/usr/bin/env node

import { run_cli } from "./cli";

void run_cli(process.argv).then((code) => {
  process.exitCode = code;
});

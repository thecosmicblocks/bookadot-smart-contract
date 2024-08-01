import { defineConfig } from "@wagmi/cli";
import { react } from "@wagmi/cli/plugins";

// https://wagmi.sh/cli/getting-started#use-generated-code
export default defineConfig({
  out: "bookadot-sdk/src/Bookadot.ts",
  contracts: [],
  plugins: [react()],
});

import fs from "fs";
import { spawnSync } from "child_process";
import { abi as BookadotPropertyAbi } from "../build/contracts/contracts/BookadotProperty.sol/BookadotProperty.json";
import { abi as BookadotFactoryAbi } from "../build/contracts/contracts/BookadotFactory.sol/BookadotFactory.json";
import { abi as BookadotTicketAbi } from "../build/contracts/contracts/BookadotTicket.sol/BookadotTicket.json";

const OUT_DIR = "bookadot-sdk";
const CONTRACTS = [
    {
        name: "BookadotProperty",
        abi: BookadotPropertyAbi,
        fileName: "BookadotProperty",
    },
    {
        name: "BookadotFactory",
        abi: BookadotFactoryAbi,
        fileName: "BookadotFactory",
    },
    {
        name: "BookadotTicket",
        abi: BookadotTicketAbi,
        fileName: "BookadotTicket",
    },
];

const WAGMI_CONFIG_TEMP = `import { defineConfig } from "@wagmi/cli";
import { react } from "@wagmi/cli/plugins";

// https://wagmi.sh/cli/getting-started#use-generated-code
export default defineConfig({
  out: "${OUT_DIR}/src/{{sdk_file_name}}.ts",
  contracts: {{contracts}},
  plugins: [react()],
});
`;

for (const contract of CONTRACTS) {
    const temp = WAGMI_CONFIG_TEMP.replace(
        "{{sdk_file_name}}",
        contract.fileName
    ).replace(
        "{{contracts}}",
        JSON.stringify([{ name: contract.name, abi: contract.abi }], null, 2)
    );
    fs.writeFileSync("wagmi.config.ts", temp, { encoding: "utf-8" });
    spawnSync("yarn", ["wagmi", "generate"], { stdio: "inherit" });
}

console.log("Generated react sdk successfully\n");

/// ===============================================
/// ===============================================
/// ===============================================

let dir = fs.readdirSync(`${OUT_DIR}/src`, {
    encoding: "utf-8",
});
dir = dir.filter((file) => file !== "index.ts");
const dirContent = dir
    .map((file) => `export * from "./src/${file}";`)
    .join("\n");
fs.writeFileSync(`${OUT_DIR}/index.ts`, dirContent, {
    encoding: "utf-8",
});
console.log("Exported react sdk successfully\n");

/// ===============================================
/// ===============================================
/// ===============================================

const temp = WAGMI_CONFIG_TEMP.replace("{{sdk_file_name}}", "Bookadot").replace(
    "{{contracts}}",
    JSON.stringify([], null, 2)
);
fs.writeFileSync("wagmi.config.ts", temp, { encoding: "utf-8" });
console.log("Clean up wagmi.config.ts\n");

spawnSync("cp", ["contract_address.json", "bookadot-sdk/"], {
    stdio: "inherit",
});

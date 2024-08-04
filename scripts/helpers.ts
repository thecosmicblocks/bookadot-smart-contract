import path from "path";
import fs from "fs";
require("dotenv").config();

export const CONTRACT_KEYS = {
    BOOKADOT_CONFIG: "BOOKADOT_CONFIG",
    BOOKADOT_FACTORY: "BOOKADOT_FACTORY",
    BOOKADOT_TICKET_FACTORY: "BOOKADOT_TICKET_FACTORY",
    BOOKADOT_EIP712: "BOOKADOT_EIP712",
}

export const getKey = (network: string, name: string) => {
    return network
        .replace(/-MAINNET|-TESTNET|-mainnet|-testnet/g, "")
        .concat("_", name)
        .toUpperCase();
};

export const appendAddress = (
    network: string,
    address: string,
    _key: string
) => {
    const key = getKey(network, _key);
    const contractAddressFile = path.join(__dirname, "../contract_address.json");
    const ca = JSON.parse(
        fs.readFileSync(contractAddressFile, { encoding: "utf8" })
    );
    ca[(process.env.NODE_ENV as string).toUpperCase()][key] = address;
    fs.writeFileSync(contractAddressFile, JSON.stringify(ca, null, 4));
    console.log("Save contract address successfully\n");
};

export const getAddress = (network: string, _key: string) => {
    const key = getKey(network, _key);
    const contractAddressFile = path.join(__dirname, "../contract_address.json");
    const ca = JSON.parse(
        fs.readFileSync(contractAddressFile, { encoding: "utf8" })
    );
    return ca[(process.env.NODE_ENV as string).toUpperCase()][key];
};

export const sleep = async (ms: number) => {
    return new Promise((resolve) => {
        setTimeout(() => resolve(ms), ms);
    });
};

export function makeId(length: number, type: 'number' | 'string' = 'number'): number | string {
    let result: string = "";
    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const numbers = "0123456789";
    const isNumber = type === 'number';
    const charactersLength = isNumber ? numbers.length : characters.length;
    const characterType = isNumber ? numbers : characters;
    const parser = {
        'number': Number,
        'string': String,
    };

    let counter = 0;
    while (counter < length) {
        result += characterType.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return parser[type](result);
};

export const timestampToEpochTime = (timestamp: number | string | Date) => {
    return Math.floor(new Date(timestamp).getTime() / 1000);
};

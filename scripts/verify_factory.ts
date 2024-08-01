import "@nomiclabs/hardhat-ethers"
import hre from "hardhat"
import { CONTRACT_KEYS, getAddress } from "./helpers"

async function main() {
    await hre.run('verify:verify', {
        address: getAddress(hre.network.name, CONTRACT_KEYS.BOOKADOT_FACTORY),
        constructorArguments: [
            getAddress(hre.network.name, CONTRACT_KEYS.BOOKADOT_CONFIG),
            getAddress(hre.network.name, CONTRACT_KEYS.BOOKADOT_TICKET_FACTORY),
        ],
    })
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
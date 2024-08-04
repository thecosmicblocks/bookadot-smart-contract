import '@nomiclabs/hardhat-ethers'
import hre, { network } from 'hardhat'
import { CONTRACT_KEYS, getAddress } from './helpers'

async function main() {
    const signer = (await hre.ethers.getSigners())[0]
    await hre.run('verify:verify', {
        address: '0x6BCf2e542569F938117A3Ed07A5fD4996e62fcF8', // Property address
        constructorArguments: [
            88005, // Property ID
            getAddress(network.name, CONTRACT_KEYS.BOOKADOT_CONFIG), // Config address
            getAddress(network.name, CONTRACT_KEYS.BOOKADOT_FACTORY), // Factory address
            signer.address // Host address
        ],
    })
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })

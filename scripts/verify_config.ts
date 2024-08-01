import '@nomiclabs/hardhat-ethers'
import hre from 'hardhat'
import { CONTRACT_KEYS, getAddress } from './helpers';

async function main() {

    const signerWallet = new hre.ethers.Wallet(process.env.SIGNER_PRIVATE_KEY!);

    const constructorArgs = [
        500,
        604800,
        process.env.TREASURY_ADDRESS,
        signerWallet.address,
        ["0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"]
    ]

    await hre.run('verify:verify', {
        address: getAddress(hre.network.name, CONTRACT_KEYS.BOOKADOT_CONFIG),
        constructorArguments: constructorArgs,
    })
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })

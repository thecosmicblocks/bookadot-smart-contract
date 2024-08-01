import { CONTRACT_KEYS, appendAddress } from './helpers';
import '@nomiclabs/hardhat-ethers'
import { ethers, network } from 'hardhat'

async function main() {
    const signerWallet = new ethers.Wallet(process.env.SIGNER_PRIVATE_KEY!);
    /**
     * _fee,
     * _payoutDelayTime,
     * _treasury,
     * _defaultSigner,
     * _tokens
     */
    const constructorArgs = [
        500,
        604800,
        process.env.TREASURY_ADDRESS,
        signerWallet.address,
        ["0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"]
    ]

    const BookadotConfig = await ethers.getContractFactory('BookadotConfig')
    // If we had constructor arguments, they would be passed into deploy()
    const bookadotConfig = await BookadotConfig.deploy(...constructorArgs)
    await bookadotConfig.deployed()

    // The address the Contract WILL have once mined
    console.log(bookadotConfig.address)

    // The transaction that was sent to the network to deploy the Contract
    console.log(bookadotConfig.deployTransaction.hash)

    appendAddress(
        network.name,
        bookadotConfig.address,
        CONTRACT_KEYS.BOOKADOT_CONFIG
    );

    // await hre.run('verify:verify', {
    //   address: bookadotConfig.address,
    //   constructorArguments: constructorArgs,
    // })
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })

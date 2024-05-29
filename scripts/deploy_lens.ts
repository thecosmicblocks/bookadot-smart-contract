import '@nomiclabs/hardhat-ethers'
import { ethers } from 'hardhat'
import Configs from './configs.json'
import dedent from "dedent"

async function main() {

    const BookadotLens = await ethers.getContractFactory('BookadotLens')
    const bookadotLens = await BookadotLens.deploy(...Configs['bookadot_lens'].config)

    await bookadotLens.deployed()

    // The address the Contract WILL have once mined
    console.log(bookadotLens.address)

    // The transaction that was sent to the network to deploy the Contract
    console.log(bookadotLens.deployTransaction.hash)

    const finalMessage = dedent`
    🎉 Your Consumer Contract has been deployed successfully 🎉

    address ${bookadotLens.address}

    Check it out here: https://amoy.polygonscan.com/address/${bookadotLens.address}

    You can continue deploying the default Phat Contract with the following command:

    npx @phala/fn upload -b --mode dev --consumerAddress=${bookadotLens.address} --coreSettings=https://api-v2-amoy.lens.dev/
  `
    console.log(`\n${finalMessage}\n`);

    console.log('Sending a request...');
    await bookadotLens.request("0x01");
    console.log('Done');

    // await hre.run('verify:verify', {
    //   address: bookadotFactory.address,
    //   constructorArguments: [Configs['bookadot_factory']],
    // })
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })

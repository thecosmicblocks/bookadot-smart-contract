import '@nomiclabs/hardhat-ethers'
import { ethers } from 'hardhat'
import Configs from './configs.json'

async function main() {

  const BookadotLens = await ethers.getContractFactory('BookadotLens')
  const bookadotLens = await BookadotLens.deploy(Configs['bookadot_lens'].config)

  await bookadotLens.deployed()

  // The address the Contract WILL have once mined
  console.log(bookadotLens.address)

  // The transaction that was sent to the network to deploy the Contract
  console.log(bookadotLens.deployTransaction.hash)


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

import '@nomiclabs/hardhat-ethers'
import { ethers } from 'hardhat'
import Configs from './configs.json'

async function main() {
  const BookadotConfig = await ethers.getContractFactory('BookadotConfig')

  // If we had constructor arguments, they would be passed into deploy()
  const args = Configs['bookadot_config'].config;
  const bookadotConfig = await BookadotConfig.deploy(...args)
  await bookadotConfig.deployed()

  // The address the Contract WILL have once mined
  console.log(bookadotConfig.address)

  // The transaction that was sent to the network to deploy the Contract
  console.log(bookadotConfig.deployTransaction.hash)

  // await hre.run('verify:verify', {
  //   address: bookadotConfig.address,
  //   constructorArguments: Configs['bookadot_config'].config,
  // })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

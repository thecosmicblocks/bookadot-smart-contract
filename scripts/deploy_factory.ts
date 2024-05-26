import '@nomiclabs/hardhat-ethers'
import { ethers } from 'hardhat'
import Configs from './configs.json'

async function main() {

  const BookadotEIP712 = await ethers.getContractFactory('BookadotEIP712')
  const bookadotEIP712 = await BookadotEIP712.deploy()
  await bookadotEIP712.deployed()

  const BookadotFactory = await ethers.getContractFactory('BookadotFactory', {
    libraries: {
      BookadotEIP712: bookadotEIP712.address
    }
  })
  const bookadotFactory = await BookadotFactory.deploy(Configs['bookadot_factory'].config)
  await bookadotFactory.deployed()

  // The address the Contract WILL have once mined
  console.log(bookadotFactory.address)

  // The transaction that was sent to the network to deploy the Contract
  console.log(bookadotFactory.deployTransaction.hash)


  // await hre.run('verify:verify', {
  //   address: bookadotFactory.address,
  //   constructorArguments: [Configs['bookadot_factory']].config,
  // })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

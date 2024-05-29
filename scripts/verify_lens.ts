import "@nomiclabs/hardhat-ethers"
import hre from "hardhat"
import Configs from './configs.json'

async function main() {
  await hre.run('verify:verify', {
    address: Configs.bookadot_lens.address,
    constructorArguments: Configs.bookadot_lens.config,
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
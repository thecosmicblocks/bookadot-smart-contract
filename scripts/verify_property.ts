import '@nomiclabs/hardhat-ethers'
import hre from 'hardhat'

async function main() {
  await hre.run('verify:verify', {
    address: '????', // Property address
    constructorArguments: [
      0, // Property ID
      '?????', // Config address
      '?????', // Factory address
      '?????' // Host address
    ],
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

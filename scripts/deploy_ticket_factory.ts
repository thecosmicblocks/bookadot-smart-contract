import '@nomiclabs/hardhat-ethers'
import { ethers } from 'hardhat'
import Configs from './configs.json'

async function main() {
    const BookadotTicketFactory = await ethers.getContractFactory('BookadotTicketFactory')
    const bookadotTicketFactory = await BookadotTicketFactory.deploy(...Configs['bookadot_ticket_factory'].config)
    await bookadotTicketFactory.deployed()

    // The address the Contract WILL have once mined
    console.log('bookadotTicketFactory.address', bookadotTicketFactory.address)

    // The transaction that was sent to the network to deploy the Contract
    console.log(bookadotTicketFactory.deployTransaction.hash)


    // await hre.run('verify:verify', {
    //   address: bookadotTicketFactory.address,
    //   constructorArguments: [Configs['bookadot_factory']].config,
    // })
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })

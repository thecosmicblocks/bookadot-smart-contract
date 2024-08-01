import '@nomiclabs/hardhat-ethers'
import { ethers, network } from 'hardhat'
import { CONTRACT_KEYS, appendAddress, getAddress } from './helpers'

async function main() {
    const bookadotConfigAddr = getAddress(network.name, CONTRACT_KEYS.BOOKADOT_CONFIG);
    const bookadotTicketFactoryAddr = getAddress(network.name, CONTRACT_KEYS.BOOKADOT_TICKET_FACTORY);

    const BookadotEIP712 = await ethers.getContractFactory('BookadotEIP712')
    const bookadotEIP712 = await BookadotEIP712.deploy()
    await bookadotEIP712.deployed()

    console.log('bookadotEIP712.address', bookadotEIP712.address);
    appendAddress(
        network.name,
        bookadotEIP712.address,
        CONTRACT_KEYS.BOOKADOT_EIP712
    );

    const BookadotFactory = await ethers.getContractFactory('BookadotFactory', {
        libraries: {
            BookadotEIP712: bookadotEIP712.address
        }
    })
    const bookadotFactory = await BookadotFactory.deploy(
        bookadotConfigAddr,
        bookadotTicketFactoryAddr
    )
    await bookadotFactory.deployed()

    // The address the Contract WILL have once mined
    console.log('bookadotFactory.address', bookadotFactory.address)
    appendAddress(
        network.name,
        bookadotFactory.address,
        CONTRACT_KEYS.BOOKADOT_FACTORY
    );

    // The transaction that was sent to the network to deploy the Contract
    console.log(bookadotFactory.deployTransaction.hash)

    const BookadotTicketFactory = await ethers.getContractFactory("BookadotTicketFactory");
    const bookadotTicketFactory = BookadotTicketFactory.attach(
        bookadotTicketFactoryAddr
    );
    let setFactoryTx = await bookadotTicketFactory.setFactory(bookadotFactory.address);
    await setFactoryTx.wait(1);

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

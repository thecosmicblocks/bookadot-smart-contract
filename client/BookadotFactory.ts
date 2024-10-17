import { ethers, network } from 'hardhat'
import { CONTRACT_KEYS, getAddress, makeId } from './../scripts/helpers';
import { BookadotFactory } from '../build/types/BookadotFactory';

async function main() {
    //////////// CONTRACT INSTANCE ////////////
    const bookadotTicketFactoryAddr = getAddress(network.name, CONTRACT_KEYS.BOOKADOT_FACTORY);
    const BookadotFactory = await ethers.getContractFactory('BookadotFactory', {
        libraries: {
            BookadotEIP712: getAddress(network.name, CONTRACT_KEYS.BOOKADOT_EIP712)
        }
    })
    const bookadotFactory = BookadotFactory.attach(
        bookadotTicketFactoryAddr
    ) as BookadotFactory

    ////////////////////////
    ////////////////////////
    //////////// PARAM ////////////
    const ids = [makeId(5, 'number')]
    const deployer = (await ethers.getSigners())[0]
    const ticketData = generateTicketData(deployer.address, deployer.address)

    const tx = await
        bookadotFactory.deployProperty(
            ids,
            deployer.address,
            ticketData
        );
    await tx.wait(1);
    console.log('tx:', tx.hash);
}



function generateTicketData(owner: string, marketplace: string): string {
    const type = [
        'string', // _nftName
        'string', // _nftSymbol
        'string', // _baseUri
        'address', // _owner
        'address', // _transferable
        // 'address', // _operator
    ]

    const value = [
        "Bookadot Early Access",
        "BEA",
        "https://cdn.thecosmicblock.com/tickets/",
        owner,
        marketplace,
        // bookadotPropertyAddr,
    ]

    return ethers.utils.defaultAbiCoder.encode(
        type,
        value
    )
}

main()
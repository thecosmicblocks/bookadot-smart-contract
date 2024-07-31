import { BookadotTicketFactory } from './../build/types/BookadotTicketFactory';
import { expect, use } from 'chai'
import { ethers } from 'hardhat'
import { describe, it } from 'mocha'
import { solidity } from 'ethereum-waffle'
import { BigNumber, BytesLike, ContractReceipt } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Event } from "@ethersproject/contracts"

use(solidity)

let bookadotTicketFactory: BookadotTicketFactory
let factory: SignerWithAddress
const propertyId = BigNumber.from(1)
const ticketData = generateTicketData()

beforeEach(async function () {
    let signers = await ethers.getSigners()
    factory = signers[1]

    let BookadotTicketFactory = await ethers.getContractFactory('BookadotTicketFactory')
    bookadotTicketFactory = await BookadotTicketFactory.deploy() as BookadotTicketFactory
    await bookadotTicketFactory.deployed()
})

describe('BookadotTicketFactory', function () {
    describe('Verify deploying new ticket factory', function () {
        it('should deploy new ticket factory successfully', async function () {
            let setFactoryTx = await bookadotTicketFactory.setFactory(factory.address)
            await setFactoryTx.wait(1);

            let deployTicketTx = await bookadotTicketFactory
                .connect(factory)
                .deployTicket(propertyId, ticketData)
            let deployTicketTxResult = await deployTicketTx.wait()

            await verifyDeployTicketTransaction(deployTicketTxResult)
        })

        it('only owner or backend be able to deploy new property', async function () {
            let signers = await ethers.getSigners()
            let newSigner = signers[1]
            let newSignerBookadotFactory = bookadotTicketFactory.connect(newSigner)

            await expect(
                newSignerBookadotFactory
                    .deployTicket(propertyId, ticketData)
            ).to.be.revertedWith('TicketFactory: Not factory')
        })
    })
})

async function verifyDeployTicketTransaction(transaction: ContractReceipt) {
    let events = transaction.events;
    let createdTicketEvent: Event = events.find((e) => e.event === 'TicketCreated');

    /// verify the existence of CreatedTicket event
    expect(createdTicketEvent).to.be.not.undefined
    expect(createdTicketEvent).to.be.not.null

    /// verify data of CreatedTicket event        
    let createdTicketArgs = createdTicketEvent['args'];
    expect(createdTicketArgs['ticketAddress']).to.be.not.null
    expect(createdTicketEvent['topics'][1]).to.equal(propertyId)
}

function generateTicketData(): string {
    const type = [
        'string', // _nftName
        'string', // _nftSymbol
        'string', // _baseUri
        'address', // _owner
        'address', // _transferable
        'address', // _operator
    ]

    const value = [
        "Bookadot First Event",
        "BFE",
        "https://www.example.com/",
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        "0xDC6fe4265677AEF37f291FeFecf8e965D0AC45C5",
    ]

    return ethers.utils.defaultAbiCoder.encode(
        type,
        value
    )
}
